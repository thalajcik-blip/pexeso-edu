import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'
import type { Language } from '../../data/translations'

const TITLES: Record<Language, string> = {
  cs: 'Ochrana osobních údajů',
  sk: 'Ochrana osobných údajov',
  en: 'Privacy Policy',
}

const EFFECTIVE: Record<Language, string> = {
  cs: 'Platné od 17. března 2026',
  sk: 'Platné od 17. marca 2026',
  en: 'Effective 17 March 2026',
}

const SECTIONS: Record<Language, { heading: string; body: string; email?: string }[]> = {
  cs: [
    {
      heading: 'Správce údajů',
      body: 'Provozovatelem platformy pexedu (pexedu.cz, pexedu.com) je teamplayer.cz. Kontakt:',
      email: 'iam@teamplayer.cz',
    },
    {
      heading: 'Jaké údaje zpracováváme',
      body: 'Při registraci ukládáme e-mailovou adresu a (volitelně) přezdívku a avatar. Při hraní zaznamenáváme herní výsledky (počet párů, úspěšnost kvízu, čas hry). Nesbíráme žádné citlivé osobní údaje.',
    },
    {
      heading: 'Proč údaje zpracováváme',
      body: 'E-mail slouží k přihlášení a správě účtu. Přezdívka a avatar jsou zobrazeny v rámci platformy. Herní výsledky slouží k výpočtu XP, zobrazení statistik a herní historii. Údaje nepoužíváme k marketingu ani neprodáváme třetím stranám.',
    },
    {
      heading: 'Zpracovatel a úložiště',
      body: 'Data ukládáme prostřednictvím Supabase (EU servery, Frankfurt). Přihlášení přes Google zajišťuje Google LLC v souladu s jejich zásadami ochrany soukromí.',
    },
    {
      heading: 'Vaše práva',
      body: 'Máte právo na přístup ke svým údajům, jejich opravu nebo výmaz. Účet včetně všech dat smažete v Nastavení → Smazat účet. Pro další dotazy se obraťte na náš kontaktní e-mail.',
    },
    {
      heading: 'Cookies',
      body: 'Používáme pouze technické cookies nezbytné pro fungování přihlášení. Nepoužíváme sledovací ani reklamní cookies.',
    },
    {
      heading: 'Změny zásad',
      body: 'O změnách vás informujeme prostřednictvím aplikace. Aktuální verze je vždy dostupná v päticce stránky.',
    },
    {
      heading: 'Kontakt',
      body: '',
      email: 'iam@teamplayer.cz',
    },
  ],
  sk: [
    {
      heading: 'Prevádzkovateľ',
      body: 'Prevádzkovateľom platformy pexedu (pexedu.cz, pexedu.com) je teamplayer.cz. Kontakt:',
      email: 'iam@teamplayer.cz',
    },
    {
      heading: 'Aké údaje spracúvame',
      body: 'Pri registrácii ukladáme e-mailovú adresu a (voliteľne) prezývku a avatar. Pri hraní zaznamenávame herné výsledky (počet párov, úspešnosť kvízu, čas hry). Nezhromažďujeme žiadne citlivé osobné údaje.',
    },
    {
      heading: 'Prečo údaje spracúvame',
      body: 'E-mail slúži na prihlásenie a správu účtu. Prezývka a avatar sú zobrazené v rámci platformy. Herné výsledky slúžia na výpočet XP, zobrazenie štatistík a histórie hier. Údaje nepoužívame na marketing ani ich nepredávame tretím stranám.',
    },
    {
      heading: 'Spracovateľ a úložisko',
      body: 'Dáta ukladáme prostredníctvom Supabase (EU servery, Frankfurt). Prihlásenie cez Google zabezpečuje Google LLC v súlade s ich zásadami ochrany súkromia.',
    },
    {
      heading: 'Vaše práva',
      body: 'Máte právo na prístup k svojim údajom, ich opravu alebo výmaz. Účet vrátane všetkých dát zmažete v Nastaveniach → Zmazať účet. Pre ďalšie otázky kontaktujte náš e-mail.',
    },
    {
      heading: 'Cookies',
      body: 'Používame iba technické cookies nevyhnutné pre fungovanie prihlásenia. Nepoužívame sledovacie ani reklamné cookies.',
    },
    {
      heading: 'Zmeny zásad',
      body: 'O zmenách vás informujeme prostredníctvom aplikácie. Aktuálna verzia je vždy dostupná v päticke stránky.',
    },
    {
      heading: 'Kontakt',
      body: '',
      email: 'iam@teamplayer.cz',
    },
  ],
  en: [
    {
      heading: 'Data controller',
      body: 'The pexedu platform (pexedu.cz, pexedu.com) is operated by teamplayer.cz. Contact:',
      email: 'iam@teamplayer.cz',
    },
    {
      heading: 'What we collect',
      body: 'At registration we store your email address and, optionally, a username and avatar. During play we record game results (pairs found, quiz accuracy, duration). We do not collect any sensitive personal data.',
    },
    {
      heading: 'Why we collect it',
      body: 'Email is used for login and account management. Username and avatar are displayed within the platform. Game results are used to calculate XP, show statistics, and maintain game history. We do not use your data for marketing and do not sell it to third parties.',
    },
    {
      heading: 'Processor & storage',
      body: 'Data is stored via Supabase (EU servers, Frankfurt). Google sign-in is handled by Google LLC in accordance with their privacy policy.',
    },
    {
      heading: 'Your rights',
      body: 'You have the right to access, correct, or delete your data. You can delete your account and all associated data in Settings → Delete account. For further questions, contact us by email.',
    },
    {
      heading: 'Cookies',
      body: 'We use only technical cookies necessary for login functionality. We do not use tracking or advertising cookies.',
    },
    {
      heading: 'Policy changes',
      body: 'We will notify you of changes through the app. The current version is always available in the page footer.',
    },
    {
      heading: 'Contact',
      body: '',
      email: 'iam@teamplayer.cz',
    },
  ],
}

const CLOSE: Record<Language, string> = { cs: 'Zavřít', sk: 'Zavrieť', en: 'Close' }

export default function PrivacyModal({ onClose }: { onClose: () => void }) {
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
                {s.body}
                {s.email && (
                  <>{s.body ? ' ' : ''}<a href={`mailto:${s.email}`} style={{ color: tc.accent }}>{s.email}</a></>
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
