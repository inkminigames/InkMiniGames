'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/Navbar'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'

export default function GamesPage() {
  const games = [
    {
      id: '2048',
      title: '2048',
      description: 'Slide and merge tiles to reach 2048 and beyond',
      available: true,
    },
    {
      id: 'snake',
      title: 'Snake',
      description: 'Classic arcade game with blockchain scores',
      available: true,
    },
    {
      id: 'tetris',
      title: 'Tetris',
      description: 'Stack blocks and clear lines competitively',
      available: true,
    },
    {
      id: 'memory-match',
      title: 'Memory Match',
      description: 'Match pairs and test your memory skills',
      available: true,
    },
  ]

  return (
    <div className="min-h-screen">
      <Navbar />

      <Container>
        <div className="py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto space-y-12"
          >
            <div className="space-y-3">
              <h1 className="text-5xl md:text-6xl">Games</h1>
              <p className="text-xl text-muted-foreground">
                Choose your game and start competing
              </p>
            </div>

            <div className="space-y-6">
              {games.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  {game.available ? (
                    <Link href={`/games/${game.id}`}>
                      <Card className="group relative overflow-hidden hover:border-primary/50 transition-all duration-300 cursor-pointer">
                        <div className="flex flex-col md:flex-row items-stretch">
                          {}
                          <div className="relative w-full md:w-80 h-48 md:h-auto bg-gradient-to-br from-primary via-accent to-primary/80 flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 animate-pulse-slow" />
                            <motion.div
                              className="relative"
                              initial={{ scale: 0.8, rotate: -10 }}
                              animate={{ scale: 1, rotate: 0 }}
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              transition={{ delay: index * 0.1 + 0.2, duration: 0.8, type: 'spring' }}
                            >
                              {game.id === '2048' && (
                                <motion.div
                                  className="game-icon-2048"
                                  animate={{
                                    textShadow: [
                                      '0 2px 0 rgba(0, 0, 0, 0.2), 0 4px 8px rgba(0, 0, 0, 0.3)',
                                      '0 4px 0 rgba(0, 0, 0, 0.2), 0 8px 16px rgba(0, 0, 0, 0.4)',
                                      '0 2px 0 rgba(0, 0, 0, 0.2), 0 4px 8px rgba(0, 0, 0, 0.3)',
                                    ]
                                  }}
                                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                  2048
                                </motion.div>
                              )}
                              {game.id === 'snake' && (
                                <motion.div
                                  className="text-9xl filter drop-shadow-2xl"
                                  animate={{ rotate: [-2, 2, -2] }}
                                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                  🐍
                                </motion.div>
                              )}
                              {game.id === 'tetris' && (
                                <motion.div
                                  className="text-9xl filter drop-shadow-2xl"
                                  animate={{ y: [0, -10, 0] }}
                                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                  🧩
                                </motion.div>
                              )}
                              {game.id === 'memory-match' && (
                                <motion.div
                                  className="text-9xl filter drop-shadow-2xl"
                                  animate={{ scale: [1, 1.1, 1] }}
                                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                  🎴
                                </motion.div>
                              )}
                            </motion.div>
                          </div>

                          {}
                          <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
                            <div className="flex items-start justify-between mb-4">
                              <h3 className="text-4xl md:text-5xl group-hover:text-primary transition-colors">
                                {game.title}
                              </h3>
                              <span className="px-4 py-2 text-sm font-medium rounded-full bg-success/10 text-success border-2 border-success/30 shadow-lg">
                                LIVE
                              </span>
                            </div>
                            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-6">
                              {game.description}
                            </p>
                            <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                              <span>Play Now</span>
                              <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        {}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </Card>
                    </Link>
                  ) : (
                    <Card className="relative overflow-hidden opacity-60 cursor-not-allowed">
                      <div className="flex flex-col md:flex-row items-stretch">
                        {}
                        <div className="relative w-full md:w-80 h-48 md:h-auto bg-gradient-to-br from-muted via-muted-foreground/20 to-muted flex items-center justify-center overflow-hidden">
                          <motion.div
                            className="relative text-9xl filter grayscale opacity-50"
                            initial={{ scale: 0.8, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: index * 0.1 + 0.2, duration: 0.8, type: 'spring' }}
                          >
                            {game.id === 'snake' && '🐍'}
                            {game.id === 'tetris' && '🧩'}
                          </motion.div>
                        </div>

                        {}
                        <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
                          <div className="flex items-start justify-between mb-4">
                            <h3 className="text-4xl md:text-5xl">{game.title}</h3>
                            <span className="px-4 py-2 text-sm font-medium rounded-full bg-warning/10 text-warning border-2 border-warning/30">
                              COMING SOON
                            </span>
                          </div>
                          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                            {game.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </Container>
    </div>
  )
}
