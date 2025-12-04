'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { toHex, decodeEventLog, encodeAbiParameters, stringToHex, type Abi } from 'viem'
import { toast } from 'sonner'
import { Navbar } from '@/components/layout/Navbar'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { GameBoard } from '@/components/games/tetris/GameBoard'
import { HowToPlayModal } from '@/components/ui/HowToPlayModal'
import { FullscreenButton } from '@/components/ui/FullscreenButton'
import {
  GameState,
  Direction,
  initializeGame,
  makeMove,
} from '@/lib/games/tetris'
import TetrisABIJson from '@/lib/web3/TetrisABI.json'
import { saveScoreWithVerification } from '@/lib/supabase/client'

const TetrisABI = TetrisABIJson as Abi
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TETRIS_CONTRACT_ADDRESS as `0x${string}`

type TransactionState = 'idle' | 'pending' | 'confirming' | 'success' | 'error'

const MOVE_MAP: { [key in Direction]: number } = {
  'LEFT': 1,
  'RIGHT': 2,
  'DOWN': 3,
  'ROTATE_CW': 4,
  'HARD_DROP': 5,
  'ROTATE_CCW': 6,
}

function encodeMoves(moves: Direction[]): Uint8Array {
  return new Uint8Array(moves.map(move => MOVE_MAP[move]))
}

