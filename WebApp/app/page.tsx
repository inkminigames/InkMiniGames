'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/Navbar'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function Home() {
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

      {}
      <section className="relative py-32 md:py-40 overflow-hidden">
        {}
        <div className="absolute inset-0">
          <Image
            src="/ink_mini_games_wallpaper.png"
            alt="Ink Mini Games Background"
            fill
            className="object-cover opacity-40"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />
        </div>

        <Container>
          <div className="relative max-w-5xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-6"
            >
              <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight">
                Play. Compete.
                <span className="block mt-2 gradient-text">
                  Win on-chain.
                </span>
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
              >
                Mini games with every move permanently stored on Ink blockchain. Play, compete, and replay your best performances.
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link href="/games">
                <Button size="lg" className="px-8 py-6 text-lg">
                  Start Playing
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button size="lg" variant="outline" className="px-8 py-6 text-lg">
                  View Leaderboard
                </Button>
              </Link>
            </motion.div>
          </div>
        </Container>
      </section>

      {}
      <section className="py-16 border-y border-border/50">
        <Container>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12 max-w-3xl mx-auto">
            {[
              { value: '4', label: 'Game(s) Live', delay: 0.1 },
              { value: '100%', label: 'On-Chain', delay: 0.2 },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: stat.delay, duration: 0.6 }}
                className="text-center group"
              >
                <div className="text-5xl md:text-6xl font-bold mb-3 gradient-text">
                  {stat.value}
                </div>
                <div className="text-sm md:text-base text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {}
      <section className="py-24 md:py-32 border-t border-border/50">
        <Container>
          <div className="max-w-6xl mx-auto space-y-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-3"
            >
              <h2 className="text-4xl md:text-5xl font-bold">How it works</h2>
            </motion.div>

            <div className="grid md:grid-cols-4 gap-12 md:gap-16">
              {[
                {
                  number: '01',
                  title: 'Connect',
                  description: 'Sign in with your EVM wallet on Ink',
                },
                {
                  number: '02',
                  title: 'Play',
                  description: 'Pay entry fee, play & enjoy a smooth gameplay',
                },
                {
                  number: '03',
                  title: 'Submit',
                  description: 'Submit score on-chain when done, compete on leaderboard',
                },
                {
                  number: '04',
                  title: 'Replay',
                  description: 'Watch your best/latest games replayed move-by-move',
                },
              ].map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15, duration: 0.6 }}
                  className="space-y-4 group"
                >
                  <div className="text-6xl md:text-7xl font-bold text-muted-foreground/20 group-hover:text-primary/30 transition-colors">
                    {step.number}
                  </div>
                  <h3 className="text-2xl font-bold group-hover:text-primary transition-colors">{step.title}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {}
      <section className="py-24 md:py-32 border-t border-border/50 relative overflow-hidden">
        {}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-transparent to-primary/30" />
        </div>

        <Container>
          <div className="relative max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center space-y-8"
            >
              <div className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 text-primary text-sm font-medium mb-4">
                BLOCKCHAIN-POWERED REPLAYS
              </div>

              <h2 className="text-4xl md:text-6xl font-bold">
                Every move.
                <span className="block mt-2 gradient-text">
                  Stored forever.
                </span>
              </h2>

              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                All game moves are stored on-chain. Watch your best performances replayed automatically, step by step, exactly as you played them.
              </p>

              <div className="grid md:grid-cols-3 gap-8 pt-8">
                {[
                  {
                    title: 'Permanent Storage',
                    description: 'Every move saved on Ink blockchain',
                  },
                  {
                    title: 'Auto Replay',
                    description: 'Watch games replay automatically',
                  },
                  {
                    title: 'Prove Your Skills',
                    description: 'Verifiable on-chain achievements',
                  },
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                  >
                    <Card className="p-6 bg-white/[0.02] border-white/10 hover:border-primary/30 transition-all duration-300">
                      <div className="w-12 h-12 bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
                        <div className="w-6 h-6 bg-primary/30" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="pt-8"
              >
                <Link href="/replay">
                  <button className="group relative px-10 py-4 text-lg border border-primary/50 bg-primary/10 text-primary overflow-hidden">
                    <span className="relative z-10 transition-colors duration-300 group-hover:text-white">
                      Watch Replays
                    </span>
                    <div className="absolute inset-0 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  </button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </Container>
      </section>

      {}
      <section className="py-24 md:py-32 border-t border-border/50">
        <Container>
          <div className="max-w-6xl mx-auto space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center space-y-3"
            >
              <h2 className="text-4xl md:text-5xl">Available Games</h2>
              <p className="text-lg text-muted-foreground">
                Start playing and compete on the leaderboard
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {games.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <Link href={game.available ? `/games/${game.id}` : '/games'}>
                    <Card className={`group relative overflow-hidden transition-all duration-300 cursor-pointer h-full ${game.available ? 'hover:border-primary/50' : 'opacity-60'}`}>
                      <div className="p-8 space-y-6">
                        <div className="flex items-center justify-center h-32">
                          {game.id === '2048' && (
                            <div className="game-icon-2048" style={{ fontSize: '5rem' }}>2048</div>
                          )}
                          {game.id === 'snake' && (
                            <div className={`text-7xl ${!game.available && 'grayscale opacity-50'}`}>🐍</div>
                          )}
                          {game.id === 'tetris' && (
                            <div className={`text-7xl ${!game.available && 'grayscale opacity-50'}`}>🧩</div>
                          )}
                          {game.id === 'memory-match' && (
                            <div className={`text-7xl ${!game.available && 'grayscale opacity-50'}`}>🎴</div>
                          )}
                        </div>
                        <div className="space-y-3 text-center">
                          <div className="flex items-center justify-between">
                            <h3 className="text-2xl">{game.title}</h3>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${game.available ? 'bg-success/10 text-success border border-success/20' : 'bg-warning/10 text-warning border border-warning/20'}`}>
                              {game.available ? 'LIVE' : 'SOON'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {game.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center pt-8"
            >
              <Link href="/games">
                <button className="group relative px-10 py-4 text-lg border border-white/10 bg-white/[0.02] text-white/70 overflow-hidden">
                  <span className="relative z-10 transition-colors duration-300 group-hover:text-white">
                    View All Games
                  </span>
                  <div className="absolute inset-0 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                </button>
              </Link>
            </motion.div>
          </div>
        </Container>
      </section>

      {}
      <footer className="py-16 border-t border-border/50">
        <Container>
          <div className="flex flex-col items-center gap-6">
            <div className="relative h-20 w-64">
              <Image
                src="/ink_mini_games_filled_logo.png"
                alt="Ink Mini Games"
                fill
                className="object-contain"
              />
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Built on <span className="text-foreground font-medium">Ink</span>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  )
}
