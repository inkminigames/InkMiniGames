'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { toHex, decodeEventLog, encodeAbiParameters, type Abi } from 'viem'
import { toast } from 'sonner'
import { Navbar } from '@/components/layout/Navbar'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { GameBoard } from '@/components/games/snake/GameBoard'
import { HowToPlayModal } from '@/components/ui/HowToPlayModal'
import { FullscreenButton } from '@/components/ui/FullscreenButton'
import {
  GameState,
  Direction,
  initializeGame,
  makeMove,
  autoMove,
  encodeMoves,
} from '@/lib/games/snake'
import SnakeABIJson from '@/lib/web3/SnakeABI.json'
import { saveScoreWithVerification } from '@/lib/supabase/client'

const SnakeABI = SnakeABIJson as Abi
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SNAKE_CONTRACT_ADDRESS as `0x${string}`

type TransactionState = 'idle' | 'pending' | 'confirming' | 'success' | 'error'

export default function SnakePage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { writeContract, data: txHash, isPending, error: writeError, reset: resetWrite } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError } = useWaitForTransactionReceipt({ hash: txHash })

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [pendingState, setPendingState] = useState<GameState | null>(null)
  const [startTxState, setStartTxState] = useState<TransactionState>('idle')
  const [submitTxState, setSubmitTxState] = useState<TransactionState>('idle')
  const [lastAction, setLastAction] = useState<'start' | 'submit' | null>(null)
  const [activeGameId, setActiveGameId] = useState<bigint | null>(null)
  const [gameFee, setGameFee] = useState<bigint | null>(null)
  const [showHowToPlay, setShowHowToPlay] = useState(true)
  const [isSavingToDb, setIsSavingToDb] = useState(false)
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const fetchGameFee = async () => {
      if (!publicClient) return

      try {
        const fee = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: SnakeABI,
          functionName: 'gameFee',
          args: [],
        }) as bigint

        setGameFee(fee)
      } catch (error) {
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
    setPendingState(null)
    setStartTxState('idle')
    setSubmitTxState('idle')
    setActiveGameId(null)
    resetWrite()

    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current)
      gameLoopRef.current = null
    }

    const seed = Date.now()
    const initialState = initializeGame(seed)

    setPendingState(initialState)

    setLastAction('start')
    setStartTxState('pending')

    try {
      toast.loading('Confirm transaction in wallet...', { id: 'start-game' })

      const seedString = seed.toString()
      const encodedSeed = encodeAbiParameters(
        [{ type: 'string' }],
        [seedString]
      )

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: SnakeABI,
        functionName: 'startGame',
        args: [encodedSeed],
        value: gameFee || BigInt(0),
      })
    } catch (error: any) {
      toast.error(error?.message || 'Failed to start game', { id: 'start-game' })
      setPendingState(null)
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
        abi: SnakeABI,
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
      if (isConfirmed && lastAction === 'start' && txHash && pendingState && !gameStarted && publicClient) {
        try {
          const receipt = await publicClient.getTransactionReceipt({ hash: txHash })

          for (const log of receipt.logs) {
            try {
              const decoded = decodeEventLog({
                abi: SnakeABI,
                data: log.data,
                topics: log.topics,
              }) as any

              if (decoded.eventName === 'GameStarted') {
                const gameId = decoded.args.gameId

                setActiveGameId(gameId)
                setGameState(pendingState)
                setGameStarted(true)
                setPendingState(null)
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
  }, [isConfirmed, lastAction, txHash, pendingState, gameStarted, resetWrite, publicClient])

  useEffect(() => {
    const saveToDatabase = async () => {
      if (isConfirmed && lastAction === 'submit' && gameState && address && activeGameId && txHash) {
        setSubmitTxState('success')
        toast.success(`Score submitted: ${gameState.score.toLocaleString()}!`, { id: 'submit-game' })

        setIsSavingToDb(true)
        const result = await saveScoreWithVerification({
          wallet_address: address.toLowerCase(),
          game_type: 'snake',
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
        setPendingState(null)
        toast.error(errorMsg, { id: 'start-game' })
      } else if (lastAction === 'submit') {
        setSubmitTxState('error')
        toast.error(errorMsg, { id: 'submit-game' })
      }
    }
  }, [writeError, isConfirmError, lastAction])

  useEffect(() => {
    if (!gameStarted || !gameState || gameState.gameOver) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
        gameLoopRef.current = null
      }
      return
    }

    const baseSpeed = 200
    const speedReduction = (gameState.level - 1) * 20
    const gameSpeed = Math.max(100, baseSpeed - speedReduction)

    gameLoopRef.current = setInterval(() => {
      setGameState(prevState => {
        if (!prevState || prevState.gameOver) return prevState
        return autoMove(prevState)
      })
    }, gameSpeed)

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
        gameLoopRef.current = null
      }
    }
  }, [gameStarted, gameState?.gameOver, gameState?.level])

  useEffect(() => {
    if (!gameStarted) return

    const handleKeyDown = (e: KeyboardEvent) => {
      let direction: Direction | null = null

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          direction = 'UP'
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          direction = 'DOWN'
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          direction = 'LEFT'
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          direction = 'RIGHT'
          break
      }

      if (direction) {
        e.preventDefault()
        setGameState(prevState => {
          if (!prevState || prevState.gameOver) return prevState

          
          
          
          const opposites: { [key in Direction]: Direction } = {
            'UP': 'DOWN',
            'DOWN': 'UP',
            'LEFT': 'RIGHT',
            'RIGHT': 'LEFT',
          }

          if (opposites[prevState.direction] !== direction) {
            return {
              ...prevState,
              nextDirection: direction
            }
          }
          return prevState
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameStarted])

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
              Snake
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Eat the food, grow longer, and avoid hitting yourself!
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
                  gameOver={gameState.gameOver}
                  score={gameState.score}
                  onNewGame={startNewGame}
                  onSubmit={submitGame}
                />
              ) : isStarting ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-[560px]">
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-[560px]">
                  <Card className="aspect-square flex items-center justify-center">
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

              <Card className="p-6 border-success/30">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">LENGTH</h3>
                <div className="text-5xl text-success">
                  {gameState?.snake.length || 3}
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
        title="How to Play Snake"
        onPlay={startNewGame}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <strong className="text-foreground">Eat the food</strong>
              <p className="text-muted-foreground">Grow longer and earn <strong className="text-primary">10 points</strong></p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <strong className="text-foreground">Avoid obstacles</strong>
              <p className="text-muted-foreground">Don't hit the walls or your own tail</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              3
            </div>
            <div>
              <strong className="text-foreground">Level up</strong>
              <p className="text-muted-foreground">Every 50 points - speed increases!</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              4
            </div>
            <div>
              <strong className="text-foreground">Auto-movement</strong>
              <p className="text-muted-foreground">Snake moves automatically - use arrow keys or WASD to change direction</p>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
            <h3 className="font-semibold mb-3">Keyboard Controls</h3>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex gap-1">
                {['↑', '↓', '←', '→'].map((arrow, i) => (
                  <kbd key={i} className="min-w-[40px] h-10 flex items-center justify-center rounded-lg border-2 bg-background border-border font-mono text-lg font-bold shadow-sm">
                    {arrow}
                  </kbd>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">or WASD</span>
            </div>
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
