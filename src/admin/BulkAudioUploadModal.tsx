import { useState, useRef } from 'react'
import { supabase } from '../services/supabase'
import AudioTrimModal from './AudioTrimModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AnswerOption } from '../types/game'

type PendingAudioCard = {
  file: File
  trimmedBlob: Blob | null
  trimmedMimeType: string
  trimmedUrl: string | null
  durationSec: number
  label: string
  question: string
  answers: AnswerOption[]
  fun_fact: string
  generating: boolean
  uploading: boolean
  saved: boolean
  error: string
}

type Props = {
  deckId: string
  language: 'cs' | 'sk' | 'en'
  difficulty: 'easy' | 'medium' | 'hard'
  startIndex: number
  onDone: () => void
  onClose: () => void
}

export default function BulkAudioUploadModal({ deckId, language, difficulty, startIndex, onDone, onClose }: Props) {
  const [cards, setCards]         = useState<PendingAudioCard[]>([])
  const [trimIndex, setTrimIndex] = useState<number | null>(null)
  const [savingAll, setSavingAll] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function update(index: number, patch: Partial<PendingAudioCard>) {
    setCards(prev => prev.map((c, i) => i === index ? { ...c, ...patch } : c))
  }

  function addFiles(files: File[]) {
    const valid = files.filter(f => f.type.startsWith('audio/'))
    if (!valid.length) return
    const newCards: PendingAudioCard[] = valid.map(file => ({
      file,
      trimmedBlob: null,
      trimmedMimeType: '',
      trimmedUrl: null,
      durationSec: 0,
      label: file.name.replace(/\.[^.]+$/, ''),
      question: '',
      answers: [],
      fun_fact: '',
      generating: false,
      uploading: false,
      saved: false,
      error: '',
    }))
    setCards(prev => {
      const next = [...prev, ...newCards]
      const firstUntrimmed = next.findIndex(c => !c.trimmedBlob)
      if (firstUntrimmed !== -1) setTrimIndex(firstUntrimmed)
      return next
    })
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/')))
  }

  function handleTrimmed(blob: Blob, durationSec: number, mimeType: string) {
    if (trimIndex === null) return
    const url = URL.createObjectURL(blob)
    update(trimIndex, { trimmedBlob: blob, trimmedMimeType: mimeType, trimmedUrl: url, durationSec })

    // Auto-advance to next untrimmed
    setCards(prev => {
      const nextUntrimmed = prev.findIndex((c, i) => i > trimIndex! && !c.trimmedBlob)
      setTrimIndex(nextUntrimmed === -1 ? null : nextUntrimmed)
      return prev
    })
  }

  async function generate(index: number) {
    const card = cards[index]
    if (!card.label.trim()) return
    update(index, { generating: true, error: '' })
    try {
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`
      const resp = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ label: card.label.trim(), language, difficulty }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error ?? `HTTP ${resp.status}`)
      update(index, {
        question: data.question,
        answers: data.answers ?? [],
        fun_fact: data.fun_fact,
        generating: false,
      })
    } catch (e) {
      update(index, { generating: false, error: String(e) })
    }
  }

  async function generateAll() {
    const indices = cards.map((_, i) => i).filter(i => cards[i].label.trim() && !cards[i].question)
    await Promise.all(indices.map(generate))
  }

  async function uploadCard(index: number): Promise<boolean> {
    const card = cards[index]
    if (!card.trimmedBlob) { update(index, { error: 'Audio není oříznuto.' }); return false }
    update(index, { uploading: true, error: '' })

    const ext = card.trimmedMimeType === 'audio/ogg' ? 'ogg' : 'wav'
    const path = `audio/${deckId}/${Date.now()}-${index}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('card-images')
      .upload(path, card.trimmedBlob, { upsert: true, contentType: card.trimmedMimeType })

    if (upErr) { update(index, { uploading: false, error: upErr.message }); return false }

    const { data } = supabase.storage.from('card-images').getPublicUrl(path)

    const filledAnswers = card.answers.filter(a => a.text.trim())
    const correctAnswer = filledAnswers.find(a => a.correct)
    const { error: insErr } = await supabase.from('custom_cards').insert({
      deck_id:       deckId,
      image_url:     '',
      audio_url:     data.publicUrl,
      label:         card.label || null,
      quiz_question: card.question || null,
      answers:       filledAnswers.length > 0 ? filledAnswers : null,
      display_count: 4,
      quiz_options:  filledAnswers.length >= 4 ? filledAnswers.slice(0, 4).map(a => a.text) as [string, string, string, string] : null,
      quiz_correct:  correctAnswer?.text ?? null,
      fun_fact:      card.fun_fact || null,
      sort_order:    startIndex + index,
    })

    if (insErr) { update(index, { uploading: false, error: insErr.message }); return false }
    update(index, { uploading: false, saved: true })
    return true
  }

  async function saveAll() {
    setSavingAll(true)
    const unsaved = cards.map((_, i) => i).filter(i => !cards[i].saved)
    await Promise.all(unsaved.map(uploadCard))
    setSavingAll(false)
    onDone()
  }

  const allTrimmed = cards.length > 0 && cards.every(c => c.trimmedBlob)
  const anyLabel   = cards.some(c => c.label.trim())

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="font-bold text-gray-800">Hromadné přidání audio kartiček</div>
          <div className="flex items-center gap-3">
            {anyLabel && allTrimmed && (
              <Button variant="outline" size="sm" onClick={generateAll} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                ✨ Generovat AI pro všechny
              </Button>
            )}
            {cards.length > 0 && (
              <Button size="sm" onClick={saveAll} disabled={savingAll || !allTrimmed}>
                {savingAll ? 'Ukládání…' : `Uložit vše (${cards.filter(c => !c.saved).length})`}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600">×</Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors py-10 mb-6 ${isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
            onDrop={handleDrop}
          >
            <div className="text-3xl mb-2">{isDragging ? '📂' : '🎵'}</div>
            <div className="text-sm font-medium text-gray-600">{isDragging ? 'Pusťte audio soubory' : 'Přetáhněte audio nebo klikněte'}</div>
            <div className="text-xs text-gray-400 mt-1">MP3, WAV, OGG, M4A · více souborů najednou</div>
          </div>
          <input ref={fileRef} type="file" accept="audio/*" multiple className="hidden" onChange={handleFiles} />

          {/* Untrimmed warning */}
          {cards.some(c => !c.trimmedBlob) && cards.length > 0 && (
            <div className="mb-4 text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-2 flex items-center justify-between">
              <span>⚠️ Některé soubory ještě nejsou oříznuty.</span>
              <Button variant="link" size="sm" onClick={() => setTrimIndex(cards.findIndex(c => !c.trimmedBlob))} className="text-amber-700 h-auto p-0 text-xs font-semibold">
                Oříznout
              </Button>
            </div>
          )}

          {/* Cards grid */}
          {cards.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {cards.map((card, i) => (
                <div key={i} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${card.saved ? 'border-green-200' : 'border-gray-100'}`}>
                  {/* Audio preview */}
                  <div className="bg-gray-50 relative flex flex-col items-center justify-center py-4 px-3 gap-2" style={{ minHeight: 100 }}>
                    {card.trimmedBlob ? (
                      <>
                        <audio controls src={card.trimmedUrl ?? undefined} className="w-full max-w-full" style={{ height: 32 }} />
                        <div className="text-xs text-gray-400 tabular-nums">
                          {Math.floor(card.durationSec / 60)}:{String(Math.floor(card.durationSec % 60)).padStart(2, '0')}
                        </div>
                        <button
                          onClick={() => setTrimIndex(i)}
                          className="text-xs bg-white/80 rounded px-1.5 py-0.5 text-gray-500 hover:bg-white border border-gray-200"
                        >
                          ✂️ Upravit
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setTrimIndex(i)}
                        className="flex flex-col items-center gap-1 text-indigo-600 hover:text-indigo-800"
                      >
                        <span className="text-3xl">🎵</span>
                        <span className="text-xs font-semibold">✂️ Oříznout</span>
                      </button>
                    )}
                    {card.saved && (
                      <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
                        <span className="text-2xl">✓</span>
                      </div>
                    )}
                  </div>

                  {/* Fields */}
                  <div className="p-2 space-y-1.5">
                    <div className="text-[10px] text-gray-400 truncate" title={card.file.name}>{card.file.name}</div>
                    <div className="flex gap-1">
                      <Input
                        value={card.label}
                        onChange={e => update(i, { label: e.target.value })}
                        placeholder="Label…"
                        disabled={card.saved}
                        className="flex-1 h-7 text-xs min-w-0"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => generate(i)}
                        disabled={card.generating || !card.label.trim() || card.saved}
                        title="Generovat kvíz pomocí AI"
                        className="shrink-0 h-7 w-7 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      >
                        {card.generating ? '⏳' : '✨'}
                      </Button>
                    </div>

                    {card.question && (
                      <div className="text-xs text-gray-400 truncate">
                        🧠 {card.question}
                        {card.answers.length > 0 && (
                          <span className="ml-1 text-green-500">· {card.answers.length} odp.</span>
                        )}
                      </div>
                    )}
                    {card.error && (
                      <div className="text-xs text-red-500">{card.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trim modal */}
      {trimIndex !== null && cards[trimIndex] && (
        <AudioTrimModal
          key={trimIndex}
          file={cards[trimIndex].file}
          onConfirm={handleTrimmed}
          onClose={() => setTrimIndex(null)}
        />
      )}
    </>
  )
}
