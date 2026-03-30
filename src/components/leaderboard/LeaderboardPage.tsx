import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { GameResultsTable } from './GameResultsTable'
import { GlobalLeaderboard } from './GlobalLeaderboard'

export default function LeaderboardPage() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: '#fff' }}>
        Leaderboard
      </h1>
      <Tabs defaultValue="ranking">
        <TabsList>
          <TabsTrigger value="ranking">Rebricek</TabsTrigger>
          <TabsTrigger value="results">Vysledky hier</TabsTrigger>
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
