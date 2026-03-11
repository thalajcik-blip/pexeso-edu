import { useState, useRef, useLayoutEffect } from 'react'
import { supabase } from '../services/supabase'
import CropModal from './CropModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export type CardData = {
  id?: string
  deck_id: string
  image_url: string
  label: string
  quiz_question: string
  quiz_options: [string, string, string, string]
  quiz_correct: string
  fun_fact: string
  sort_order: number
  created_at?: string
}

type Props = {
  deckId: string
  language: 'cs' | 'sk' | 'en'
  difficulty: 'easy' | 'medium' | 'hard'
  card?: CardData
  sortOrder: number
  onSave: () => void
  onClose: () => void
}

export default function CardModal({ deckId, language, difficulty, card, sortOrder, onSave, onClose }: Props) {
  const [imageUrl, setImageUrl]         = useState(card?.image_url ?? '')
  const [imagePreview, setImagePreview] = useState(card?.image_url ?? '')
  const [cropSrc, setCropSrc]           = useState<string | null>(null)
  const [label, setLabel]               = useState(card?.label ?? '')
  const [question, setQuestion]         = useState(card?.quiz_question ?? '')
  const [options, setOptions]           = useState<[string,string,string,string]>(
    card?.quiz_options ?? ['', '', '', '']
  )
  const [correct, setCorrect]           = useState(card?.quiz_correct ?? '')
  const [funFact, setFunFact]           = useState(card?.fun_fact ?? '')
  const [uploading, setUploading]       = useState(false)
  const [saving, setSaving]             = useState(false)
  const [generating, setGenerating]     = useState(false)
  const [error, setError]               = useState('')
  const [isDragging, setIsDragging]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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
      setOptions(data.options)
      setCorrect(data.correct)
      setFunFact(data.fun_fact)
    } catch (e) {
      setError('Chyba při generování: ' + String(e))
    }
    setGenerating(false)
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

  async function handleSave() {
    if (!imageUrl) { setError('Nahrajte prosím obrázek.'); return }
    setSaving(true)
    setError('')
    const payload = {
      deck_id:       deckId,
      image_url:     imageUrl,
      label:         label || null,
      quiz_question: question || null,
      quiz_options:  options.some(o => o) ? options : null,
      quiz_correct:  correct || null,
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
      <Dialog open onOpenChange={open => { if (!open) onClose() }}>
        <DialogContent className="max-w-lg p-0">
          <div className="max-h-[90vh] overflow-y-auto overscroll-contain p-6" style={{ overscrollBehavior: 'contain' }}>
          <DialogHeader>
            <DialogTitle>{card ? 'Upravit kartičku' : 'Nová kartička'}</DialogTitle>
          </DialogHeader>

          {/* Image upload */}
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
              <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="např. Jak se jmenuje toto zvíře?" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['A', 'B', 'C', 'D'] as const).map((letter, i) => (
                <div key={letter} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={correct === options[i] && options[i] !== ''}
                    onChange={() => setCorrect(options[i])}
                    className="accent-indigo-600 shrink-0"
                  />
                  <Input
                    value={options[i]}
                    onChange={e => {
                      const next = [...options] as [string,string,string,string]
                      next[i] = e.target.value
                      setOptions(next)
                      if (correct === options[i]) setCorrect(e.target.value)
                    }}
                    placeholder={`Možnost ${letter}`}
                    className="flex-1 min-w-0"
                  />
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-400">Označte radio button u správné odpovědi.</div>

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
    </>
  )
}
