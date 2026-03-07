import { useGameStore } from '../../store/gameStore'

export default function RulesModal() {
  const rulesOpen = useGameStore(s => s.rulesOpen)
  const closeRules = useGameStore(s => s.closeRules)

  if (!rulesOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,27,42,0.95)' }}
      onClick={closeRules}
    >
      <div
        className="pop-in w-full max-w-md rounded-2xl p-8 space-y-4"
        style={{ background: '#111f2e', border: '1px solid rgba(255,255,255,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold">📖 Pravidla hry</h2>
        <ol className="space-y-2 text-sm list-decimal list-inside" style={{ color: 'rgba(255,255,255,0.75)' }}>
          <li>Hráči se střídají. Na svém tahu hráč otočí <strong className="text-white">dvě kartičky</strong>.</li>
          <li>Pokud se kartičky <strong className="text-white">shodují</strong>, hráč získá <strong className="text-white">1 bod</strong> za pár a zobrazí se kvízová otázka.</li>
          <li>Za <strong className="text-white">správnou odpověď</strong> v kvízu hráč získá další <strong className="text-white">1 bod</strong>.</li>
          <li>Po nalezeném páru (bez ohledu na kvíz) <strong className="text-white">hráč hraje znovu</strong>.</li>
          <li>Pokud se kartičky <strong className="text-white">neshodují</strong>, jsou otočeny zpět a přichází další hráč.</li>
          <li>Hra končí, když jsou nalezeny <strong className="text-white">všechny páry</strong>. Vítězí hráč s nejvíce body.</li>
        </ol>
        <button
          onClick={closeRules}
          className="w-full py-2.5 rounded-xl font-bold mt-2 transition-opacity hover:opacity-90"
          style={{ background: '#f9d74e', color: '#0d1b2a' }}
        >
          Zavřít
        </button>
      </div>
    </div>
  )
}
