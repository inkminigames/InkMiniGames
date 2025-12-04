'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import { usePublicClient } from 'wagmi'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GameBoard } from '@/components/games/snake/GameBoard'
import {
  GameState,
  Direction,
  initializeGame,
  makeMove,
  autoMove,
  decodeMoves,
} from '@/lib/games/snake'
import SnakeABI from '@/lib/web3/SnakeABI.json'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SNAKE_CONTRACT_ADDRESS as `0x${string}`

export default function SnakeReplayPage() {
  const params = useParams()
  const gameId = params.gameId as string
  const publicClient = usePublicClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [allMoves, setAllMoves] = useState<Direction[]>([])
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(200)
  const [moveQueue, setMoveQueue] = useState<Direction[]>([])

  useEffect(() => {
    const fetchGameData = async () => {
      if (!publicClient || !gameId) return

      try {
        setLoading(true)
        setError(null)

        const result = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: SnakeABI,
          functionName: 'getGameSessionWithState',
          args: [BigInt(gameId)],
        }) as any

        const [player, initialStateBytes, startTime, endTime, finalScore, movesBytes, state] = result

        if (player === '0x0000000000000000000000000000000000000000') {
          throw new Error('Game not found or does not exist')
        }

        const seed = Number(initialStateBytes)

        const moves = decodeMoves(movesBytes)
        setAllMoves(moves)
        setMoveQueue(moves)

        const initialState = initializeGame(seed)
        setGameState(initialState)

        setLoading(false)
      } catch (err: any) {
        if (err.message?.includes('reverted') || err.message?.includes('Game not found')) {
          setError(`Game #${gameId} not found on blockchain. This game may not have been submitted on-chain.`)
        } else {
          setError(err.message || 'Failed to load game replay')
        }
        setLoading(false)
      }
    }

    fetchGameData()
  }, [publicClient, gameId])

  useEffect(() => {
    if (!isPlaying || !gameState || gameState.gameOver) {
      return
    }

    const timer = setTimeout(() => {
      if (moveQueue.length > 0 && currentMoveIndex < allMoves.length) {
        const nextMove = moveQueue[0]
        const newState = makeMove(gameState, nextMove)

        setMoveQueue(queue => queue.slice(1))
        setCurrentMoveIndex(idx => idx + 1)
        setGameState(newState)
        return
      }

      setGameState(prevState => {
        if (!prevState || prevState.gameOver) return prevState
        return autoMove(prevState)
      })
    }, playbackSpeed)

    return () => clearTimeout(timer)
  }, [isPlaying, gameState, playbackSpeed, moveQueue, currentMoveIndex, allMoves.length])

  const handleStepForward = () => {
    if (!gameState) return

    if (currentMoveIndex < allMoves.length) {
      const nextMove = allMoves[currentMoveIndex]
      const newState = makeMove(gameState, nextMove)
      setGameState(newState)
      setCurrentMoveIndex(currentMoveIndex + 1)
      setMoveQueue(queue => queue.slice(1))
    } else if (!gameState.gameOver) {
      const newState = autoMove(gameState)
      setGameState(newState)
    }
  }

  const handleStepBackward = () => {
    if (!gameState || currentMoveIndex === 0) return
    let state = initializeGame(gameState.seed)

    for (let i = 0; i < currentMoveIndex - 1; i++) {
      state = makeMove(state, allMoves[i])
    }
    setGameState(state)
    setCurrentMoveIndex(currentMoveIndex - 1)
    setMoveQueue(allMoves.slice(currentMoveIndex - 1))
  }

  const handleReset = () => {
    if (!gameState) return
    const initialState = initializeGame(gameState.seed)
    setGameState(initialState)
    setCurrentMoveIndex(0)
    setMoveQueue(allMoves)
    setIsPlaying(false)
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
              <h1 className="text-5xl md:text-6xl mb-6 gradient-text">Loading Replay...</h1>
              <div className="flex justify-center mt-12">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </motion.div>
          </div>
        </Container>
      </div>
    )
  }

  if (error) {
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
              <h1 className="text-5xl md:text-6xl mb-6 gradient-text">Error</h1>
              <p className="text-xl text-muted-foreground mb-8">{error}</p>
              <Link href="/replay">
                <Button>Back to Game History</Button>
              </Link>
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
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-6xl mb-4 gradient-text">
              Snake Replay
            </h1>
            <p className="text-lg text-muted-foreground">
              Game #{gameId}
            </p>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-12 items-start justify-center max-w-7xl mx-auto">
            <div className="flex-1 flex flex-col items-center relative">
              {gameState && (
                <>
                  <GameBoard
                    gameState={gameState}
                    gameOver={gameState.gameOver}
                    score={gameState.score}
                    onNewGame={() => {}}
                    onSubmit={() => {}}
                    isReplay={true}
                  />

                  {currentMoveIndex >= allMoves.length && gameState.gameOver && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm rounded-2xl z-10"
                    >
                      <motion.div
                        initial={{ scale: 0.8, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        className="text-center p-8"
                      >
                        <h2 className="text-5xl mb-6 gradient-text font-bold">
                          Replay Complete!
                        </h2>
                        <div className="space-y-2 mb-8">
                          <p className="text-2xl text-foreground">
                            Final Score: <span className="font-bold text-primary">{gameState.score}</span>
                          </p>
                          <p className="text-xl text-muted-foreground">
                            Length: {gameState.snake.length} • Level: {gameState.level}
                          </p>
                        </div>
                        <button
                          onClick={handleReset}
                          className="px-8 py-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105"
                        >
                          Watch Again
                        </button>
                      </motion.div>
                    </motion.div>
                  )}
                </>
              )}
            </div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="w-full lg:w-80 space-y-6">
              <Card className="p-6">
                <h3 className="text-lg mb-4">Replay Controls</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      onClick={handleReset}
                      disabled={currentMoveIndex === 0}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Reset
                    </Button>
                    <Button
                      onClick={handleStepBackward}
                      disabled={currentMoveIndex === 0}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      ← Step
                    </Button>
                    <Button
                      onClick={() => setIsPlaying(!isPlaying)}
                      disabled={!gameState || gameState.gameOver}
                      size="sm"
                      className="flex-1"
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </Button>
                    <Button
                      onClick={handleStepForward}
                      disabled={!gameState || gameState.gameOver}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Step →
                    </Button>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Playback Speed: {playbackSpeed}ms
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="1000"
                      step="50"
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Moves: {currentMoveIndex} / {allMoves.length}
                    </div>
                    {currentMoveIndex >= allMoves.length && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="px-3 py-2 bg-green-500/20 text-green-500 rounded font-semibold border border-green-500/50">
                          ✓ End of Replay
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-primary/30">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">SCORE</h3>
                <div className="text-5xl gradient-text">
                  {gameState?.score.toLocaleString() || 0}
                </div>
              </Card>

              <Card className="p-6 border-accent/30">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">LEVEL</h3>
                <div className="text-5xl text-accent">
                  {gameState?.level || 1}
                </div>
              </Card>

              <Card className="p-6">
                <Link href="/replay">
                  <Button className="w-full">Back to Game History</Button>
                </Link>
              </Card>
            </motion.div>
          </div>
        </div>
      </Container>
    </div>
  )
}
