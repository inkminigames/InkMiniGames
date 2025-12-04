'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { supabase } from '@/lib/supabase/client'

type GameType = '2048' | 'snake' | 'tetris' | 'memory-match'

type GameData = {
  gameId: number
  gameType: GameType
  score: number
  createdAt: string
  walletAddress: string
  isBestScore: boolean
  isLastPlayed: boolean
}

export default function ReplayPage() {
  const { address, isConnected } = useAccount()
  const [selectedGameType, setSelectedGameType] = useState<GameType | 'all'>('all')
  const [userGames, setUserGames] = useState<GameData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserGames = async () => {
      if (!address) {
        setLoading(false)
        return
      }

      try {
        const gameTypes: GameType[] = ['2048', 'snake', 'tetris', 'memory-match']
        const allGames: GameData[] = []
        const gameIdSet = new Set<number>()

        for (const gameType of gameTypes) {
          // Fetch best score
          const { data: bestScore, error: bestError } = await supabase
            .from('user_scores')
            .select('game_id_onchain, game_type, score, created_at, wallet_address')
            .eq('wallet_address', address.toLowerCase())
            .eq('game_type', gameType)
            .order('score', { ascending: false })
            .limit(1)

          // Fetch last game by game_id_onchain (highest ID = most recent)
          const { data: lastGame, error: lastError } = await supabase
            .from('user_scores')
            .select('game_id_onchain, game_type, score, created_at, wallet_address')
            .eq('wallet_address', address.toLowerCase())
            .eq('game_type', gameType)
            .order('game_id_onchain', { ascending: false })
            .limit(1)

          const bestGameId = bestScore?.[0]?.game_id_onchain
          const lastGameId = lastGame?.[0]?.game_id_onchain

          // Add best score game if exists
          if (!bestError && bestScore && bestScore.length > 0) {
            const game = bestScore[0]
            gameIdSet.add(game.game_id_onchain)
            allGames.push({
              gameId: game.game_id_onchain,
              gameType: game.game_type as GameType,
              score: game.score,
              createdAt: game.created_at,
              walletAddress: game.wallet_address,
              isBestScore: true,
              isLastPlayed: game.game_id_onchain === lastGameId,
            })
          }

          // Add last played game only if different from best score
          if (!lastError && lastGame && lastGame.length > 0) {
            const game = lastGame[0]
            if (!gameIdSet.has(game.game_id_onchain)) {
              allGames.push({
                gameId: game.game_id_onchain,
                gameType: game.game_type as GameType,
                score: game.score,
                createdAt: game.created_at,
                walletAddress: game.wallet_address,
                isBestScore: game.game_id_onchain === bestGameId,
                isLastPlayed: true,
              })
            }
          }
        }

        // Sort by game_id_onchain descending (most recent first)
        allGames.sort((a, b) => b.gameId - a.gameId)
        setUserGames(allGames)
      } catch (error) {
        console.error('Error fetching games:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserGames()
  }, [address])

  const handleRefresh = () => {
    window.location.reload()
  }

  const filteredGames = selectedGameType === 'all'
    ? userGames
    : userGames.filter(g => g.gameType === selectedGameType)

  const getGameColor = (gameType: GameType) => {
    switch (gameType) {
      case '2048': return 'text-yellow-500'
      case 'snake': return 'text-green-500'
      case 'tetris': return 'text-cyan-500'
      case 'memory-match': return 'text-purple-500'
    }
  }

  const getGameDisplayName = (gameType: GameType) => {
    switch (gameType) {
      case '2048': return '2048'
      case 'snake': return 'snake'
      case 'tetris': return 'tetris'
      case 'memory-match': return 'Memory'
    }
  }

  const getGamePath = (gameId: number, gameType: GameType) => {
    return `/games/${gameType}/replay/${gameId}`
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <Container>
          <div className="py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-5xl md:text-6xl mb-6 gradient-text">Game History</h1>
              <p className="text-xl text-muted-foreground">
                Connect your wallet to view your game history
              </p>
            </motion.div>
          </div>
        </Container>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <Container>
          <div className="py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-5xl md:text-6xl mb-6 gradient-text">Game History</h1>
              <div className="flex justify-center mt-12">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </motion.div>
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <Container>
        <div className="py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-4 mb-4">
              <h1 className="text-5xl md:text-6xl gradient-text">
                Game History
              </h1>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-all duration-200 flex items-center gap-2"
                title="Refresh game history"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
                Refresh
              </button>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              View your best score and latest game for each game type.
            </p>
          </motion.div>

          {/* Game Type Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center gap-4 mb-12"
          >
            <button
              onClick={() => setSelectedGameType('all')}
              className={`px-6 py-3 rounded-lg border-2 transition-all duration-200 ${
                selectedGameType === 'all'
                  ? 'bg-primary border-primary text-white'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              All Games
            </button>
            <button
              onClick={() => setSelectedGameType('2048')}
              className={`px-6 py-3 rounded-lg border-2 transition-all duration-200 ${
                selectedGameType === '2048'
                  ? 'bg-primary border-primary text-white'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              2048
            </button>
            <button
              onClick={() => setSelectedGameType('snake')}
              className={`px-6 py-3 rounded-lg border-2 transition-all duration-200 ${
                selectedGameType === 'snake'
                  ? 'bg-primary border-primary text-white'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              Snake
            </button>
            <button
              onClick={() => setSelectedGameType('tetris')}
              className={`px-6 py-3 rounded-lg border-2 transition-all duration-200 ${
                selectedGameType === 'tetris'
                  ? 'bg-primary border-primary text-white'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              Tetris
            </button>
            <button
              onClick={() => setSelectedGameType('memory-match')}
              className={`px-6 py-3 rounded-lg border-2 transition-all duration-200 ${
                selectedGameType === 'memory-match'
                  ? 'bg-primary border-primary text-white'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              Memory Match
            </button>
          </motion.div>

          {/* Games List */}
          <div className="max-w-5xl mx-auto">
            {filteredGames.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-xl text-foreground font-semibold mb-2">
                  No games found
                </p>
                <p className="text-muted-foreground">
                  Play some games and submit your scores to see them here!
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {filteredGames.map((game, index) => (
                  <motion.div
                    key={`${game.gameType}-${game.gameId}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="group relative overflow-hidden hover:border-primary/50 transition-all duration-300">
                      <div className="flex flex-col md:flex-row items-stretch">
                        {/* Left side - Game type badge */}
                        <div className="relative w-full md:w-40 h-24 md:h-auto bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 flex items-center justify-center overflow-hidden border-r border-border/50">
                          <motion.div
                            className="relative"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={{ scale: 1.05 }}
                            transition={{ delay: index * 0.05, duration: 0.4 }}
                          >
                            <motion.div
                              className={`text-2xl font-black uppercase tracking-wider ${getGameColor(game.gameType)}`}
                              animate={{
                                textShadow: game.gameType === '2048'
                                  ? ['0 0 10px rgba(234, 179, 8, 0.3)', '0 0 20px rgba(234, 179, 8, 0.5)', '0 0 10px rgba(234, 179, 8, 0.3)']
                                  : game.gameType === 'snake'
                                  ? ['0 0 10px rgba(34, 197, 94, 0.3)', '0 0 20px rgba(34, 197, 94, 0.5)', '0 0 10px rgba(34, 197, 94, 0.3)']
                                  : game.gameType === 'tetris'
                                  ? ['0 0 10px rgba(6, 182, 212, 0.3)', '0 0 20px rgba(6, 182, 212, 0.5)', '0 0 10px rgba(6, 182, 212, 0.3)']
                                  : ['0 0 10px rgba(168, 85, 247, 0.3)', '0 0 20px rgba(168, 85, 247, 0.5)', '0 0 10px rgba(168, 85, 247, 0.3)']
                              }}
                              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            >
                              {getGameDisplayName(game.gameType)}
                            </motion.div>
                          </motion.div>
                        </div>

                        {/* Middle - Score and metadata */}
                        <div className="flex-1 p-6 flex flex-col justify-center gap-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Score</div>
                              <h3 className="text-5xl font-black gradient-text">
                                {game.score.toLocaleString()}
                              </h3>
                            </div>
                            <div className="flex flex-col gap-2">
                              {game.isBestScore && (
                                <span className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-500 border border-yellow-500/50">
                                  Best Score
                                </span>
                              )}
                              {game.isLastPlayed && (
                                <span className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-500 border border-purple-500/50">
                                  Last Played
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="font-mono">ID #{game.gameId}</span>
                            <span>•</span>
                            <span>{new Date(game.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                        </div>

                        {/* Right side - Actions */}
                        <div className="flex flex-col md:flex-row items-stretch gap-2 p-4 md:p-6 md:pl-0 md:min-w-[280px]">
                          <Link
                            href={getGamePath(game.gameId, game.gameType)}
                            className="flex-1 px-6 py-4 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-3 border-2 border-primary hover:border-primary/70 hover:scale-[1.02]"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>View Replay</span>
                          </Link>
                          <Link
                            href={`/games/${game.gameType}`}
                            className="px-6 py-3 border-2 border-border hover:border-primary/50 text-foreground hover:text-primary font-semibold uppercase text-sm tracking-wider transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            <span>Play Again</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </Link>
                        </div>
                      </div>

                      {/* Hover effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}
