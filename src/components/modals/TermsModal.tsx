import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'
import type { Language } from '../../data/translations'

const TITLES: Record<Language, string> = {
  cs: 'Podmínky používání',
  sk: 'Podmienky používania',
  en: 'Terms of Use',
}

const EFFECTIVE: Record<Language, string> = {
  cs: 'Platné od 17. března 2026',
  sk: 'Platné od 17. marca 2026',
  en: 'Effective 17 March 2026',
}

const SECTIONS: Record<Language, { heading: string; body: string | null; email?: string }[]> = {
  cs: [
    { heading: 'Služba', body: 'pexedu je vzdělávací herní platforma dostupná na pexedu.cz a pexedu.com. Poskytujeme ji „tak jak je" a můžeme ji kdykoli změnit nebo ukončit.' },
    { heading: 'Účet', body: 'Zodpovídáte za bezpečnost svého účtu. Jeden účet na osobu. Zakazujeme vytváření falešných účtů a zneužívání služby.' },
    { heading: 'Obsah', body: 'Vaše přezdívky a herní výsledky můžeme zobrazit v rámci platformy. Nepoužíváme je k jiným účelům.' },
    { heading: 'Věk', body: 'Minimální věk pro registraci je 13 let. Uživatelé mladší 16 let by měli mít souhlas zákonného zástupce.' },
    { heading: 'Ukončení', body: 'Můžeme zrušit účet, který porušuje podmínky. Vy můžete účet smazat kdykoli přes Nastavení.' },
    { heading: 'Odpovědnost', body: 'Neručíme za škody vzniklé používáním služby.' },
    { heading: 'Rozhodné právo', body: 'Česká republika.' },
    { heading: 'Kontakt', body: null, email: 'iam@teamplayer.cz' },
  ],
  sk: [
    { heading: 'Služba', body: 'pexedu je vzdelávacia herná platforma dostupná na pexedu.cz a pexedu.com. Poskytujeme ju „tak ako je" a môžeme ju kedykoľvek zmeniť alebo ukončiť.' },
    { heading: 'Účet', body: 'Zodpovedáte za bezpečnosť svojho účtu. Jeden účet na osobu. Zakazujeme vytváranie falošných účtov a zneužívanie služby.' },
    { heading: 'Obsah', body: 'Vaše prezývky a herné výsledky môžeme zobraziť v rámci platformy. Nepoužívame ich na iné účely.' },
    { heading: 'Vek', body: 'Minimálny vek pre registráciu je 13 rokov. Používatelia mladší ako 16 rokov by mali mať súhlas zákonného zástupcu.' },
    { heading: 'Ukončenie', body: 'Môžeme zrušiť účet, ktorý porušuje podmienky. Vy môžete účet zmazať kedykoľvek cez Nastavenia.' },
    { heading: 'Zodpovednosť', body: 'Neručíme za škody vzniknuté používaním služby.' },
    { heading: 'Rozhodné právo', body: 'Slovenská republika.' },
    { heading: 'Kontakt', body: null, email: 'iam@teamplayer.cz' },
  ],
  en: [
    { heading: 'Service', body: 'pexedu is an educational gaming platform available at pexedu.cz and pexedu.com. We provide it "as is" and may modify or discontinue it at any time.' },
    { heading: 'Account', body: 'You are responsible for the security of your account. One account per person. Creating fake accounts or abusing the service is prohibited.' },
    { heading: 'Content', body: 'Your username and game results may be displayed within the platform. We do not use them for any other purpose.' },
    { heading: 'Age', body: 'Minimum age for registration is 13 years. Users under 16 should have parental consent.' },
    { heading: 'Termination', body: 'We may suspend accounts that violate these terms. You may delete your account at any time via Settings.' },
    { heading: 'Liability', body: 'We are not liable for any damages arising from use of the service.' },
    { heading: 'Governing law', body: 'Czech Republic.' },
    { heading: 'Contact', body: null, email: 'iam@teamplayer.cz' },
  ],
}

const CLOSE: Record<Language, string> = { cs: 'Zavřít', sk: 'Zavrieť', en: 'Close' }

export default function TermsModal({ onClose }: { onClose: () => void }) {
  const theme    = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const tc = THEMES[theme]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: tc.overlayBg }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl flex flex-col max-h-[90vh]"
        style={{ background: tc.modalSurface, border: `1px solid ${tc.modalSurfaceBorder}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-3 flex-shrink-0">
          <h2 className="text-lg font-bold" style={{ color: tc.text }}>{TITLES[language]}</h2>
          <p className="text-xs mt-0.5" style={{ color: tc.textMuted }}>{EFFECTIVE[language]}</p>
        </div>

        <div className="overflow-y-auto px-6 pb-2 space-y-3">
          {SECTIONS[language].map(s => (
            <div key={s.heading}>
              <p className="text-sm font-semibold" style={{ color: tc.text }}>{s.heading}</p>
              <p className="text-sm mt-0.5" style={{ color: tc.textDim }}>
                {s.body ?? (
                  <a href={`mailto:${s.email}`} style={{ color: tc.accent }}>{s.email ?? ''}</a>
                )}
              </p>
            </div>
          ))}
        </div>

        <div className="px-6 pt-3 pb-6 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-bold transition-opacity hover:opacity-90"
            style={{ background: tc.accentGradient, color: tc.accentText }}
          >
            {CLOSE[language]}
          </button>
        </div>
      </div>
    </div>
  )
}
