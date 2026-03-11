import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Button } from '@/components/ui/button'

type AiProviderSettings = {
  primary: 'claude' | 'gemini'
  fallback: boolean
}

const PROVIDER_LABELS = {
  claude: 'Claude Haiku (Anthropic)',
  gemini: 'Gemini 2.0 Flash (Google)',
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<AiProviderSettings>({ primary: 'claude', fallback: true })
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'ai_provider')
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else if (data) setSettings(data.value as AiProviderSettings)
        setLoading(false)
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    const { error } = await supabase
      .from('admin_settings')
      .upsert({ key: 'ai_provider', value: settings, updated_at: new Date().toISOString() })
    if (error) setError(error.message)
    else setSaved(true)
    setSaving(false)
  }

  const fallbackProvider = settings.primary === 'claude' ? 'gemini' : 'claude'

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Nastavení</h1>

      {loading ? (
        <div className="text-sm text-gray-400">Načítání…</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-1">Generování kvízů — AI provider</div>
            <div className="text-xs text-gray-400 mb-4">Který model se použije pro automatické generování kvízových otázek.</div>

            {/* Primary provider */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-2">Primární model</label>
              <div className="flex flex-col gap-2">
                {(['claude', 'gemini'] as const).map(p => (
                  <label key={p} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                    settings.primary === p
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="primary"
                      value={p}
                      checked={settings.primary === p}
                      onChange={() => setSettings(s => ({ ...s, primary: p }))}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700">{PROVIDER_LABELS[p]}</span>
                    {settings.primary === p && (
                      <span className="ml-auto text-xs text-indigo-600 font-medium">Primární</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Fallback toggle */}
            <label className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors">
              <div>
                <div className="text-sm text-gray-700">Fallback na {PROVIDER_LABELS[fallbackProvider]}</div>
                <div className="text-xs text-gray-400 mt-0.5">Použije se automaticky pokud primární model selže</div>
              </div>
              <div
                onClick={() => setSettings(s => ({ ...s, fallback: !s.fallback }))}
                className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${settings.fallback ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings.fallback ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
            </label>
          </div>

          {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
          {saved && <div className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">Nastavení uloženo.</div>}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Ukládání…' : 'Uložit nastavení'}
          </Button>
        </div>
      )}
    </div>
  )
}
