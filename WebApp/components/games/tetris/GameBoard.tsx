'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { GameState, getCellColor } from '@/lib/games/tetris'
import { useState, useEffect, useRef } from 'react'

interface GameBoardProps {
  gameState: GameState
  onNewGame: () => void
  onSubmit: () => void
  isReplay?: boolean
}

export function GameBoard({ gameState, onNewGame, onSubmit, isReplay = false }: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nextPieceCanvasRef = useRef<HTMLCanvasElement>(null)
  const [pressedKey, setPressedKey] = useState<string | null>(null)

  const CELL_SIZE = 32 
  const BOARD_WIDTH = 10
  const BOARD_HEIGHT = 20
  const CANVAS_WIDTH = BOARD_WIDTH * CELL_SIZE
  const CANVAS_HEIGHT = BOARD_HEIGHT * CELL_SIZE

  const NEXT_PIECE_SIZE = 4
  const NEXT_PIECE_CELL_SIZE = 28
  const NEXT_PIECE_CANVAS_SIZE = NEXT_PIECE_SIZE * NEXT_PIECE_CELL_SIZE

  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
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

    
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const value = gameState.board[y][x]
        if (value !== 0) {
          const color = getCellColor(value)

          
          ctx.fillStyle = color
          ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4)

          
          const shineGradient = ctx.createLinearGradient(
            x * CELL_SIZE,
            y * CELL_SIZE,
            x * CELL_SIZE,
            y * CELL_SIZE + CELL_SIZE / 2
          )
          shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)')
          shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
          ctx.fillStyle = shineGradient
          ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE / 2)

          
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
          ctx.lineWidth = 1
          ctx.strokeRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4)
        }
      }
    }

    
    if (gameState.currentPiece && !gameState.gameOver) {
      const piece = gameState.currentPiece
      const color = piece.color

      
      let ghostY = piece.position.y
      while (canPlacePiece(gameState.board, piece, ghostY + 1)) {
        ghostY++
      }

      if (ghostY !== piece.position.y) {
        for (let y = 0; y < piece.shape.length; y++) {
          for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
              const boardX = piece.position.x + x
              const boardY = ghostY + y

              if (boardY >= 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
                ctx.lineWidth = 2
                ctx.strokeRect(boardX * CELL_SIZE + 4, boardY * CELL_SIZE + 4, CELL_SIZE - 8, CELL_SIZE - 8)
              }
            }
          }
        }
      }

      
      for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
          if (piece.shape[y][x]) {
            const boardX = piece.position.x + x
            const boardY = piece.position.y + y

            if (boardY >= 0) {
              
              ctx.fillStyle = color
              ctx.fillRect(boardX * CELL_SIZE + 2, boardY * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4)

              
              const shineGradient = ctx.createLinearGradient(
                boardX * CELL_SIZE,
                boardY * CELL_SIZE,
                boardX * CELL_SIZE,
                boardY * CELL_SIZE + CELL_SIZE / 2
              )
              shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)')
              shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
              ctx.fillStyle = shineGradient
              ctx.fillRect(boardX * CELL_SIZE + 2, boardY * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE / 2)

              
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
              ctx.lineWidth = 1
              ctx.strokeRect(boardX * CELL_SIZE + 2, boardY * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4)
            }
          }
        }
      }
    }
  }, [gameState])

  
  function canPlacePiece(board: number[][], piece: { shape: number[][], position: { x: number, y: number } }, newY?: number): boolean {
    const y = newY !== undefined ? newY : piece.position.y

    for (let py = 0; py < piece.shape.length; py++) {
      for (let px = 0; px < piece.shape[py].length; px++) {
        if (piece.shape[py][px]) {
          const boardX = piece.position.x + px
          const boardY = y + py

          if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
            return false
          }

          if (boardY >= 0 && board[boardY][boardX]) {
            return false
          }
        }
      }
    }
    return true
  }

  
  useEffect(() => {
    const canvas = nextPieceCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, NEXT_PIECE_CANVAS_SIZE, NEXT_PIECE_CANVAS_SIZE)

    if (gameState.nextPiece) {
      const piece = gameState.nextPiece
      const color = piece.color
      const shape = piece.shape

      
      const offsetX = Math.floor((NEXT_PIECE_SIZE - shape[0].length) / 2)
      const offsetY = Math.floor((NEXT_PIECE_SIZE - shape.length) / 2)

      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            const drawX = (offsetX + x) * NEXT_PIECE_CELL_SIZE
            const drawY = (offsetY + y) * NEXT_PIECE_CELL_SIZE

            
            ctx.fillStyle = color
            ctx.fillRect(drawX + 2, drawY + 2, NEXT_PIECE_CELL_SIZE - 4, NEXT_PIECE_CELL_SIZE - 4)

            
            const shineGradient = ctx.createLinearGradient(
              drawX, drawY, drawX, drawY + NEXT_PIECE_CELL_SIZE / 2
            )
            shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)')
            shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
            ctx.fillStyle = shineGradient
            ctx.fillRect(drawX + 2, drawY + 2, NEXT_PIECE_CELL_SIZE - 4, NEXT_PIECE_CELL_SIZE / 2)
          }
        }
      }
    }
  }, [gameState.nextPiece])

  
  useEffect(() => {
    if (isReplay) return

    const handleKeyDown = (e: KeyboardEvent) => {
      let key = null

      switch (e.key) {
        case 'ArrowLeft':
          key = '←'
          break
        case 'ArrowRight':
          key = '→'
          break
        case 'ArrowDown':
          key = '↓'
          break
        case 'ArrowUp':
          key = '↑'
          break
        case ' ':
          key = 'SPACE'
          break
        case 'z':
        case 'Z':
          key = 'Z'
          break
      }

      if (key) {
        setPressedKey(key)
        setTimeout(() => {
          setPressedKey(null)
        }, 200)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isReplay])

  return (
    <div className="flex flex-col items-center gap-8">
      {}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <div className="text-sm text-muted-foreground mb-1">Score</div>
        <div className="text-5xl font-bold gradient-text">{gameState.score.toLocaleString()}</div>
      </motion.div>

      <div className="flex gap-8 items-start">
        {}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative rounded-2xl shadow-2xl overflow-hidden p-6"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%)',
            border: '2px solid hsl(var(--border))',
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="rounded-xl border-2 border-border/50"
          />

          {}
          <AnimatePresence>
            {gameState.gameOver && !isReplay && (
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
                      Final Score: <span className="font-bold text-primary">{gameState.score.toLocaleString()}</span>
                    </p>
                    <p className="text-xl text-muted-foreground">
                      Lines: {gameState.lines} • Level: {gameState.level}
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

        {}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
          className="flex flex-col gap-6"
        >
          {}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 text-center">
              Next Piece
            </h3>
            <div className="rounded-lg overflow-hidden border-2 border-border/50">
              <canvas
                ref={nextPieceCanvasRef}
                width={NEXT_PIECE_CANVAS_SIZE}
                height={NEXT_PIECE_CANVAS_SIZE}
                className="block"
              />
            </div>
          </div>

          {}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Level</span>
                <span className="text-2xl font-bold text-primary">{gameState.level}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Lines</span>
                <span className="text-2xl font-bold text-accent">{gameState.lines}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  )
}
