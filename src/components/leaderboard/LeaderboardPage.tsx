import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { GameResultsTable } from './GameResultsTable'

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
          <div style={{ padding: '2rem 0', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
            Rebricek bude dostupny v dalsej verzii.
          </div>
        </TabsContent>
        <TabsContent value="results">
          <GameResultsTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
