'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { toHex, decodeEventLog, encodeAbiParameters, type Abi } from 'viem'
import { toast } from 'sonner'
import { Navbar } from '@/components/layout/Navbar'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { GameBoard } from '@/components/games/puzzle/GameBoard'
import { HowToPlayModal } from '@/components/ui/HowToPlayModal'
import { FullscreenButton } from '@/components/ui/FullscreenButton'
import {
  GameState,
  Level,
  initializeGame,
  makeMove,
  puzzleToArray,
  encodeMoves,
  LEVEL_CONFIG,
  fetchPuzzleImages,
} from '@/lib/games/puzzle'
import PuzzleABIJson from '@/lib/web3/PuzzleABI.json'
import { saveScoreWithVerification } from '@/lib/supabase/client'

const PuzzleABI = PuzzleABIJson as Abi
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PUZZLE_CONTRACT_ADDRESS as `0x${string}`

type TransactionState = 'idle' | 'pending' | 'confirming' | 'success' | 'error'

export default function PuzzlePage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { writeContract, data: txHash, isPending, error: writeError, reset: resetWrite } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError } = useWaitForTransactionReceipt({ hash: txHash })

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [pendingGameState, setPendingGameState] = useState<GameState | null>(null)
  const [startTxState, setStartTxState] = useState<TransactionState>('idle')
  const [submitTxState, setSubmitTxState] = useState<TransactionState>('idle')
  const [lastAction, setLastAction] = useState<'start' | 'submit' | null>(null)
  const [activeGameId, setActiveGameId] = useState<bigint | null>(null)
  const [gameFee, setGameFee] = useState<bigint | null>(null)
  const [showHowToPlay, setShowHowToPlay] = useState(true)
  const [isSavingToDb, setIsSavingToDb] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<Level>(2)
  const [processedTxHash, setProcessedTxHash] = useState<string | null>(null)

  useEffect(() => {
    fetchPuzzleImages()
  }, [])

  useEffect(() => {
    const fetchGameFee = async () => {
      if (!publicClient || !CONTRACT_ADDRESS) {
        setGameFee(null)
        return
      }

      try {
        const fee = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: PuzzleABI,
          functionName: 'gameFee',
          args: [],
        }) as bigint

        setGameFee(fee)
      } catch (error) {
        setGameFee(null)
      }
    }

    fetchGameFee()
  }, [publicClient])

  const startNewGame = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first')
      return
    }

    setGameState(null)
    setGameStarted(false)
    setPendingGameState(null)
    setStartTxState('idle')
    setSubmitTxState('idle')
    setActiveGameId(null)
    setProcessedTxHash(null)
    resetWrite()

    const seed = Date.now()
    const newGameState = initializeGame(seed, selectedLevel)

    setPendingGameState(newGameState)
    setLastAction('start')
    setStartTxState('pending')

    try {
      if (!CONTRACT_ADDRESS) {
        toast.error('Contract address not configured', { id: 'start-game' })
        setPendingGameState(null)
        setStartTxState('error')
        return
      }

      toast.loading('Confirm transaction in wallet...', { id: 'start-game' })

      const puzzleArray = puzzleToArray(newGameState)
      const encodedPuzzle = encodeAbiParameters(
        [{ type: 'uint256[]' }],
        [puzzleArray.map(n => BigInt(n))]
      )

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: PuzzleABI,
        functionName: 'startGame',
        args: [encodedPuzzle],
        value: gameFee || BigInt(0),
      })
    } catch (error: any) {
      toast.error(error?.message || 'Failed to start game', { id: 'start-game' })
      setPendingGameState(null)
      setStartTxState('error')
      setLastAction(null)
    }
  }, [isConnected, address, writeContract, resetWrite, gameFee, selectedLevel])

  const submitGame = useCallback(async () => {
    if (!gameState || !isConnected || !address || !activeGameId) {
      toast.error('No active game to submit')
      return
    }

    setLastAction('submit')
    setSubmitTxState('pending')

    try {
      toast.loading('Confirm transaction in wallet...', { id: 'submit-game' })

      const movesEncoded = encodeMoves(gameState.moves)
      const movesHex = toHex(movesEncoded)

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: PuzzleABI,
        functionName: 'submitGame',
        args: [activeGameId, BigInt(gameState.score), movesHex],
      })
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit game', { id: 'submit-game' })
      setSubmitTxState('error')
    }
  }, [gameState, isConnected, address, writeContract, activeGameId])

  useEffect(() => {
    if (isPending && lastAction === 'start') {
      setStartTxState('confirming')
      toast.loading('Transaction submitted...', { id: 'start-game' })
    } else if (isPending && lastAction === 'submit') {
      setSubmitTxState('confirming')
      toast.loading('Transaction submitted...', { id: 'submit-game' })
    }
  }, [isPending, lastAction])

  useEffect(() => {
    if (isConfirming && lastAction === 'start') {
      toast.loading('Waiting for confirmation...', { id: 'start-game' })
    }
  }, [isConfirming, lastAction])

  useEffect(() => {
    const getGameId = async () => {
      if (isConfirmed && lastAction === 'start' && txHash && pendingGameState && publicClient && processedTxHash !== txHash) {
        setProcessedTxHash(txHash)
        toast.loading('Loading game...', { id: 'start-game' })
        try {
          const receipt = await publicClient.getTransactionReceipt({ hash: txHash })

          let eventFound = false
          for (const log of receipt.logs) {
            if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
              continue
            }

            try {
              const decoded = decodeEventLog({
                abi: PuzzleABI,
                data: log.data,
                topics: log.topics,
              }) as any

              if (decoded.eventName === 'GameStarted') {
                eventFound = true
                const gameId = decoded.args.gameId

                setActiveGameId(gameId)
                setGameState(pendingGameState)
                setGameStarted(true)
                setPendingGameState(null)
                setStartTxState('success')
                toast.success(`Game #${gameId.toString()} started!`, { id: 'start-game' })
                setLastAction(null)
                resetWrite()
                break
              }
            } catch (e) {
            }
          }

          if (!eventFound) {
            toast.error('Failed to start game', { id: 'start-game' })
            setStartTxState('error')
            setPendingGameState(null)
            setLastAction(null)
          }
        } catch (error) {
          toast.error('Failed to get game ID', { id: 'start-game' })
          setStartTxState('error')
          setPendingGameState(null)
          setLastAction(null)
        }
      }
    }

    getGameId()
  }, [isConfirmed, lastAction, txHash, pendingGameState, resetWrite, publicClient, processedTxHash])

  useEffect(() => {
    const saveToDatabase = async () => {
      if (isConfirmed && lastAction === 'submit' && gameState && address && activeGameId && txHash) {
        setSubmitTxState('success')
        toast.success(`Score submitted: ${gameState.score.toLocaleString()}!`, { id: 'submit-game' })

        setIsSavingToDb(true)
        const result = await saveScoreWithVerification({
          wallet_address: address.toLowerCase(),
          game_type: 'puzzle',
          game_id_onchain: Number(activeGameId),
          score: gameState.score,
          transaction_hash: txHash,
        })

        setIsSavingToDb(false)

        if (result.success) {
          toast.success('Score saved to database!', { id: 'save-db' })
        } else {
          toast.error(result.error || 'Failed to save score to database', { id: 'save-db' })
        }

        setTimeout(() => {
          setGameStarted(false)
          setGameState(null)
          setActiveGameId(null)
          setLastAction(null)
          resetWrite()
        }, 2000)
      }
    }

    saveToDatabase()
  }, [isConfirmed, lastAction, gameState, address, activeGameId, txHash, resetWrite])

  useEffect(() => {
    if ((writeError || isConfirmError) && lastAction) {
      const error: any = writeError || isConfirmError
      let errorMsg = 'Transaction failed'

      if (error?.message?.includes('User rejected')) {
        errorMsg = 'Transaction rejected'
      } else if (error?.message?.includes('insufficient')) {
        errorMsg = 'Insufficient funds'
      }

      if (lastAction === 'start') {
        setStartTxState('error')
        setPendingGameState(null)
        toast.error(errorMsg, { id: 'start-game' })
        setLastAction(null)
        resetWrite()
      } else if (lastAction === 'submit') {
        setSubmitTxState('error')
        toast.error(errorMsg, { id: 'submit-game' })
        setLastAction(null)
        resetWrite()
      }
    }
  }, [writeError, isConfirmError, lastAction, resetWrite])

  const handlePieceMove = useCallback((pieceId: number, toRow: number, toCol: number) => {
    if (!gameState || gameState.gameOver) return

    const piece = gameState.pieces.find(p => p.id === pieceId)
    if (!piece) return

    const move = {
      pieceId,
      fromRow: piece.currentRow,
      fromCol: piece.currentCol,
      toRow,
      toCol,
    }

    const newState = makeMove(gameState, move)
    setGameState(newState)
  }, [gameState])

  const isStarting = startTxState === 'pending' || startTxState === 'confirming'
  const isSubmitting = submitTxState === 'pending' || submitTxState === 'confirming'

  const config = gameState ? LEVEL_CONFIG[gameState.level] : LEVEL_CONFIG[selectedLevel]
  const placedPieces = gameState?.pieces.filter(p => p.isPlaced).length || 0

  return (
    <div className="min-h-screen">
      <Navbar />
      <FullscreenButton />

      <Container>
        <div className="py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-6xl mb-4 gradient-text">
              Puzzle
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Drag and drop pieces to complete the puzzle!
            </p>
            <Button onClick={() => setShowHowToPlay(true)} variant="outline">
              How to Play
            </Button>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-12 items-start justify-center max-w-7xl mx-auto">
            <div className="flex-1 flex flex-col items-center w-full">
              {gameState && gameStarted ? (
                <GameBoard
                  gameState={gameState}
                  onPieceMove={handlePieceMove}
                  gameOver={gameState.gameOver}
                  won={gameState.won}
                  score={gameState.score}
                  onSubmit={submitGame}
                  onNewGame={startNewGame}
                />
              ) : isStarting ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-2xl">
                  <Card className="aspect-square flex items-center justify-center border-primary/30">
                    <div className="text-center p-8">
                      <div className="mb-6 flex justify-center">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                      <h3 className="text-2xl mb-4 gradient-text">
                        {startTxState === 'confirming' ? 'Confirming...' : 'Starting...'}
                      </h3>
                      <p className="text-muted-foreground">
                        {startTxState === 'confirming' ? 'Waiting for confirmation' : 'Confirm in wallet'}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-2xl">
                  <Card className="aspect-square flex items-center justify-center">
                    <div className="text-center p-8">
                      <h3 className="text-3xl mb-6 gradient-text">Ready to Play?</h3>

                      <div className="mb-8">
                        <h4 className="text-lg font-semibold mb-4">Select Difficulty</h4>
                        <div className="flex justify-center gap-4">
                          {([1, 2, 3] as Level[]).map((level) => {
                            const levelConfig = LEVEL_CONFIG[level]
                            return (
                              <button
                                key={level}
                                onClick={() => setSelectedLevel(level)}
                                className={`px-6 py-4 rounded-xl border-2 transition-all duration-200 ${
                                  selectedLevel === level
                                    ? 'bg-primary border-primary text-white scale-105'
                                    : 'border-border hover:border-primary/50'
                                }`}
                              >
                                <div className="text-xl font-bold">Level {level}</div>
                                <div className="text-sm opacity-80">{levelConfig.rows}x{levelConfig.cols} Grid</div>
                                <div className="text-xs opacity-60">{levelConfig.pieces} Pieces</div>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {gameFee !== null && gameFee > BigInt(0) && (
                        <p className="text-lg text-muted-foreground mb-8 max-w-sm mx-auto">
                          Start a new game for {(Number(gameFee) / 1e18).toFixed(4)} ETH
                        </p>
                      )}
                      <Button onClick={startNewGame} disabled={!isConnected || isStarting || gameFee === null} size="lg">
                        {!isConnected ? 'Connect Wallet' : gameFee === null ? 'Loading...' : 'Start Game'}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="w-full lg:w-80 space-y-6">
              <Card className="p-6 border-primary/30">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">SCORE</h3>
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

              <Card className="p-6 border-success/30">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">MOVES</h3>
                <div className="text-5xl text-success">
                  {gameState?.moves.length || 0}
                </div>
              </Card>

              {gameStarted && activeGameId && (
                <Card className="p-6">
                  <h3 className="text-lg mb-4">Game Info</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Game ID</span>
                      <span className="font-mono font-medium">#{activeGameId.toString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className={`font-medium px-2 py-1 rounded text-xs ${gameState?.gameOver ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'}`}>
                        {gameState?.gameOver ? 'Ended' : 'Active'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Level</span>
                      <span className="font-medium">{gameState?.level}</span>
                    </div>
                  </div>
                </Card>
              )}
            </motion.div>
          </div>
        </div>
      </Container>

      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
        title="How to Play Jigsaw Puzzle"
        onPlay={startNewGame}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <strong className="text-foreground">Choose your difficulty</strong>
              <p className="text-muted-foreground">
                <strong className="text-green-500">Level 1</strong>: 3x3 grid (9 pieces, 1000 base pts)<br />
                <strong className="text-yellow-500">Level 2</strong>: 4x4 grid (16 pieces, 2000 base pts)<br />
                <strong className="text-red-500">Level 3</strong>: 5x5 grid (25 pieces, 3000 base pts)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <strong className="text-foreground">Drag pieces from the tray</strong>
              <p className="text-muted-foreground">Pieces start scrambled in the tray below the puzzle board</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              3
            </div>
            <div>
              <strong className="text-foreground">Drop pieces in correct positions</strong>
              <p className="text-muted-foreground">Pieces will highlight green when placed correctly and lock in place</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              4
            </div>
            <div>
              <strong className="text-foreground">Scoring system</strong>
              <p className="text-muted-foreground">
                Base: <strong className="text-primary">Level-based pts</strong><br />
                Time bonus: up to 500 pts (faster is better)<br />
                Move bonus: fewer moves = higher score
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              5
            </div>
            <div>
              <strong className="text-foreground">Complete the puzzle</strong>
              <p className="text-muted-foreground">Place all pieces correctly to finish. Submit your score on-chain to compete!</p>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
            <h3 className="font-semibold mb-3">Game Features</h3>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>Real jigsaw puzzle piece shapes with tabs and blanks</li>
              <li>Smooth drag and drop mechanics</li>
              <li>Beautiful gradient patterns</li>
              <li>Pieces lock when placed correctly</li>
            </ul>
          </div>
        </div>
      </HowToPlayModal>

      {isSavingToDb && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-card border-2 border-primary/30 rounded-2xl p-8 max-w-md mx-4 text-center"
          >
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <h3 className="text-2xl mb-4 gradient-text font-bold">
              Saving to Database
            </h3>
            <p className="text-muted-foreground">
              Please wait while we save your score to the database. Don't close this page!
            </p>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
