import { useState, useRef, useLayoutEffect } from 'react'
import { supabase } from '../services/supabase'
import CropModal from './CropModal'
import AudioTrimModal from './AudioTrimModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { AnswerOption } from '../types/game'
import { validateAnswers } from '../utils/quizValidation'

export type CardData = {
  id?: string
  deck_id: string
  image_url: string
  audio_url?: string
  label: string
  quiz_question: string
  quiz_options: [string, string, string, string]
  quiz_correct: string
  answers: AnswerOption[] | null
  display_count: number
  fun_fact: string
  sort_order: number
  created_at?: string
}

function padAnswers(base: AnswerOption[], minCount: number): AnswerOption[] {
  if (base.length >= minCount) return base
  return [...base, ...Array.from({ length: minCount - base.length }, () => ({ text: '', correct: false }))]
}

function trimEmptyAnswers(answers: AnswerOption[], maxCount: number): AnswerOption[] {
  const result = [...answers]
  while (result.length > maxCount && result[result.length - 1].text.trim() === '') {
    result.pop()
  }
  return result
}

function initAnswers(card?: CardData): AnswerOption[] {
  const count = card?.display_count ?? 4
  if (card?.answers && card.answers.length > 0) return padAnswers(card.answers, count)
  if (card?.quiz_options && card.quiz_correct) {
    const base = card.quiz_options.map(opt => ({ text: opt, correct: opt === card.quiz_correct }))
    return padAnswers(base, count)
  }
  return padAnswers([], count)
}

type Props = {
  deckId: string
  language: 'cs' | 'sk' | 'en'
  difficulty: 'easy' | 'medium' | 'hard'
  deckType?: 'image' | 'audio'
  card?: CardData
  sortOrder: number
  onSave: () => void
  onClose: () => void
}

