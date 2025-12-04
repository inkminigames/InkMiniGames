'use client'

import { useEffect, useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { supabase } from '@/lib/supabase/client'
import { motion } from 'framer-motion'

interface LeaderboardEntry {
  wallet_address: string
  game_scores: {
    game_type: string
    best_score: number
    games_played: number
    total_score: number
  }[]
  overall_best_score: number
  total_games: number
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      
      const { data: scores, error } = await supabase
        .from('user_scores')
        .select('wallet_address, score, game_type')
        .order('score', { ascending: false })

      if (error) {
        throw error
      }

      if (!scores || scores.length === 0) {
        setLeaderboard([])
        return
      }

      
      const playerStats = new Map<string, Map<string, { bestScore: number; totalScore: number; gamesPlayed: number }>>()

      scores.forEach((score) => {
        const address = score.wallet_address
        const gameType = score.game_type

        if (!playerStats.has(address)) {
          playerStats.set(address, new Map())
        }

        const gameStats = playerStats.get(address)!
        const currentGameStats = gameStats.get(gameType) || { bestScore: 0, totalScore: 0, gamesPlayed: 0 }

        gameStats.set(gameType, {
          bestScore: Math.max(currentGameStats.bestScore, score.score),
          totalScore: currentGameStats.totalScore + score.score,
          gamesPlayed: currentGameStats.gamesPlayed + 1,
        })
      })

      
      const leaderboardData: LeaderboardEntry[] = Array.from(playerStats.entries())
        .map(([wallet_address, gameStats]) => {
          const game_scores = Array.from(gameStats.entries()).map(([game_type, stats]) => ({
            game_type,
            best_score: stats.bestScore,
            games_played: stats.gamesPlayed,
            total_score: stats.totalScore,
          }))

          const overall_best_score = Math.max(...game_scores.map(g => g.best_score))
          const total_games = game_scores.reduce((sum, g) => sum + g.games_played, 0)

          return {
            wallet_address,
            game_scores,
            overall_best_score,
            total_games,
          }
        })
        .sort((a, b) => b.overall_best_score - a.overall_best_score)
        .slice(0, 100)

      setLeaderboard(leaderboardData)
    } catch (error) {
      
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <Container>
        <div className="py-12">
          {}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl mb-4 gradient-text">
              Leaderboard
            </h1>
            <p className="text-lg text-muted-foreground">
              Top players across all games on Ink Mini Games
            </p>
          </div>

          {}
          <Card className="mb-12 p-6 bg-white/[0.02] border-primary/20">
            <h2 className="text-xl mb-4 text-primary-400">How Rankings Work</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="text-primary flex-shrink-0">•</span>
                <div>
                  <span className="text-foreground">Overall Ranking:</span> Players are ranked by their highest score across all games
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary flex-shrink-0">•</span>
                <div>
                  <span className="text-foreground">Per-Game Best Scores:</span> Each game type shows your personal best score for that specific game
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary flex-shrink-0">•</span>
                <div>
                  <span className="text-foreground">Games Played:</span> Total number of games completed for each game type
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary flex-shrink-0">•</span>
                <div>
                  <span className="text-foreground">Average Score:</span> Your average score calculated per game type (Total Score ÷ Games Played)
                </div>
              </div>
            </div>
          </Card>

          {}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-pulse text-primary-400">Loading...</div>
            </div>
          ) : leaderboard.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-foreground/70">
                No players yet. Be the first to compete!
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {}
              {leaderboard.length >= 3 ? (
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                  {}
                  <PodiumCard
                    entry={leaderboard[1]}
                    rank={2}
                    color="from-slate-400 via-gray-400 to-slate-500"
                  />

                  {}
                  <PodiumCard
                    entry={leaderboard[0]}
                    rank={1}
                    color="from-yellow-400 via-amber-400 to-yellow-600"
                  />

                  {}
                  <PodiumCard
                    entry={leaderboard[2]}
                    rank={3}
                    color="from-orange-500 via-orange-600 to-amber-700"
                  />
                </div>
              ) : (
                <div className="space-y-2 mb-8">
                  {leaderboard.map((entry, index) => (
                    <LeaderboardRow
                      key={entry.wallet_address}
                      entry={entry}
                      rank={index + 1}
                    />
                  ))}
                </div>
              )}

              {}
              {leaderboard.length > 3 && (
                <div className="space-y-2">
                  {leaderboard.slice(3).map((entry, index) => (
                    <LeaderboardRow
                      key={entry.wallet_address}
                      entry={entry}
                      rank={index + 4}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}

function PodiumCard({
  entry,
  rank,
  color,
}: {
  entry: LeaderboardEntry
  rank: number
  color: string
}) {
  const medals = ['', '🥇', '🥈', '🥉']
  const heights = ['', 'h-64', 'h-48', 'h-48']
  const glowColors = ['', 'shadow-yellow-500/50', 'shadow-gray-400/30', 'shadow-orange-600/30']

  return (
    <motion.div
      initial={{ opacity: 0, y: 100, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: rank === 1 ? 0.3 : rank === 2 ? 0.15 : 0.45,
        type: 'spring',
        stiffness: 120,
        damping: 15
      }}
      className={`${rank === 1 ? 'md:order-2' : rank === 2 ? 'md:order-1' : 'md:order-3'}`}
    >
      <motion.div
        className="relative"
        whileHover={{
          scale: 1.05,
          rotateY: 5,
          transition: { duration: 0.3 }
        }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {}
        {rank === 1 && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-yellow-400/30 to-amber-600/30 rounded-t-xl blur-xl"
            animate={{
              opacity: [0.5, 0.8, 0.5],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}

        {}
        <div className={`relative ${heights[rank]} bg-gradient-to-br ${color} rounded-t-xl flex items-end justify-center p-6 transition-all duration-300 ${rank === 1 ? `shadow-2xl ${glowColors[rank]}` : 'shadow-lg'}`}>
          <div className="text-center w-full">
            {}
            <motion.div
              className={`text-7xl mb-4 ${rank === 1 ? 'scale-110' : ''}`}
              animate={{
                rotate: [0, -5, 5, -5, 0],
                scale: rank === 1 ? [1.1, 1.15, 1.1] : [1, 1.05, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3
              }}
            >
              {medals[rank]}
            </motion.div>

            {}
            <div className="text-white/90 text-2xl mb-3">
              #{rank}
            </div>

            {}
            <div className="text-white/80 text-sm mb-4 font-mono">
              {formatAddress(entry.wallet_address)}
            </div>

            {}
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 mb-3">
              <div className="text-white/70 text-xs mb-1">Overall Best</div>
              <div className="text-white text-3xl font-mono">
                {entry.overall_best_score.toLocaleString()}
              </div>
            </div>

            {}
            <div className="space-y-2 text-sm">
              {entry.game_scores.map((gameScore) => (
                <div key={gameScore.game_type} className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-white/70 text-xs font-semibold">{formatGameType(gameScore.game_type)}</div>
                    <div className="text-white/60 text-xs">{gameScore.games_played} games</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-white/50 text-xs">Best: </span>
                      <span className="text-white font-mono text-sm">{gameScore.best_score.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-white/50 text-xs">Avg: </span>
                      <span className="text-white font-mono text-sm">{Math.round(gameScore.total_score / gameScore.games_played).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function LeaderboardRow({
  entry,
  rank,
}: {
  entry: LeaderboardEntry
  rank: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: Math.min(rank * 0.03, 0.5),
        type: 'spring',
        stiffness: 80
      }}
      whileHover={{ scale: 1.01, x: 5 }}
    >
      <Card className="flex items-center gap-6 py-5 px-6 bg-gradient-to-r from-white/[0.03] to-white/[0.01] border-white/5 hover:border-primary/30 hover:bg-white/[0.05] transition-all duration-300">
        {}
        <div className="flex-shrink-0">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center">
            <span className="text-xl text-primary-400">#{rank}</span>
          </div>
        </div>

        {}
        <div className="flex-1 min-w-0">
          <div className="font-mono text-lg text-foreground mb-3">{formatAddress(entry.wallet_address)}</div>

          {}
          <div className="space-y-2">
            {entry.game_scores.map((gameScore) => (
              <div key={gameScore.game_type} className="flex items-center gap-4 text-sm">
                <div className="px-2 py-0.5 rounded bg-primary/20 border border-primary/30 text-xs text-primary-300 w-16 text-center">
                  {formatGameType(gameScore.game_type)}
                </div>
                <div className="flex items-center gap-4 text-foreground/60">
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground/40">Best:</span>
                    <span className="font-mono">{gameScore.best_score.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground/40">Games:</span>
                    <span className="font-mono">{gameScore.games_played}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground/40">Avg:</span>
                    <span className="font-mono">{Math.round(gameScore.total_score / gameScore.games_played).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {}
        <div className="flex-shrink-0 text-right">
          <div className="text-xs text-foreground/50 mb-1">Overall Best</div>
          <div className="text-3xl font-mono text-primary-400">
            {entry.overall_best_score.toLocaleString()}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatGameType(gameType: string): string {
  const gameTypeMap: Record<string, string> = {
    'memory-match': 'Memory',
    'snake': 'Snake',
    'tetris': 'Tetris',
    '2048': '2048'
  }
  return gameTypeMap[gameType] || gameType
}
