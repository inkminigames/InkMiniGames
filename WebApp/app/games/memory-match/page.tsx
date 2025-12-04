'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { toHex, decodeEventLog, encodeAbiParameters } from 'viem'
import { toast } from 'sonner'
import { Navbar } from '@/components/layout/Navbar'
import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { GameBoard } from '@/components/games/memory-match/GameBoard'
import { HowToPlayModal } from '@/components/ui/HowToPlayModal'
import { FullscreenButton } from '@/components/ui/FullscreenButton'
import {
  GameState,
  initializeGame,
  flipCard,
  unflipCards,
  encodeMoves,
  gridToArray,
  useHint,
  clearHints,
  LEVEL_CONFIG,
  Level,
} from '@/lib/games/memory-match'
import MemoryMatchArtifact from '@/lib/web3/MemoryMatchABI.json'
import { saveScoreWithVerification } from '@/lib/supabase/client'

const MemoryMatchABI = MemoryMatchArtifact.abi
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_MEMORYMATCH_CONTRACT_ADDRESS as `0x${string}`

type TransactionState = 'idle' | 'pending' | 'confirming' | 'success' | 'error'

export default function MemoryMatchPage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { writeContract, data: txHash, isPending, error: writeError, reset: resetWrite } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError } = useWaitForTransactionReceipt({ hash: txHash })

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
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(3)

  const unflipTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const fetchGameFee = async () => {
      if (!publicClient || !CONTRACT_ADDRESS) {
        setGameFee(null)
        return
      }

      try {
        const fee = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: MemoryMatchABI,
          functionName: 'gameFee',
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
    resetWrite()

    if (unflipTimeoutRef.current) {
      clearTimeout(unflipTimeoutRef.current)
      unflipTimeoutRef.current = null
    }

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

      const config = LEVEL_CONFIG[newGameState.level]
      const gridArray = gridToArray(newGameState.cards, config.gridSize)

      const encodedGrid = encodeAbiParameters(
        [{ type: `uint256[${config.gridSize}]` }],
        [gridArray as any]
      )

      const contractCallParams = {
        address: CONTRACT_ADDRESS,
        abi: MemoryMatchABI,
        functionName: 'startGame',
        args: [encodedGrid],
        value: gameFee || BigInt(0),
      }

      writeContract(contractCallParams)
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
        abi: MemoryMatchABI,
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
                abi: MemoryMatchABI,
                data: log.data,
                topics: log.topics,
              })

              if (decoded.eventName === 'GameStarted') {
                const gameId = (decoded.args as any).gameId

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
          game_type: 'memory-match',
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
      const error: any = writeError || confirmError

      let errorMsg = 'Transaction failed'

      if (error?.message?.includes('User rejected')) {
        errorMsg = 'Transaction rejected'
      } else if (error?.message?.includes('insufficient')) {
        errorMsg = 'Insufficient funds'
      } else if (confirmError) {
        errorMsg = `Transaction reverted: ${confirmError?.message || 'Check contract requirements'}`
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
  }, [writeError, isConfirmError, confirmError, lastAction, resetWrite])

  const handleCardClick = useCallback((cardIndex: number) => {
    if (!gameState || gameState.gameOver) return
    if (gameState.flippedCards.length >= 2) return

    // Clear hints when user clicks a card
    let stateToUse = gameState
    if (gameState.hintedCards.length > 0) {
      stateToUse = clearHints(gameState)
      setGameState(stateToUse)
    }

    const newState = flipCard(stateToUse, cardIndex)
    setGameState(newState)

    if (newState.flippedCards.length === 2) {
      const [first, second] = newState.flippedCards
      const firstCard = newState.cards[first]
      const secondCard = newState.cards[second]

      if (firstCard.value !== secondCard.value) {
        if (unflipTimeoutRef.current) {
          clearTimeout(unflipTimeoutRef.current)
        }

        unflipTimeoutRef.current = setTimeout(() => {
          setGameState(prevState => prevState ? unflipCards(prevState) : prevState)
        }, 1000)
      }
    }
  }, [gameState])

  const handleUseHint = useCallback(() => {
    if (!gameState || gameState.gameOver) return

    const newState = useHint(gameState)
    setGameState(newState)

    // Auto-clear hints after 3 seconds
    setTimeout(() => {
      setGameState(prevState => prevState ? clearHints(prevState) : prevState)
    }, 3000)
  }, [gameState])

  useEffect(() => {
    return () => {
      if (unflipTimeoutRef.current) {
        clearTimeout(unflipTimeoutRef.current)
      }
    }
  }, [])

  const isStarting = startTxState === 'pending' || startTxState === 'confirming'
  const isSubmitting = submitTxState === 'pending' || submitTxState === 'confirming'

  const attemptsRemaining = gameState ? gameState.maxAttempts - gameState.attempts : 50

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
              Memory Match
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Match pairs of cards and test your memory skills!
            </p>
            <Button onClick={() => setShowHowToPlay(true)} variant="outline">
              How to Play
            </Button>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-12 items-start justify-center max-w-7xl mx-auto">
            <div className="flex-1 flex flex-col items-center">
              {gameState && gameStarted ? (
                <div className="w-full max-w-2xl">
                  <GameBoard
                    cards={gameState.cards}
                    onCardClick={handleCardClick}
                    disabled={gameState.flippedCards.length >= 2 || gameState.gameOver}
                    gameOver={gameState.gameOver}
                    won={gameState.won}
                    score={gameState.score}
                    onSubmit={submitGame}
                    onNewGame={startNewGame}
                    hintsRemaining={gameState.hintsRemaining}
                    hintedCards={gameState.hintedCards}
                    onUseHint={handleUseHint}
                    level={gameState.level}
                  />
                </div>
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

                      {/* Level Selection */}
                      <div className="mb-8">
                        <h4 className="text-lg font-semibold mb-4">Select Difficulty</h4>
                        <div className="flex justify-center gap-4">
                          {[1, 2, 3].map((level) => {
                            const config = LEVEL_CONFIG[level as Level]
                            return (
                              <button
                                key={level}
                                onClick={() => setSelectedLevel(level as Level)}
                                className={`px-6 py-4 rounded-xl border-2 transition-all duration-200 ${
                                  selectedLevel === level
                                    ? 'bg-primary border-primary text-white scale-105'
                                    : 'border-border hover:border-primary/50'
                                }`}
                              >
                                <div className="text-xl font-bold">Level {level}</div>
                                <div className="text-sm opacity-80">{config.gridCols}x{config.gridRows} Grid</div>
                                <div className="text-xs opacity-60">{config.pairsCount} Pairs</div>
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
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">MATCHED PAIRS</h3>
                <div className="text-5xl text-accent">
                  {gameState?.matchedPairs || 0} / {gameState ? LEVEL_CONFIG[gameState.level].pairsCount : '-'}
                </div>
              </Card>

              <Card className="p-6 border-success/30">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">ATTEMPTS LEFT</h3>
                <div className={`text-5xl ${attemptsRemaining <= 10 ? 'text-destructive' : 'text-success'}`}>
                  {attemptsRemaining}
                </div>
              </Card>

              <Card className="p-6 border-yellow-500/30">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">HINTS LEFT</h3>
                <div className="flex items-center gap-2">
                  <div className="text-5xl text-yellow-500">
                    {gameState?.hintsRemaining || 0}
                  </div>
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
                      <span className="text-muted-foreground">Theme</span>
                      <span className="font-medium capitalize">{gameState?.theme}</span>
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
        title="How to Play Memory Match"
        onPlay={startNewGame}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <strong className="text-foreground">Click cards to flip them</strong>
              <p className="text-muted-foreground">Reveal the emoji hidden behind each card</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <strong className="text-foreground">Choose your difficulty</strong>
              <p className="text-muted-foreground">
                <strong className="text-green-500">Level 1</strong>: 3x3 grid (4 pairs, 20 attempts, 50 pts/match)<br />
                <strong className="text-yellow-500">Level 2</strong>: 4x4 grid (8 pairs, 35 attempts, 100 pts/match)<br />
                <strong className="text-red-500">Level 3</strong>: 6x6 grid (18 pairs, 50 attempts, 150 pts/match)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              3
            </div>
            <div>
              <strong className="text-foreground">Match pairs to score</strong>
              <p className="text-muted-foreground">Find two cards with the same emoji. Base points per match depend on your chosen level!</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              4
            </div>
            <div>
              <strong className="text-foreground">Scoring system</strong>
              <p className="text-muted-foreground">
                Base: <strong className="text-primary">Level-based pts</strong> per pair<br />
                Time bonus: up to 50 pts (faster is better)<br />
                Attempt bonus: 2 pts per remaining attempt
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              5
            </div>
            <div>
              <strong className="text-foreground">Win condition</strong>
              <p className="text-muted-foreground">Match all pairs before running out of attempts. Submit your score on-chain to compete!</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded bg-primary/20 text-primary font-bold flex-shrink-0 mt-0.5">
              6
            </div>
            <div>
              <strong className="text-foreground">Hint system</strong>
              <p className="text-muted-foreground">Get <strong className="text-yellow-500">5 hints</strong> per game. Each hint reveals 5 random unmatched cards for 3 seconds</p>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
            <h3 className="font-semibold mb-3">Game Features</h3>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>Random themes each game (animals, fruits, nature, space, food)</li>
              <li>Time bonuses reward faster completion</li>
              <li>Attempt bonuses reward fewer mistakes</li>
              <li>5 hints to help you when stuck</li>
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
