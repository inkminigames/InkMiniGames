'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Board } from '@/lib/games/2048'
import { useState, useEffect } from 'react'

interface GameBoardProps {
  board: Board
  gameOver: boolean
  won: boolean
  score: number
  onNewGame: () => void
  onSubmit: () => void
  isReplay?: boolean
}

interface TileData {
  value: number
  row: number
  col: number
  id: string
}

export function GameBoard({ board, gameOver, won, score, onNewGame, onSubmit, isReplay = false }: GameBoardProps) {
  const GRID_SIZE = 4
  const CELL_GAP = 20
  const CELL_SIZE = 140

  const [tiles, setTiles] = useState<TileData[]>([])
  const [direction, setDirection] = useState<string | null>(null)
  const [pressedKey, setPressedKey] = useState<string | null>(null)

  // Convert board to tile data
  useEffect(() => {
    const newTiles: TileData[] = []
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const value = board[row][col]
        if (value !== 0) {
          newTiles.push({
            value,
            row,
            col,
            id: `${row}-${col}-${value}-${Math.random()}`
          })
        }
      }
    }
    setTiles(newTiles)
  }, [board])

  // Listen for arrow keys to show visual feedback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let dir = null
      let key = null

      switch (e.key) {
        case 'ArrowUp':
          dir = 'up'
          key = '↑'
          break
        case 'ArrowDown':
          dir = 'down'
          key = '↓'
          break
        case 'ArrowLeft':
          dir = 'left'
          key = '←'
          break
        case 'ArrowRight':
          dir = 'right'
          key = '→'
          break
        case 'w':
        case 'W':
          dir = 'up'
          key = 'W'
          break
        case 's':
        case 'S':
          dir = 'down'
          key = 'S'
          break
        case 'a':
        case 'A':
          dir = 'left'
          key = 'A'
          break
        case 'd':
        case 'D':
          dir = 'right'
          key = 'D'
          break
      }

      if (dir) {
        setDirection(dir)
        setPressedKey(key)
        setTimeout(() => {
          setDirection(null)
          setPressedKey(null)
        }, 300)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Main game board container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative rounded-2xl p-4 shadow-2xl"
        style={{
          width: GRID_SIZE * CELL_SIZE + (GRID_SIZE + 1) * CELL_GAP,
          height: GRID_SIZE * CELL_SIZE + (GRID_SIZE + 1) * CELL_GAP,
          background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%)',
          border: '2px solid hsl(var(--border))',
        }}
      >
        {/* Grid background cells */}
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 16 }).map((_, index) => (
            <div
              key={`bg-${index}`}
              className="rounded-xl bg-muted/30 backdrop-blur-sm"
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
              }}
            />
          ))}
        </div>

        {/* Direction indicator */}
        <AnimatePresence>
          {direction && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className={`text-6xl font-bold text-primary/30 ${
                direction === 'up' ? 'animate-bounce-up' :
                direction === 'down' ? 'animate-bounce-down' :
                direction === 'left' ? 'animate-bounce-left' :
                'animate-bounce-right'
              }`}>
                {direction === 'up' && '↑'}
                {direction === 'down' && '↓'}
                {direction === 'left' && '←'}
                {direction === 'right' && '→'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated tiles layer */}
        <div className="absolute inset-4">
          {tiles.map((tile) => {
            const x = tile.col * (CELL_SIZE + CELL_GAP)
            const y = tile.row * (CELL_SIZE + CELL_GAP)

            return (
              <motion.div
                key={tile.id}
                className={`tile tile-${tile.value}`}
                initial={{
                  scale: 0,
                  opacity: 0,
                  x,
                  y,
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  x,
                  y,
                }}
                exit={{
                  scale: 0,
                  opacity: 0,
                }}
                transition={{
                  x: { type: 'spring', stiffness: 300, damping: 30 },
                  y: { type: 'spring', stiffness: 300, damping: 30 },
                  scale: { duration: 0.2 },
                  opacity: { duration: 0.15 },
                }}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  position: 'absolute',
                }}
              >
                {tile.value.toLocaleString()}
              </motion.div>
            )
          })}
        </div>

        {/* Game Over Overlay - Right on the board */}
        <AnimatePresence>
          {gameOver && !isReplay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="text-center p-8"
              >
                <h2 className="text-4xl mb-4 gradient-text">
                  {won ? 'You Won!' : 'Game Over!'}
                </h2>
                <p className="text-xl text-muted-foreground mb-6">
                  Score: <span className="text-foreground font-medium">{score.toLocaleString()}</span>
                </p>
                <div className="flex gap-3">
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

      {/* Keyboard hints with press feedback - hide during replay */}
      {!isReplay && (
        <div className="flex flex-wrap justify-center gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 px-4 py-2 rounded-lg bg-card/50 border border-border/50"
          >
            <div className="flex gap-1">
              {[
                { key: '↑', active: pressedKey === '↑' },
                { key: '←', active: pressedKey === '←' },
                { key: '↓', active: pressedKey === '↓' },
                { key: '→', active: pressedKey === '→' },
              ].map((item, i) => (
                <kbd
                  key={i}
                  className={`min-w-[32px] h-8 flex items-center justify-center rounded-md border font-mono text-sm font-bold shadow-sm transition-all ${
                    item.active
                      ? 'bg-primary text-primary-foreground border-primary scale-110'
                      : 'bg-muted border-border'
                  }`}
                >
                  {item.key}
                </kbd>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">Arrow keys</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-3 px-4 py-2 rounded-lg bg-card/50 border border-border/50"
          >
            <div className="flex gap-1">
              {[
                { key: 'W', active: pressedKey === 'W' },
                { key: 'A', active: pressedKey === 'A' },
                { key: 'S', active: pressedKey === 'S' },
                { key: 'D', active: pressedKey === 'D' },
              ].map((item, i) => (
                <kbd
                  key={i}
                  className={`min-w-[32px] h-8 flex items-center justify-center rounded-md border font-mono text-sm font-bold shadow-sm transition-all ${
                    item.active
                      ? 'bg-primary text-primary-foreground border-primary scale-110'
                      : 'bg-muted border-border'
                  }`}
                >
                  {item.key}
                </kbd>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">Alternative</span>
          </motion.div>
        </div>
      )}
    </div>
  )
}
