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
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: '#fff' }}>
        {tr.lbTitle}
      </h1>
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
