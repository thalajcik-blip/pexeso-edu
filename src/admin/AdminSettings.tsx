import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AiProviderSettings = {
  primary: 'claude' | 'gemini'
  fallback: boolean
}

type TierConfig = { icon: string; title: string; messages: [string, string, string] }

const TIER_LABELS = ['100 %', '≥ 90 %', '≥ 75 %', '≥ 50 %', '≥ 25 %', '< 25 %']
const LANG_TABS: Array<{ code: 'cs' | 'sk' | 'en'; label: string }> = [
  { code: 'cs', label: '🇨🇿 CS' },
  { code: 'sk', label: '🇸🇰 SK' },
  { code: 'en', label: '🇬🇧 EN' },
]

const DEFAULT_GLOBAL: Record<'cs' | 'sk' | 'en', TierConfig[]> = {
  cs: [
    { icon: '🧠', title: 'Génius!',          messages: ['Perfektní paměť i znalosti — to je kombinace!', 'Na 100 % správně! Mozek pracuje naplno.', 'Bezchybný výkon. Tebe se nic nevyhne!'] },
    { icon: '🔥', title: 'Výborně!',          messages: ['Skoro dokonalý! Jen kousek od maxima.', 'Skvělá paměť i znalosti — gratulujeme!', 'Téměř perfektní. Příště to dotáhneš!'] },
    { icon: '⭐', title: 'Skvělé!',           messages: ['Dobrá práce! Mozek se zahřívá.', 'Tři čtvrtiny na výbornou — příště víc!', 'Solid výkon, paměť i kvíz šly dobře.'] },
    { icon: '💪', title: 'Dobrý pokus!',      messages: ['Půlka tam — procvič a příště to zlomíš!', 'Rozehřívačka se povedla, příště víc!', 'Mozek se zahřívá. Zkus to znovu!'] },
    { icon: '📚', title: 'Nevzdávej to!',     messages: ['Tohle téma chce trochu procvičit — dáš to!', 'Každý pokus tě posouvá blíž k cíli.', 'Zkus to znovu, mozek potřebuje čas!'] },
    { icon: '🚀', title: 'Výzva přijata!',    messages: ['Každý šampion začínal od nuly. Zkus to znovu!', 'Mozek se právě něco naučil. To se počítá!', 'Tuhle sadu ještě dobydneš, jen tak nevzdávej!'] },
  ],
  sk: [
    { icon: '🧠', title: 'Génius!',           messages: ['Perfektná pamäť aj znalosti — to je kombinácia!', 'Na 100 % správne! Mozog pracuje naplno.', 'Bezchybný výkon. Teba sa nič nevyhne!'] },
    { icon: '🔥', title: 'Výborne!',           messages: ['Skoro dokonalý! Len kúsok od maxima.', 'Skvelá pamäť aj znalosti — gratulujeme!', 'Takmer perfektný. Nabudúce to dotiahneš!'] },
    { icon: '⭐', title: 'Skvelé!',            messages: ['Dobrá práca! Mozog sa zahrieva.', 'Tri štvrtiny na výbornú — nabudúce viac!', 'Solid výkon, pamäť aj kvíz išli dobre.'] },
    { icon: '💪', title: 'Dobrý pokus!',       messages: ['Polovica tam — precvič a nabudúce to zlomíš!', 'Rozcvička sa podarila, nabudúce viac!', 'Mozog sa zahrieva. Skús to znovu!'] },
    { icon: '📚', title: 'Nevzdávaj to!',      messages: ['Táto téma chce trochu precvičiť — dáš to!', 'Každý pokus ťa posúva bližšie k cieľu.', 'Skús to znovu, mozog potrebuje čas!'] },
    { icon: '🚀', title: 'Výzva prijatá!',     messages: ['Každý šampión začínal od nuly. Skús to znovu!', 'Mozog sa práve niečo naučil. To sa počíta!', 'Túto sadu ešte dobydieš, tak nevzdávaj!'] },
  ],
  en: [
    { icon: '🧠', title: 'Genius!',            messages: ['Perfect memory and knowledge — what a combo!', '100% correct! Brain firing on all cylinders.', 'Flawless performance. Nothing gets past you!'] },
    { icon: '🔥', title: 'Excellent!',          messages: ['Almost perfect! Just a step from the top.', 'Great memory and knowledge — well done!', "Nearly perfect. You'll get there next time!"] },
    { icon: '⭐', title: 'Great!',              messages: ['Good work! Brain warming up.', 'Three quarters excellent — more next time!', 'Solid performance, memory and quiz both good.'] },
    { icon: '💪', title: 'Good try!',           messages: ["Halfway there — practice and break through next time!", 'Good warm-up, go for more next time!', 'Brain warming up. Try again!'] },
    { icon: '📚', title: "Don't give up!",      messages: ['This topic needs a bit more practice — you got this!', 'Every attempt gets you closer to the goal.', 'Try again, the brain needs time!'] },
    { icon: '🚀', title: 'Challenge accepted!', messages: ['Every champion started from zero. Try again!', 'Your brain just learned something. That counts!', "You'll conquer this deck yet — don't give up!"] },
  ],
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

  const [globalTiers, setGlobalTiers] = useState<Record<'cs' | 'sk' | 'en', TierConfig[]>>(DEFAULT_GLOBAL)
  const [tierLang, setTierLang] = useState<'cs' | 'sk' | 'en'>('cs')
  const [savingTiers, setSavingTiers] = useState(false)
  const [savedTiers, setSavedTiers] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('admin_settings').select('value').eq('key', 'ai_provider').single(),
      supabase.from('admin_settings').select('value').eq('key', 'results_config').maybeSingle(),
    ]).then(([{ data: aiData, error: aiErr }, { data: rcData }]) => {
      if (aiErr) setError(aiErr.message)
      else if (aiData) setSettings(aiData.value as AiProviderSettings)
      if (rcData?.value) setGlobalTiers(rcData.value as Record<'cs' | 'sk' | 'en', TierConfig[]>)
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

  async function handleSaveTiers() {
    setSavingTiers(true)
    setSavedTiers(false)
    const { error } = await supabase
      .from('admin_settings')
      .upsert({ key: 'results_config', value: globalTiers, updated_at: new Date().toISOString() })
    if (!error) setSavedTiers(true)
    setSavingTiers(false)
    setTimeout(() => setSavedTiers(false), 2000)
  }

  function updateTier(lang: 'cs' | 'sk' | 'en', idx: number, patch: Partial<TierConfig>) {
    setGlobalTiers(prev => ({
      ...prev,
      [lang]: prev[lang].map((t, i) => i === idx ? { ...t, ...patch } : t),
    }))
  }

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

        {/* Global results config */}
        <div className="border-t border-gray-100 pt-6">
          <div className="text-sm font-semibold text-gray-700 mb-1">Výsledková obrazovka — globální výchozí hodnoty</div>
          <div className="text-xs text-gray-400 mb-4">Ikony, nadpisy a hlášky, které se zobrazí, pokud sada nemá vlastní nastavení.</div>

          {/* Language tabs */}
          <div className="flex gap-1 mb-4">
            {LANG_TABS.map(t => (
              <button
                key={t.code}
                onClick={() => setTierLang(t.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tierLang === t.code ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {globalTiers[tierLang].map((tier, i) => (
              <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs text-gray-400 w-14 shrink-0">{TIER_LABELS[i]}</span>
                  <input
                    type="text"
                    value={tier.icon}
                    onChange={e => updateTier(tierLang, i, { icon: e.target.value })}
                    className="w-12 text-center border border-gray-200 rounded-md px-1 py-1 text-sm bg-white"
                    maxLength={4}
                  />
                  <Input
                    value={tier.title}
                    onChange={e => updateTier(tierLang, i, { title: e.target.value })}
                    placeholder="Nadpis"
                    className="flex-1 h-8 text-sm"
                  />
                </div>
                <div className="space-y-1 pl-[60px]">
                  {tier.messages.map((msg, mi) => (
                    <Input
                      key={mi}
                      value={msg}
                      onChange={e => {
                        const msgs = [...tier.messages] as [string, string, string]
                        msgs[mi] = e.target.value
                        updateTier(tierLang, i, { messages: msgs })
                      }}
                      placeholder={`Hláška ${mi + 1}`}
                      className="h-8 text-sm"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {savedTiers && <div className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 mt-3">Výchozí hodnoty uloženy.</div>}
          <Button onClick={handleSaveTiers} disabled={savingTiers} variant="outline" className="w-full mt-3">
            {savingTiers ? 'Ukládání…' : 'Uložit výchozí hodnoty'}
          </Button>
        </div>
        </div>
      )}
    </div>
  )
}
