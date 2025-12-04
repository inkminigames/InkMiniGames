'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import { usePublicClient } from 'wagmi'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Container } from '@/components/ui/Container'
import { Card as UICard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GameBoard } from '@/components/games/memory-match/GameBoard'
import {
  GameState,
  Card,
  Move,
  arrayToGrid,
  decodeMoves,
} from '@/lib/games/memory-match'
import MemoryMatchArtifact from '@/lib/web3/MemoryMatchABI.json'

const MemoryMatchABI = MemoryMatchArtifact.abi
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_MEMORY_MATCH_CONTRACT_ADDRESS as `0x${string}`

export default function MemoryMatchReplayPage() {
  const params = useParams()
  const gameId = params.gameId as string
  const publicClient = usePublicClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [initialGrid, setInitialGrid] = useState<Card[]>([])
  const [allMoves, setAllMoves] = useState<Move[]>([])
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(800)
  const [finalScore, setFinalScore] = useState(0)
  const [replayComplete, setReplayComplete] = useState(false)

  useEffect(() => {
    const fetchGameData = async () => {
      if (!publicClient || !gameId) return

      try {
        setLoading(true)
        setError(null)

        const result = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: MemoryMatchABI,
          functionName: 'getGameSessionWithGrid',
          args: [BigInt(gameId)],
        }) as any

        const [player, initialGridBytes, startTime, endTime, finalScoreValue, movesBytes, state] = result

        if (player === '0x0000000000000000000000000000000000000000') {
          throw new Error('Game not found or does not exist')
        }

        setFinalScore(Number(finalScoreValue))

        const gridArray: number[] = []
        const gridHex = initialGridBytes.startsWith('0x') ? initialGridBytes.slice(2) : initialGridBytes
        for (let i = 0; i < gridHex.length; i += 2) {
          gridArray.push(parseInt(gridHex.substring(i, i + 2), 16))
        }

        const theme = 'animals'
        const cards = arrayToGrid(gridArray, theme)
        setInitialGrid(cards)

        const moves = decodeMoves(movesBytes)
        setAllMoves(moves)

        const initialState: GameState = {
          cards,
          flippedCards: [],
          matchedPairs: 0,
          attempts: 0,
          maxAttempts: 50,
          score: 0,
          gameOver: false,
          won: false,
          moves: [],
          theme,
          startTime: Date.now(),
          hintsRemaining: 0,
          hintedCards: [],
          level: 3
        }
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

  const processMove = useCallback((state: GameState, cardIndex: number): GameState => {
    if (state.flippedCards.length >= 2) return state
    if (state.cards[cardIndex].isMatched) return state
    if (state.cards[cardIndex].isFlipped) return state

    const newCards = state.cards.map((card, idx) => {
      if (idx === cardIndex) {
        return { ...card, isFlipped: true }
      }
      return card
    })

    const newFlippedCards = [...state.flippedCards, cardIndex]
    const newMoves = [...state.moves, { cardIndex, timestamp: Date.now() }]

    if (newFlippedCards.length === 2) {
      const [first, second] = newFlippedCards
      const firstCard = newCards[first]
      const secondCard = newCards[second]

      if (firstCard.value === secondCard.value) {
        newCards[first] = { ...firstCard, isMatched: true }
        newCards[second] = { ...secondCard, isMatched: true }

        const newMatchedPairs = state.matchedPairs + 1
        const newAttempts = state.attempts + 1
        const baseScore = 100
        const timeBonus = Math.max(0, 50 - Math.floor((Date.now() - state.startTime) / 1000))
        const attemptBonus = Math.max(0, (state.maxAttempts - newAttempts) * 2)
        const newScore = state.score + baseScore + timeBonus + attemptBonus

        const won = newMatchedPairs === 12
        const gameOver = won || newAttempts >= state.maxAttempts

        return {
          ...state,
          cards: newCards,
          flippedCards: [],
          matchedPairs: newMatchedPairs,
          attempts: newAttempts,
          score: newScore,
          won,
          gameOver,
          moves: newMoves
        }
      } else {
        return {
          ...state,
          cards: newCards,
          flippedCards: newFlippedCards,
          attempts: state.attempts + 1,
          moves: newMoves,
          gameOver: state.attempts + 1 >= state.maxAttempts
        }
      }
    }

    return {
      ...state,
      cards: newCards,
      flippedCards: newFlippedCards,
      moves: newMoves
    }
  }, [])

  const unflipMismatchedCards = useCallback((state: GameState): GameState => {
    if (state.flippedCards.length !== 2) return state

    const newCards = state.cards.map(card => {
      if (card.isFlipped && !card.isMatched) {
        return { ...card, isFlipped: false }
      }
      return card
    })

    return {
      ...state,
      cards: newCards,
      flippedCards: []
    }
  }, [])

  useEffect(() => {
    if (!isPlaying || !gameState || replayComplete) {
      return
    }

    if (currentMoveIndex >= allMoves.length) {
      setIsPlaying(false)
      setReplayComplete(true)
      return
    }

    const timer = setTimeout(() => {
      if (currentMoveIndex < allMoves.length) {
        const move = allMoves[currentMoveIndex]

        if (gameState.flippedCards.length === 2) {
          const [first, second] = gameState.flippedCards
          const firstCard = gameState.cards[first]
          const secondCard = gameState.cards[second]

          if (firstCard.value !== secondCard.value) {
            const newState = unflipMismatchedCards(gameState)
            setGameState(newState)
            return
          }
        }

        const newState = processMove(gameState, move.cardIndex)
        setGameState(newState)
        setCurrentMoveIndex(idx => idx + 1)

        if (currentMoveIndex + 1 >= allMoves.length) {
          setReplayComplete(true)
        }
      }
    }, playbackSpeed)

    return () => clearTimeout(timer)
  }, [isPlaying, gameState, playbackSpeed, currentMoveIndex, allMoves, processMove, unflipMismatchedCards, replayComplete])

  const handleStepForward = () => {
    if (!gameState || currentMoveIndex >= allMoves.length) return

    if (gameState.flippedCards.length === 2) {
      const [first, second] = gameState.flippedCards
      const firstCard = gameState.cards[first]
      const secondCard = gameState.cards[second]

      if (firstCard.value !== secondCard.value) {
        const newState = unflipMismatchedCards(gameState)
        setGameState(newState)
        return
      }
    }

    const move = allMoves[currentMoveIndex]
    const newState = processMove(gameState, move.cardIndex)
    setGameState(newState)
    setCurrentMoveIndex(currentMoveIndex + 1)

    if (currentMoveIndex + 1 >= allMoves.length) {
      setReplayComplete(true)
    }
  }

  const handleStepBackward = () => {
    if (!gameState || currentMoveIndex === 0) return

    let state: GameState = {
      cards: initialGrid,
      flippedCards: [],
      matchedPairs: 0,
      attempts: 0,
      maxAttempts: 50,
      score: 0,
      gameOver: false,
      won: false,
      moves: [],
      theme: gameState.theme,
      startTime: gameState.startTime,
      hintsRemaining: 0,
      hintedCards: [],
      level: 3
    }

    for (let i = 0; i < currentMoveIndex - 1; i++) {
      if (state.flippedCards.length === 2) {
        const [first, second] = state.flippedCards
        const firstCard = state.cards[first]
        const secondCard = state.cards[second]

        if (firstCard.value !== secondCard.value) {
          state = unflipMismatchedCards(state)
        }
      }
      state = processMove(state, allMoves[i].cardIndex)
    }

    setGameState(state)
    setCurrentMoveIndex(currentMoveIndex - 1)
    setReplayComplete(false)
  }

  const handleReset = () => {
    if (!gameState) return
    const initialState: GameState = {
      cards: initialGrid,
      flippedCards: [],
      matchedPairs: 0,
      attempts: 0,
      maxAttempts: 50,
      score: 0,
      gameOver: false,
      won: false,
      moves: [],
      theme: gameState.theme,
      startTime: gameState.startTime,
      hintsRemaining: 0,
      hintedCards: [],
      level: 3
    }
    setGameState(initialState)
    setCurrentMoveIndex(0)
    setIsPlaying(false)
    setReplayComplete(false)
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
              Memory Match Replay
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
                    cards={gameState.cards}
                    onCardClick={() => {}}
                    disabled={true}
                    isReplay={true}
                  />

                  {replayComplete && (
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
                            Final Score: <span className="font-bold text-primary">{finalScore}</span>
                          </p>
                          <p className="text-xl text-muted-foreground">
                            Attempts: {gameState.attempts} • Matched Pairs: {gameState.matchedPairs}
                          </p>
                          {gameState.won && (
                            <p className="text-lg text-green-400 mt-2">Victory!</p>
                          )}
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
              <UICard className="p-6">
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
                      disabled={!gameState || replayComplete}
                      size="sm"
                      className="flex-1"
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </Button>
                    <Button
                      onClick={handleStepForward}
                      disabled={!gameState || currentMoveIndex >= allMoves.length}
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
                      max="2000"
                      step="100"
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Moves: {currentMoveIndex} / {allMoves.length}
                    </div>
                    {replayComplete && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="px-3 py-2 bg-green-500/20 text-green-500 rounded font-semibold border border-green-500/50">
                          ✓ End of Replay
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </UICard>

              <UICard className="p-6 border-primary/30">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">SCORE</h3>
                <div className="text-5xl gradient-text">
                  {gameState?.score.toLocaleString() || 0}
                </div>
              </UICard>

              <UICard className="p-6 border-accent/30">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">ATTEMPTS</h3>
                <div className="text-5xl text-accent">
                  {gameState?.attempts || 0}
                </div>
              </UICard>

              <UICard className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">MATCHED PAIRS</h3>
                <div className="text-5xl text-primary">
                  {gameState?.matchedPairs || 0}
                </div>
              </UICard>

              <UICard className="p-6">
                <Link href="/replay">
                  <Button className="w-full">Back to Game History</Button>
                </Link>
              </UICard>
            </motion.div>
          </div>
        </div>
      </Container>
    </div>
  )
}
