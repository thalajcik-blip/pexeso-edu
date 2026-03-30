import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { GameResultsTable } from './GameResultsTable'
import { GlobalLeaderboard } from './GlobalLeaderboard'
import { useGameStore } from '../../store/gameStore'
import { TRANSLATIONS } from '../../data/translations'

export default function LeaderboardPage() {
  const language = useGameStore(s => s.language)
  const tr = TRANSLATIONS[language]

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <a href="/" style={{ fontSize: '0.875rem', opacity: 0.6, textDecoration: 'none', color: 'inherit' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
        >
          {tr.backToGame}
        </a>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#fff' }}>
          {tr.lbTitle}
        </h1>
      </div>
      <Tabs defaultValue="ranking">
        <TabsList>
          <TabsTrigger value="ranking">{tr.lbTabRanking}</TabsTrigger>
          <TabsTrigger value="results">{tr.lbTabResults}</TabsTrigger>
        </TabsList>
        <TabsContent value="ranking">
          <GlobalLeaderboard />
        </TabsContent>
        <TabsContent value="results">
          <GameResultsTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
