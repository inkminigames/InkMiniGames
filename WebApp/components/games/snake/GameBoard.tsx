'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameState, Position, getBoardDimensions } from '@/lib/games/snake'

interface GameBoardProps {
  gameState: GameState
  gameOver: boolean
  score: number
  onNewGame: () => void
  onSubmit: () => void
  isReplay?: boolean
}

export function GameBoard({ gameState, gameOver, score, onNewGame, onSubmit, isReplay = false }: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { width: BOARD_WIDTH, height: BOARD_HEIGHT } = getBoardDimensions()
  const CELL_SIZE = 30 // Increased from 25
  const CANVAS_WIDTH = BOARD_WIDTH * CELL_SIZE
  const CANVAS_HEIGHT = BOARD_HEIGHT * CELL_SIZE

  // Draw the game board
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas with dark background
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.lineWidth = 1
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      ctx.beginPath()
      ctx.moveTo(x * CELL_SIZE, 0)
      ctx.lineTo(x * CELL_SIZE, CANVAS_HEIGHT)
      ctx.stroke()
    }
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * CELL_SIZE)
      ctx.lineTo(CANVAS_WIDTH, y * CELL_SIZE)
      ctx.stroke()
    }

    // Draw food with pulsing effect
    const food = gameState.food
    const pulse = Math.sin(Date.now() / 200) * 0.2 + 0.8

    // Outer glow
    const gradient = ctx.createRadialGradient(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 4,
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2
    )
    gradient.addColorStop(0, `rgba(239, 68, 68, ${pulse})`)
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2,
      0,
      2 * Math.PI
    )
    ctx.fill()

    // Inner food
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 3,
      0,
      2 * Math.PI
    )
    ctx.fill()

    // Draw snake with rounded segments and gradient
    gameState.snake.forEach((segment: Position, index: number) => {
      const isHead = index === 0
      const isTail = index === gameState.snake.length - 1

      // Calculate gradient color based on position in snake
      const progress = index / Math.max(gameState.snake.length - 1, 1)
      const hue = 270 // Purple hue
      const saturation = 71 - progress * 20 // Fade saturation
      const lightness = 59 - progress * 20 // Fade lightness

      // Main body segment with rounded corners
      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`
      ctx.beginPath()
      const padding = 2
      const radius = isHead ? 8 : 6
      const x = segment.x * CELL_SIZE + padding
      const y = segment.y * CELL_SIZE + padding
      const width = CELL_SIZE - padding * 2
      const height = CELL_SIZE - padding * 2

      // Rounded rectangle
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + width - radius, y)
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
      ctx.lineTo(x + width, y + height - radius)
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
      ctx.lineTo(x + radius, y + height)
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.closePath()
      ctx.fill()

      // Add highlight to head
      if (isHead) {
        const highlightGradient = ctx.createLinearGradient(
          x, y, x, y + height
        )
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.fillStyle = highlightGradient
        ctx.fill()
      }

      // Draw eyes on head
      if (isHead) {
        ctx.fillStyle = '#1a1a1a'
        const eyeSize = 4
        const eyeOffset = 8

        let leftEyeX = segment.x * CELL_SIZE + eyeOffset
        let leftEyeY = segment.y * CELL_SIZE + eyeOffset
        let rightEyeX = segment.x * CELL_SIZE + CELL_SIZE - eyeOffset
        let rightEyeY = segment.y * CELL_SIZE + eyeOffset

        switch (gameState.direction) {
          case 'UP':
            leftEyeX = segment.x * CELL_SIZE + eyeOffset
            rightEyeX = segment.x * CELL_SIZE + CELL_SIZE - eyeOffset
            leftEyeY = segment.y * CELL_SIZE + eyeOffset
            rightEyeY = segment.y * CELL_SIZE + eyeOffset
            break
          case 'DOWN':
            leftEyeX = segment.x * CELL_SIZE + eyeOffset
            rightEyeX = segment.x * CELL_SIZE + CELL_SIZE - eyeOffset
            leftEyeY = segment.y * CELL_SIZE + CELL_SIZE - eyeOffset
            rightEyeY = segment.y * CELL_SIZE + CELL_SIZE - eyeOffset
            break
          case 'LEFT':
            leftEyeX = segment.x * CELL_SIZE + eyeOffset
            rightEyeX = segment.x * CELL_SIZE + eyeOffset
            leftEyeY = segment.y * CELL_SIZE + eyeOffset
            rightEyeY = segment.y * CELL_SIZE + CELL_SIZE - eyeOffset
            break
          case 'RIGHT':
            leftEyeX = segment.x * CELL_SIZE + CELL_SIZE - eyeOffset
            rightEyeX = segment.x * CELL_SIZE + CELL_SIZE - eyeOffset
            leftEyeY = segment.y * CELL_SIZE + eyeOffset
            rightEyeY = segment.y * CELL_SIZE + CELL_SIZE - eyeOffset
            break
        }

        // Draw eyes with white shine
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, 2 * Math.PI)
        ctx.fill()

        // Add shine to eyes
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(leftEyeX - 1, leftEyeY - 1, 1.5, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX - 1, rightEyeY - 1, 1.5, 0, 2 * Math.PI)
        ctx.fill()
      }

      // Draw tail end as smaller rounded segment
      if (isTail && gameState.snake.length > 1) {
        const tailPadding = 6
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness - 10}%)`
        ctx.beginPath()
        ctx.arc(
          segment.x * CELL_SIZE + CELL_SIZE / 2,
          segment.y * CELL_SIZE + CELL_SIZE / 2,
          CELL_SIZE / 2 - tailPadding,
          0,
          2 * Math.PI
        )
        ctx.fill()
      }
    })
  }, [gameState, CANVAS_WIDTH, CANVAS_HEIGHT, BOARD_WIDTH, BOARD_HEIGHT])

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Score and Level Display */}
      <div className="flex gap-8 items-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="text-sm text-muted-foreground mb-1">Score</div>
          <div className="text-4xl font-bold gradient-text">{score}</div>
        </motion.div>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center"
        >
          <div className="text-sm text-muted-foreground mb-1">Level</div>
          <div className="text-4xl font-bold text-primary">{gameState.level}</div>
        </motion.div>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <div className="text-sm text-muted-foreground mb-1">Length</div>
          <div className="text-4xl font-bold text-green-500">{gameState.snake.length}</div>
        </motion.div>
      </div>

      {/* Main game board container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative rounded-2xl p-6 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%)',
          border: '2px solid hsl(var(--border))',
        }}
      >
        {/* Canvas for game rendering */}
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="rounded-xl border-2 border-border/50"
        />

        {/* Game Over Overlay */}
        <AnimatePresence>
          {gameOver && !isReplay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm rounded-2xl"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="text-center p-8"
              >
                <h2 className="text-5xl mb-6 gradient-text font-bold">
                  Game Over!
                </h2>
                <div className="space-y-2 mb-8">
                  <p className="text-2xl text-foreground">
                    Final Score: <span className="font-bold text-primary">{score}</span>
                  </p>
                  <p className="text-xl text-muted-foreground">
                    Length: {gameState.snake.length} • Level: {gameState.level}
                  </p>
                </div>
                <div className="flex gap-4">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <button
                      onClick={onSubmit}
                      className="relative overflow-hidden bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-lg transition-all duration-300"
                    >
                      <motion.div
                        className="absolute inset-0"
                        style={{
                          background: 'radial-gradient(circle at center, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%)',
                        }}
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.5, 0.8, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                      <span className="relative z-10">
                        Submit Score
                      </span>
                    </button>
                  </motion.div>
                  <button
                    onClick={onNewGame}
                    className="px-8 py-4 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    New Game
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </div>
  )
}
