import { useState, useRef } from 'react'
import { supabase } from '../services/supabase'
import CropModal from './CropModal'

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
}

type Props = {
  deckId: string
  card?: CardData
  sortOrder: number
  onSave: () => void
  onClose: () => void
}

export default function CardModal({ deckId, card, sortOrder, onSave, onClose }: Props) {
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
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleGenerate() {
    if (!label.trim()) { setError('Nejprve zadejte label/popis kartičky.'); return }
    setGenerating(true)
    setError('')
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`
      const resp = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ label: label.trim() }),
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

    if (file.size > 2 * 1024 * 1024) {
      setError('Obrázek je příliš velký. Maximální velikost je 2 MB.')
      return
    }

    setError('')
    // Open crop modal with the raw file
    const objectUrl = URL.createObjectURL(file)
    setCropSrc(objectUrl)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  async function handleCropped(blob: Blob) {
    setCropSrc(null)

    // Show preview immediately
    const preview = URL.createObjectURL(blob)
    setImagePreview(preview)

    setUploading(true)
    setError('')
    const path = `${deckId}/${Date.now()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('card-images')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })

    if (uploadError) {
      setError('Chyba při nahrávání obrázku: ' + uploadError.message)
      setUploading(false)
      return
    }

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

    if (saveError) {
      setError('Chyba při ukládání: ' + saveError.message)
    } else {
      onSave()
    }
    setSaving(false)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800 text-lg">{card ? 'Upravit kartičku' : 'Nová kartička'}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            {/* Image upload */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-600 mb-2">Obrázek *</label>
              <div
                className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-300 transition-colors overflow-hidden"
                style={{ minHeight: 140 }}
                onClick={() => fileRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="" className="w-full h-40 object-contain p-2" />
                ) : (
                  <div className="text-center py-8 px-4">
                    <div className="text-3xl mb-2">🖼️</div>
                    <div className="text-sm text-gray-400">Klikněte pro nahrání obrázku</div>
                    <div className="text-xs text-gray-300 mt-1">PNG, JPG, SVG, WebP · max 2 MB</div>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {uploading && <div className="text-xs text-indigo-500 mt-1">Nahrávání…</div>}
              {imagePreview && !uploading && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-xs text-indigo-500 hover:underline mt-1"
                >
                  Změnit obrázek
                </button>
              )}
            </div>

            {/* Label */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-600 mb-1">Popis / label <span className="text-gray-300">(volitelné)</span></label>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="např. Jelen lesní"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Quiz section */}
            <div className="border border-gray-100 rounded-xl p-4 mb-5 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kvíz <span className="font-normal normal-case text-gray-300">(volitelné)</span></div>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || !label.trim()}
                  className="text-xs px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 font-medium hover:bg-indigo-100 disabled:opacity-40 transition-colors"
                >
                  {generating ? '⏳ Generuji…' : '✨ Generovat AI'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Otázka</label>
                <input
                  type="text"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="např. Jak se jmenuje toto zvíře?"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
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
                    <input
                      type="text"
                      value={options[i]}
                      onChange={e => {
                        const next = [...options] as [string,string,string,string]
                        next[i] = e.target.value
                        setOptions(next)
                        if (correct === options[i]) setCorrect(e.target.value)
                      }}
                      placeholder={`Možnost ${letter}`}
                      className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 min-w-0"
                    />
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-400">Označte radio button u správné odpovědi.</div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Zajímavost</label>
                <textarea
                  value={funFact}
                  onChange={e => setFunFact(e.target.value)}
                  placeholder="např. Jelen může vážit až 200 kg…"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</div>
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Zrušit</button>
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Ukládání…' : 'Uložit'}
              </button>
            </div>
          </div>
        </div>
      </div>

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
