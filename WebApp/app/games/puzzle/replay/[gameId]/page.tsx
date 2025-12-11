'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import { usePublicClient } from 'wagmi'
import { type Abi, decodeAbiParameters } from 'viem'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Container } from '@/components/ui/Container'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GameBoard } from '@/components/games/puzzle/GameBoard'
import {
  GameState,
  Move,
  arrayToPuzzle,
  makeMove,
  decodeMoves,
  LEVEL_CONFIG,
  Level,
  fetchPuzzleImages,
} from '@/lib/games/puzzle'
import PuzzleABIJson from '@/lib/web3/PuzzleABI.json'

const PuzzleABI = PuzzleABIJson as Abi
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PUZZLE_CONTRACT_ADDRESS as `0x${string}`

export default function PuzzleReplayPage() {
  const params = useParams()
  const gameId = params.gameId as string
  const publicClient = usePublicClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [initialGameState, setInitialGameState] = useState<GameState | null>(null)
  const [allMoves, setAllMoves] = useState<Move[]>([])
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(500)
  const [lastMove, setLastMove] = useState<Move | null>(null)

  useEffect(() => {
    fetchPuzzleImages()
  }, [])

  useEffect(() => {
    const fetchGameData = async () => {
      if (!publicClient || !gameId) return

      try {
        setLoading(true)
        setError(null)

        const result = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: PuzzleABI,
          functionName: 'getGameSessionWithPuzzle',
          args: [BigInt(gameId)],
        }) as any

        const [player, initialPuzzleData, startTime, endTime, finalScore, movesBytes, state] = result

        if (player === '0x0000000000000000000000000000000000000000') {
          throw new Error('Game not found or does not exist')
        }

        let puzzleArray: number[] = []

        if (typeof initialPuzzleData === 'string' && initialPuzzleData.startsWith('0x')) {
          try {
            const decoded = decodeAbiParameters(
              [{ type: 'uint256[]' }],
              initialPuzzleData as `0x${string}`
            )
            const decodedArray = decoded[0] as readonly bigint[]
            puzzleArray = decodedArray.map((n: bigint) => Number(n))
          } catch (decodeError) {
            throw new Error('Failed to decode puzzle data from blockchain')
          }
        } else if (Array.isArray(initialPuzzleData)) {
          puzzleArray = (initialPuzzleData as bigint[]).map(n => Number(n))
        }

        if (puzzleArray.length === 0) {
          throw new Error('No puzzle data found for this game')
        }

        const seed = Number(startTime)

        let level: Level = 2
        const pieceCount = (puzzleArray.length - 1) / 3
        if (pieceCount <= 9) level = 1
        else if (pieceCount <= 16) level = 2
        else level = 3

        const moves = decodeMoves(movesBytes)
        setAllMoves(moves)

        const initialState = arrayToPuzzle(puzzleArray, level, seed)
        setInitialGameState(initialState)
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
    if (!isPlaying || !gameState || currentMoveIndex >= allMoves.length) {
      setIsPlaying(false)
      return
    }

    const timer = setTimeout(() => {
      const nextMove = allMoves[currentMoveIndex]
      setLastMove(nextMove)
      const newState = makeMove(gameState, nextMove)
      setGameState(newState)
      setCurrentMoveIndex(currentMoveIndex + 1)
    }, playbackSpeed)

    return () => clearTimeout(timer)
  }, [isPlaying, gameState, currentMoveIndex, allMoves, playbackSpeed])

  const handleStepForward = () => {
    if (!gameState || currentMoveIndex >= allMoves.length) return
    const nextMove = allMoves[currentMoveIndex]
    setLastMove(nextMove)
    const newState = makeMove(gameState, nextMove)
    setGameState(newState)
    setCurrentMoveIndex(currentMoveIndex + 1)
  }

  const handleStepBackward = () => {
    if (!initialGameState || currentMoveIndex === 0) return

    let state: GameState = {
      ...initialGameState,
      pieces: initialGameState.pieces.map(p => ({ ...p })),
      moves: [],
      score: 0,
      gameOver: false,
      won: false,
    }

    for (let i = 0; i < currentMoveIndex - 1; i++) {
      state = makeMove(state, allMoves[i])
    }
    setGameState(state)
    setCurrentMoveIndex(currentMoveIndex - 1)
  }

  const handleReset = () => {
    if (!initialGameState) return

    setGameState({
      ...initialGameState,
      pieces: initialGameState.pieces.map(p => ({ ...p })),
      moves: [],
      score: 0,
      gameOver: false,
      won: false,
    })
    setCurrentMoveIndex(0)
    setIsPlaying(false)
    setLastMove(null)
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

  const config = gameState ? LEVEL_CONFIG[gameState.level] : LEVEL_CONFIG[2]
  const placedPieces = gameState?.pieces.filter(p => p.isPlaced).length || 0

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
              Puzzle Replay
            </h1>
            <p className="text-lg text-muted-foreground">
              Game #{gameId}
            </p>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-12 items-start justify-center max-w-7xl mx-auto">
            <div className="flex-1 flex flex-col items-center w-full">
              {gameState && (
                <GameBoard
                  gameState={gameState}
                  isReplay={true}
                  disabled={true}
                />
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
                      disabled={currentMoveIndex >= allMoves.length}
                      size="sm"
                      className="flex-1"
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </Button>
                    <Button
                      onClick={handleStepForward}
                      disabled={currentMoveIndex >= allMoves.length}
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
                      min="50"
                      max="2000"
                      step="100"
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Move {currentMoveIndex} / {allMoves.length}
                    </div>
                    {currentMoveIndex >= allMoves.length ? (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="px-3 py-2 bg-green-500/20 text-green-500 rounded font-semibold border border-green-500/50">
                          ✓ End of Replay
                        </span>
                      </div>
                    ) : lastMove && (
                      <div className="flex flex-col gap-2 text-sm">
                        <span className="text-muted-foreground">Current move:</span>
                        <div className="px-3 py-2 bg-primary/20 text-primary rounded font-mono text-xs">
                          Piece {lastMove.pieceId + 1}: ({lastMove.fromRow},{lastMove.fromCol}) → ({lastMove.toRow},{lastMove.toCol})
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-primary/30">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">CURRENT SCORE</h3>
                <div className="text-5xl gradient-text">
                  {gameState?.score.toLocaleString() || 0}
                </div>
              </Card>

              <Card className="p-6 border-accent/30">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">PIECES PLACED</h3>
                <div className="text-5xl text-accent">
                  {placedPieces} / {config.pieces}
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