export default function CardModal({ deckId, language, difficulty, deckType = 'image', card, sortOrder, onSave, onClose }: Props) {
  const [imageUrl, setImageUrl]         = useState(card?.image_url ?? '')
  const [imagePreview, setImagePreview] = useState(card?.image_url ?? '')
  const [cropSrc, setCropSrc]           = useState<string | null>(null)
  const [audioUrl, setAudioUrl]         = useState(card?.audio_url ?? '')
  const [audioFile, setAudioFile]       = useState<File | null>(null)
  const [audioTrimOpen, setAudioTrimOpen] = useState(false)
  const [label, setLabel]               = useState(card?.label ?? '')
  const [question, setQuestion]         = useState(card?.quiz_question ?? '')
  const [answers, setAnswers]           = useState<AnswerOption[]>(() => initAnswers(card))
  const [displayCount, setDisplayCount] = useState(card?.display_count ?? 4)
  const [funFact, setFunFact]           = useState(card?.fun_fact ?? '')
  const [uploading, setUploading]       = useState(false)
  const [saving, setSaving]             = useState(false)
  const [generating, setGenerating]     = useState(false)
  const [generatingAnswers, setGeneratingAnswers] = useState(false)
  const [error, setError]               = useState('')
  const [isDragging, setIsDragging]     = useState(false)
  const fileRef      = useRef<HTMLInputElement>(null)
  const audioFileRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    const preventScroll = (e: WheelEvent | TouchEvent) => {
      const dialog = document.querySelector('[data-slot="dialog-content"]')
      if (dialog?.contains(e.target as Node)) return
      e.preventDefault()
    }
    document.addEventListener('wheel', preventScroll, { passive: false })
    document.addEventListener('touchmove', preventScroll, { passive: false })

    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
      document.removeEventListener('wheel', preventScroll)
      document.removeEventListener('touchmove', preventScroll)
    }
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Obrázek je příliš velký. Maximální velikost je 2 MB.'); return }
    setError('')
    setCropSrc(URL.createObjectURL(file))
  }

  async function handleGenerate() {
    if (!label.trim()) { setError('Nejprve zadejte label/popis kartičky.'); return }
    setGenerating(true)
    setError('')
    try {
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`
      const resp = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ label: label.trim(), language, difficulty }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error ?? `HTTP ${resp.status}`)
      setQuestion(data.question)
      setAnswers(data.answers ?? [])
      setFunFact(data.fun_fact)
    } catch (e) {
      setError('Chyba při generování: ' + String(e))
    }
    setGenerating(false)
  }

  async function handleGenerateFromQuestion() {
    if (!question.trim()) { setError('Nejprve zadejte otázku.'); return }
    setGeneratingAnswers(true)
    setError('')
    try {
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`
      const resp = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ question: question.trim(), language, difficulty }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error ?? `HTTP ${resp.status}`)
      setAnswers(data.answers ?? [])
      setFunFact(data.fun_fact)
    } catch (e) {
      setError('Chyba při generování: ' + String(e))
    }
    setGeneratingAnswers(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Obrázek je příliš velký. Maximální velikost je 2 MB.'); return }
    setError('')
    setCropSrc(URL.createObjectURL(file))
    e.target.value = ''
  }

  async function handleCropped(blob: Blob) {
    setCropSrc(null)
    setImagePreview(URL.createObjectURL(blob))
    setUploading(true)
    setError('')
    const path = `${deckId}/${Date.now()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('card-images')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (uploadError) { setError('Chyba při nahrávání obrázku: ' + uploadError.message); setUploading(false); return }
    const { data } = supabase.storage.from('card-images').getPublicUrl(path)
    setImageUrl(data.publicUrl)
    setUploading(false)
  }

  async function handleAudioFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setAudioFile(file)
    setAudioTrimOpen(true)
    e.target.value = ''
  }

  async function handleAudioTrimmed(blob: Blob, _durationSec: number, mimeType: string) {
    setAudioTrimOpen(false)
    setAudioFile(null)
    setUploading(true)
    setError('')
    const ext = mimeType === 'audio/ogg' ? 'ogg' : 'wav'
    const path = `audio/${deckId}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('card-images')
      .upload(path, blob, { upsert: true, contentType: mimeType })
    if (uploadError) { setError('Chyba při nahrávání audia: ' + uploadError.message); setUploading(false); return }
    const { data } = supabase.storage.from('card-images').getPublicUrl(path)
    setAudioUrl(data.publicUrl)
    setUploading(false)
  }

  async function handleSave() {
    if (deckType === 'audio' && !audioUrl) { setError('Nahrajte prosím audio soubor.'); return }
    if (deckType === 'image' && !imageUrl) { setError('Nahrajte prosím obrázek.'); return }
    setSaving(true)
    setError('')
    const filledAnswers = answers.filter(a => a.text.trim())
    const correctAnswer = filledAnswers.find(a => a.correct)
    const payload = {
      deck_id:       deckId,
      image_url:     deckType === 'audio' ? '' : imageUrl,
      audio_url:     deckType === 'audio' ? audioUrl : null,
      label:         label || null,
      quiz_question: question || null,
      answers:       filledAnswers.length > 0 ? filledAnswers : null,
      display_count: displayCount,
      // backward-compat fields derived from new answers
      quiz_options:  filledAnswers.length >= 4 ? filledAnswers.slice(0, 4).map(a => a.text) as [string,string,string,string] : null,
      quiz_correct:  correctAnswer?.text ?? null,
      fun_fact:      funFact || null,
      sort_order:    sortOrder,
    }
    const { error: saveError } = card?.id
      ? await supabase.from('custom_cards').update(payload).eq('id', card.id)
      : await supabase.from('custom_cards').insert(payload)
    if (saveError) { setError('Chyba při ukládání: ' + saveError.message) } else { onSave() }
    setSaving(false)
  }

  return (
    <>
      <Dialog open modal={false} onOpenChange={open => { if (!open) onClose() }}>
        <DialogContent className="max-w-lg p-0" onInteractOutside={e => e.preventDefault()}>
          <div className="max-h-[90vh] overflow-y-auto overscroll-contain p-6" style={{ overscrollBehavior: 'contain' }}>
          <DialogHeader>
            <DialogTitle>{card ? 'Upravit kartičku' : 'Nová kartička'}</DialogTitle>
          </DialogHeader>

          {/* Image upload (image decks only) */}
          {deckType === 'image' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Obrázek *</label>
            <div
              className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden ${isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
              style={{ minHeight: 140 }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="" className="w-full h-40 object-contain p-2" />
              ) : (
                <div className="text-center py-8 px-4">
                  <div className="text-3xl mb-2">🖼️</div>
                  <div className="text-sm text-gray-400">Přetáhněte obrázek nebo klikněte</div>
                  <div className="text-xs text-gray-300 mt-1">PNG, JPG, SVG, WebP · max 2 MB</div>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            {uploading && <div className="text-xs text-indigo-500 mt-1">Nahrávání…</div>}
            {imagePreview && !uploading && (
              <button onClick={() => fileRef.current?.click()} className="text-xs text-indigo-500 hover:underline mt-1">
                Změnit obrázek
              </button>
            )}
          </div>
          )}

          {/* Audio upload (audio decks only) */}
          {deckType === 'audio' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Audio soubor *</label>
            <div
              className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors"
              style={{ minHeight: 100 }}
              onClick={() => audioFileRef.current?.click()}
            >
              {audioUrl ? (
                <div className="text-center py-4 px-4">
                  <div className="text-3xl mb-1">🎵</div>
                  <audio controls src={audioUrl} className="mt-1 max-w-full" onClick={e => e.stopPropagation()} />
                </div>
              ) : (
                <div className="text-center py-6 px-4">
                  <div className="text-3xl mb-2">🎵</div>
                  <div className="text-sm text-gray-400">Klikněte pro nahrání audia</div>
                  <div className="text-xs text-gray-300 mt-1">MP3, WAV, OGG, M4A</div>
                </div>
              )}
            </div>
            <input
              ref={audioFileRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleAudioFileChange}
            />
            {uploading && <div className="text-xs text-indigo-500 mt-1">Nahrávání…</div>}
            {audioUrl && !uploading && (
              <button onClick={() => audioFileRef.current?.click()} className="text-xs text-indigo-500 hover:underline mt-1">
                Změnit audio
              </button>
            )}
          </div>
          )}

          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Popis / label <span className="text-gray-300">(volitelné)</span></label>
            <Input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="např. Jelen lesní"
            />
          </div>

          {/* Quiz section */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kvíz <span className="font-normal normal-case text-gray-300">(volitelné)</span></div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={generating || !label.trim()}
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                {generating ? '⏳ Generuji…' : '✨ Generovat AI'}
              </Button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Otázka</label>
              <div className="flex gap-2">
                <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="např. Jak se jmenuje toto zvíře?" className="flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateFromQuestion}
                  disabled={generatingAnswers || !question.trim()}
                  className="shrink-0 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  title="Generovat odpovědi z otázky"
                >
                  {generatingAnswers ? '⏳' : '✨'}
                </Button>
              </div>
            </div>

            {/* Display count selector */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Zobrazit možností</label>
              <div className="flex gap-1.5">
                {[2, 3, 4, 5, 6, 7, 8].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setDisplayCount(n)
                      setAnswers(prev => padAnswers(trimEmptyAnswers(prev, n), n))
                    }}
                    className={`w-9 h-9 rounded-lg text-sm font-medium border transition-colors ${displayCount === n ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Answer pool */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Pool odpovědí <span className="text-gray-400 font-normal">— zaškrtněte správnou</span>
              </label>
              <div className="space-y-1.5">
                {answers.map((ans, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={ans.correct}
                      onChange={e => {
                        const next = [...answers]
                        next[i] = { ...ans, correct: e.target.checked }
                        setAnswers(next)
                      }}
                      className="accent-indigo-600 shrink-0 w-4 h-4"
                      title={ans.correct ? 'Správná odpověď' : 'Nesprávná odpověď'}
                    />
                    <Input
                      value={ans.text}
                      onChange={e => {
                        const next = [...answers]
                        next[i] = { ...ans, text: e.target.value }
                        setAnswers(next)
                      }}
                      placeholder={`Možnost ${i + 1}`}
                      className="flex-1 min-w-0 h-8 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setAnswers(answers.filter((_, j) => j !== i))}
                      className="text-gray-300 hover:text-red-400 shrink-0 w-6 text-center transition-colors"
                      title="Odstranit"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setAnswers([...answers, { text: '', correct: false }])}
                className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 font-medium"
              >
                + Přidat odpověď
              </button>
            </div>

            {/* Validation badge */}
            {answers.length > 0 && (() => {
              const v = validateAnswers(answers.filter(a => a.text.trim()), displayCount)
              const styles = {
                valid:      'bg-green-50 text-green-700 border-green-200',
                incomplete: 'bg-amber-50 text-amber-700 border-amber-200',
                'pool-error': 'bg-red-50 text-red-700 border-red-200',
              }
              const icons = { valid: '✅', incomplete: '⚠️', 'pool-error': '🔴' }
              return (
                <div className={`text-xs px-3 py-1.5 rounded-lg border ${styles[v.state]}`}>
                  {icons[v.state]} {v.message}
                </div>
              )
            })()}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Zajímavost</label>
              <Textarea
                value={funFact}
                onChange={e => setFunFact(e.target.value)}
                placeholder="např. Jelen může vážit až 200 kg…"
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={onClose}>Zrušit</Button>
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving ? 'Ukládání…' : 'Uložit'}
            </Button>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      {cropSrc && (
        <CropModal
          imageSrc={cropSrc}
          onCrop={handleCropped}
          onClose={() => setCropSrc(null)}
        />
      )}

      {audioTrimOpen && audioFile && (
        <AudioTrimModal
          file={audioFile}
          onConfirm={handleAudioTrimmed}
          onClose={() => { setAudioTrimOpen(false); setAudioFile(null) }}
        />
      )}
    </>
  )
}
