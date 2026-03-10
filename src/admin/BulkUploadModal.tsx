import { useState, useRef } from 'react'
import { supabase } from '../services/supabase'
import CropModal from './CropModal'

type PendingCard = {
  file: File
  previewUrl: string      // object URL pred uploadom
  croppedBlob: Blob | null
  croppedPreview: string | null
  label: string
  question: string
  options: [string, string, string, string]
  correct: string
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

export default function BulkUploadModal({ deckId, language, difficulty, startIndex, onDone, onClose }: Props) {
  const [cards, setCards]       = useState<PendingCard[]>([])
  const [cropIndex, setCropIndex] = useState<number | null>(null)
  const [savingAll, setSavingAll] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function update(index: number, patch: Partial<PendingCard>) {
    setCards(prev => prev.map((c, i) => i === index ? { ...c, ...patch } : c))
  }

  function addFiles(files: File[]) {
    const valid = files.filter(f => f.size <= 2 * 1024 * 1024)
    if (!valid.length) return
    const newCards: PendingCard[] = valid.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      croppedBlob: null,
      croppedPreview: null,
      label: '',
      question: '',
      options: ['', '', '', ''],
      correct: '',
      fun_fact: '',
      generating: false,
      uploading: false,
      saved: false,
      error: '',
    }))
    setCards(prev => {
      const next = [...prev, ...newCards]
      const firstUncropped = next.findIndex(c => !c.croppedBlob)
      if (firstUncropped !== -1) setCropIndex(firstUncropped)
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
    addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')))
  }

  function handleCropped(blob: Blob) {
    if (cropIndex === null) return
    const preview = URL.createObjectURL(blob)
    update(cropIndex, { croppedBlob: blob, croppedPreview: preview })

    // Auto-advance to next uncropped
    const nextUncropped = cards.findIndex((c, i) => i > cropIndex && !c.croppedBlob)
    setCropIndex(nextUncropped === -1 ? null : nextUncropped)
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
        options: data.options,
        correct: data.correct,
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
    if (!card.croppedBlob) { update(index, { error: 'Chybí ořez obrázku.' }); return false }
    update(index, { uploading: true, error: '' })

    const path = `${deckId}/${Date.now()}-${index}.jpg`
    const { error: upErr } = await supabase.storage
      .from('card-images')
      .upload(path, card.croppedBlob, { upsert: true, contentType: 'image/jpeg' })

    if (upErr) { update(index, { uploading: false, error: upErr.message }); return false }

    const { data } = supabase.storage.from('card-images').getPublicUrl(path)

    const { error: insErr } = await supabase.from('custom_cards').insert({
      deck_id:       deckId,
      image_url:     data.publicUrl,
      label:         card.label || null,
      quiz_question: card.question || null,
      quiz_options:  card.options.some(o => o) ? card.options : null,
      quiz_correct:  card.correct || null,
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

  const allCropped = cards.length > 0 && cards.every(c => c.croppedBlob)
  const anyLabel   = cards.some(c => c.label.trim())

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="font-bold text-gray-800">Hromadné přidání kartiček</div>
          <div className="flex items-center gap-3">
            {anyLabel && allCropped && (
              <button
                onClick={generateAll}
                className="text-sm px-4 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 font-medium hover:bg-indigo-100 transition-colors"
              >
                ✨ Generovat AI pro všechny
              </button>
            )}
            {cards.length > 0 && (
              <button
                onClick={saveAll}
                disabled={savingAll || !allCropped}
                className="text-sm px-5 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {savingAll ? 'Ukládání…' : `Uložit vše (${cards.filter(c => !c.saved).length})`}
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
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
            <div className="text-3xl mb-2">{isDragging ? '📂' : '📁'}</div>
            <div className="text-sm font-medium text-gray-600">{isDragging ? 'Pusťte obrázky' : 'Přetáhněte obrázky nebo klikněte'}</div>
            <div className="text-xs text-gray-400 mt-1">PNG, JPG, WebP · max 2 MB · více souborů najednou</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />

          {/* Uncropped warning */}
          {cards.some(c => !c.croppedBlob) && (
            <div className="mb-4 text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-2 flex items-center justify-between">
              <span>⚠️ Některé obrázky ještě nejsou oříznuty.</span>
              <button
                onClick={() => setCropIndex(cards.findIndex(c => !c.croppedBlob))}
                className="text-xs font-semibold text-amber-700 underline"
              >
                Oříznout
              </button>
            </div>
          )}

          {/* Cards grid */}
          {cards.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {cards.map((card, i) => (
                <div key={i} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${card.saved ? 'border-green-200' : 'border-gray-100'}`}>
                  {/* Image */}
                  <div className="aspect-square bg-gray-50 relative overflow-hidden">
                    <img
                      src={card.croppedPreview ?? card.previewUrl}
                      alt=""
                      className={`w-full h-full object-contain p-1 ${!card.croppedBlob ? 'opacity-40' : ''}`}
                    />
                    {!card.croppedBlob && (
                      <button
                        onClick={() => setCropIndex(i)}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-xs font-semibold"
                      >
                        ✂️ Oříznout
                      </button>
                    )}
                    {card.croppedBlob && (
                      <button
                        onClick={() => setCropIndex(i)}
                        className="absolute top-1 right-1 text-xs bg-white/80 rounded px-1.5 py-0.5 text-gray-500 hover:bg-white"
                      >
                        ✂️
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
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={card.label}
                        onChange={e => update(i, { label: e.target.value })}
                        placeholder="Label…"
                        disabled={card.saved}
                        className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs outline-none focus:border-indigo-400 min-w-0"
                      />
                      <button
                        onClick={() => generate(i)}
                        disabled={card.generating || !card.label.trim() || card.saved}
                        title="Generovat kvíz pomocí AI"
                        className="shrink-0 px-2 py-1 rounded bg-indigo-50 text-indigo-600 text-xs hover:bg-indigo-100 disabled:opacity-40 transition-colors"
                      >
                        {card.generating ? '⏳' : '✨'}
                      </button>
                    </div>

                    {card.question && (
                      <div className="text-xs text-gray-400 truncate">🧠 {card.question}</div>
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

      {/* Crop modal */}
      {cropIndex !== null && cards[cropIndex] && (
        <CropModal
          key={cropIndex}
          imageSrc={cards[cropIndex].previewUrl}
          onCrop={handleCropped}
          onClose={() => setCropIndex(null)}
        />
      )}
    </>
  )
}