export default function TetrisPage() {
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

  const dropIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastDropTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    const fetchGameFee = async () => {
      if (!publicClient) return

      try {
        const fee = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: TetrisABI,
          functionName: 'gameFee',
          args: [],
        }) as bigint

        setGameFee(fee)
      } catch (error) {
      }
    }

    fetchGameFee()
  }, [publicClient])

  useEffect(() => {
    if (!gameStarted || !gameState || gameState.gameOver) {
      if (dropIntervalRef.current) {
        clearInterval(dropIntervalRef.current)
        dropIntervalRef.current = null
      }
      return
    }

    const dropSpeed = Math.max(100, 1000 - (gameState.level - 1) * 100)

    dropIntervalRef.current = setInterval(() => {
      const now = Date.now()
      if (now - lastDropTimeRef.current >= dropSpeed) {
        setGameState(prev => prev ? makeMove(prev, 'DOWN') : prev)
        lastDropTimeRef.current = now
      }
    }, 50)

    return () => {
      if (dropIntervalRef.current) {
        clearInterval(dropIntervalRef.current)
        dropIntervalRef.current = null
      }
    }
  }, [gameStarted, gameState])

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
    resetWrite()

    const seed = Date.now().toString()
    const newGameState = initializeGame(parseInt(seed))

    setPendingGameState(newGameState)
    setLastAction('start')
    setStartTxState('pending')

    try {
      toast.loading('Confirm transaction in wallet...', { id: 'start-game' })

      const seedHex = stringToHex(seed)
      const encodedSeed = encodeAbiParameters(
        [{ type: 'bytes' }],
        [seedHex]
      )

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: TetrisABI,
        functionName: 'startGame',
        args: [encodedSeed],
        value: gameFee || BigInt(0),
      })
    } catch (error: any) {
      toast.error(error?.message || 'Failed to start game', { id: 'start-game' })
      setPendingGameState(null)
      setStartTxState('error')
    }
  }, [isConnected, address, writeContract, resetWrite, gameFee])

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
        abi: TetrisABI,
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
    const getGameId = async () => {
      if (isConfirmed && lastAction === 'start' && txHash && pendingGameState && !gameStarted && publicClient) {
        try {
          const receipt = await publicClient.getTransactionReceipt({ hash: txHash })

          for (const log of receipt.logs) {
            try {
              const decoded = decodeEventLog({
                abi: TetrisABI,
                data: log.data,
                topics: log.topics,
              }) as any

              if (decoded.eventName === 'GameStarted') {
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
        } catch (error) {
          toast.error('Failed to get game ID', { id: 'start-game' })
        }
      }
    }

    getGameId()
  }, [isConfirmed, lastAction, txHash, pendingGameState, gameStarted, resetWrite, publicClient])

  useEffect(() => {
    const saveToDatabase = async () => {
      if (isConfirmed && lastAction === 'submit' && gameState && address && activeGameId && txHash) {
        setSubmitTxState('success')
        toast.success(`Score submitted: ${gameState.score.toLocaleString()}!`, { id: 'submit-game' })

        setIsSavingToDb(true)
        const result = await saveScoreWithVerification({
          wallet_address: address.toLowerCase(),
          game_type: 'tetris',
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
      } else if (lastAction === 'submit') {
        setSubmitTxState('error')
        toast.error(errorMsg, { id: 'submit-game' })
      }
    }
  }, [writeError, isConfirmError, lastAction])

  useEffect(() => {
    if (!gameStarted || !gameState || gameState.gameOver) return

    const handleKeyDown = (e: KeyboardEvent) => {
      let direction: Direction | null = null

      switch (e.key) {
        case 'ArrowLeft':
          direction = 'LEFT'
          break
        case 'ArrowRight':
          direction = 'RIGHT'
          break
        case 'ArrowDown':
          direction = 'DOWN'
          lastDropTimeRef.current = Date.now()
          break
        case 'ArrowUp':
          direction = 'ROTATE_CW'
          break
        case ' ':
          direction = 'HARD_DROP'
          lastDropTimeRef.current = Date.now()
          break
        case 'z':
        case 'Z':
          direction = 'ROTATE_CCW'
          break
      }

      if (direction) {
        e.preventDefault()
        const newState = makeMove(gameState, direction)
        setGameState(newState)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameStarted, gameState])

  const isStarting = startTxState === 'pending' || startTxState === 'confirming'
  const isSubmitting = submitTxState === 'pending' || submitTxState === 'confirming'

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
              Tetris
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Clear lines and rack up points in this classic puzzle game!
            </p>
            <Button onClick={() => setShowHowToPlay(true)} variant="outline">
              How to Play
            </Button>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-12 items-start justify-center max-w-7xl mx-auto">
            <div className="flex-1 flex flex-col items-center">
              {gameState && gameStarted ? (
                <GameBoard
                  gameState={gameState}
                  onNewGame={startNewGame}
                  onSubmit={submitGame}
                />
              ) : isStarting ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-[400px]">
                  <Card className="aspect-[1/2] flex items-center justify-center border-primary/30">
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-[400px]">
                  <Card className="aspect-[1/2] flex items-center justify-center">
                    <div className="text-center p-8">
                      <h3 className="text-3xl mb-6 gradient-text">Ready to Play?</h3>
                      {gameFee && (
                        <p className="text-lg text-muted-foreground mb-8 max-w-sm mx-auto">
                          Start a new game for {(Number(gameFee) / 1e18).toFixed(4)} ETH
                        </p>
                      )}
                      <Button onClick={startNewGame} disabled={!isConnected || isStarting || !gameFee} size="lg">
                        {!isConnected ? 'Connect Wallet' : !gameFee ? 'Loading...' : 'Start Game'}
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
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">MOVES</h3>
                <div className="text-5xl text-accent">
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
                      <span className="font-mono font-bold text-accent">{gameState?.level || 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lines</span>
                      <span className="font-mono font-bold text-primary">{gameState?.lines || 0}</span>
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
        title="How to Play Tetris"
        onPlay={startNewGame}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <strong className="text-foreground">Move and rotate pieces</strong>
              <p className="text-muted-foreground">Use arrow keys to move pieces left/right/down, or rotate them clockwise. Press Z to rotate counter-clockwise</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <strong className="text-foreground">Clear lines for points</strong>
              <p className="text-muted-foreground">Complete horizontal lines to clear them. Clearing multiple lines at once gives bonus points!</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              3
            </div>
            <div>
              <strong className="text-foreground">Level up for faster speed</strong>
              <p className="text-muted-foreground">Every 10 lines cleared increases your level. Higher levels mean faster falling pieces and higher scores</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              4
            </div>
            <div>
              <strong className="text-foreground">Don't let pieces stack to the top</strong>
              <p className="text-muted-foreground">Game over when a new piece can't be placed. Plan your moves and keep the board clear!</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              5
            </div>
            <div>
              <strong className="text-foreground">Submit your score</strong>
              <p className="text-muted-foreground">When you're done, submit your score on-chain to compete on the leaderboard</p>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
            <h3 className="font-semibold mb-3">Keyboard Controls</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex gap-1">
                  <kbd className="min-w-[40px] h-10 flex items-center justify-center rounded-lg border-2 bg-background border-border font-mono text-lg font-bold shadow-sm">
                    ←
                  </kbd>
                  <kbd className="min-w-[40px] h-10 flex items-center justify-center rounded-lg border-2 bg-background border-border font-mono text-lg font-bold shadow-sm">
                    →
                  </kbd>
                </div>
                <span className="text-sm text-muted-foreground">Move left/right</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <kbd className="min-w-[40px] h-10 flex items-center justify-center rounded-lg border-2 bg-background border-border font-mono text-lg font-bold shadow-sm">
                  ↓
                </kbd>
                <span className="text-sm text-muted-foreground">Move down (soft drop)</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <kbd className="min-w-[40px] h-10 flex items-center justify-center rounded-lg border-2 bg-background border-border font-mono text-lg font-bold shadow-sm">
                  ↑
                </kbd>
                <span className="text-sm text-muted-foreground">Rotate clockwise</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <kbd className="min-w-[40px] h-10 flex items-center justify-center rounded-lg border-2 bg-background border-border font-mono text-base font-bold shadow-sm">
                  Z
                </kbd>
                <span className="text-sm text-muted-foreground">Rotate counter-clockwise</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <kbd className="min-w-[40px] h-10 flex items-center justify-center rounded-lg border-2 bg-background border-border font-mono text-lg shadow-sm">
                  SPACE
                </kbd>
                <span className="text-sm text-muted-foreground">Hard drop (instant)</span>
              </div>
            </div>
          </div>
        </div>
      </HowToPlayModal>

      {/* Database Saving Overlay */}
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
