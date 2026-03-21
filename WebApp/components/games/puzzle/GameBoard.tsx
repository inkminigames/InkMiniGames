'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { GameState, PuzzlePiece, LEVEL_CONFIG } from '@/lib/games/puzzle'
import type { Level } from '@/lib/games/puzzle'
import { useState } from 'react'

interface GameBoardProps {
  gameState: GameState
  onPieceMove?: (pieceId: number, toRow: number, toCol: number) => void
  disabled?: boolean
  isReplay?: boolean
  gameOver?: boolean
  won?: boolean
  score?: number
  onSubmit?: () => void
  onNewGame?: () => void
}

export function GameBoard({
  gameState,
  onPieceMove,
  disabled = false,
  isReplay = false,
  gameOver = false,
  won = false,
  score = 0,
  onSubmit,
  onNewGame,
}: GameBoardProps) {
  const config = LEVEL_CONFIG[gameState.level]
  const [draggedPiece, setDraggedPiece] = useState<PuzzlePiece | null>(null)

  const handleDragStart = (piece: PuzzlePiece) => {
    if (disabled || isReplay) return
    setDraggedPiece(piece)
  }

  const handleDragEnd = () => {
    setDraggedPiece(null)
  }

  const handleDrop = (row: number, col: number) => {
    if (!draggedPiece || disabled || isReplay) return

    const existingPiece = gameState.pieces.find(
      p => p.currentRow === row && p.currentCol === col
    )

    if (existingPiece) {
      setDraggedPiece(null)
      return
    }

    if (onPieceMove) {
      onPieceMove(draggedPiece.id, row, col)
    }

    setDraggedPiece(null)
  }

  const getPieceAt = (row: number, col: number): PuzzlePiece | null => {
    return gameState.pieces.find(p => p.currentRow === row && p.currentCol === col) || null
  }

  const getPuzzleSlot = (row: number, col: number) => {
    const piece = getPieceAt(row, col)
    const isEmpty = !piece
    const canDrop = isEmpty && draggedPiece !== null

    return (
      <motion.div
        key={`slot-${row}-${col}`}
        className={`relative aspect-square ${
          canDrop
            ? 'bg-primary/10'
            : isEmpty ? 'bg-muted/10' : ''
        } transition-all duration-200`}
        style={{ overflow: 'visible', zIndex: piece ? 1 : 0 }}
        onDragOver={(e) => {
          if (canDrop) {
            e.preventDefault()
          }
        }}
        onDrop={() => handleDrop(row, col)}
      >
        {piece && (
          <PuzzlePieceComponent
            piece={piece}
            gameState={gameState}
            onDragStart={() => handleDragStart(piece)}
            onDragEnd={handleDragEnd}
            isDragging={draggedPiece?.id === piece.id}
            disabled={disabled || isReplay}
          />
        )}
      </motion.div>
    )
  }

  const trayRows = Math.ceil(config.pieces / config.cols)

  return (
    <div className="relative w-full" style={{ overflow: 'visible' }}>
      <div className="flex gap-8 items-start justify-center" style={{ overflow: 'visible' }}>
        <div className="flex-1 max-w-xl" style={{ overflow: 'visible' }}>
          <h3 className="text-lg font-semibold mb-3 text-center text-primary">Puzzle Board</h3>
          <div
            className="grid gap-0 border-4 border-primary/40 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 p-6 rounded-lg shadow-xl"
            style={{
              gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`,
              overflow: 'visible',
            }}
          >
            {Array.from({ length: config.rows }).map((_, row) =>
              Array.from({ length: config.cols }).map((_, col) => getPuzzleSlot(row, col))
            )}
          </div>
        </div>

        <div className="flex-1 max-w-xl">
          <h3 className="text-lg font-semibold mb-3 text-center text-muted-foreground">Pieces Tray</h3>
          <div
            className="grid gap-2 p-4 bg-muted/40 border-4 border-muted-foreground/30 min-h-[400px] rounded-lg shadow-inner"
            style={{
              gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: trayRows}).map((_, trayRow) =>
              Array.from({ length: config.cols}).map((_, trayCol) => {
                const row = config.rows + 1 + trayRow
                const col = trayCol
                const piece = getPieceAt(row, col)

                return (
                  <div
                    key={`tray-${row}-${col}`}
                    className="relative aspect-square"
                  >
                    {piece && (
                      <PuzzlePieceComponent
                        piece={piece}
                        gameState={gameState}
                        onDragStart={() => handleDragStart(piece)}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedPiece?.id === piece.id}
                        disabled={disabled || isReplay}
                      />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {gameOver && !isReplay && (
          <motion.div
            className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center space-y-6 p-8"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', bounce: 0.4 }}
            >
              <h2 className="text-4xl mb-4 gradient-text">
                {won ? 'Puzzle Completed!' : 'Game Over!'}
              </h2>
              <p className="text-xl text-muted-foreground mb-6">
                Score: <span className="text-foreground font-medium">{score.toLocaleString()}</span>
              </p>
              <div className="flex gap-3 justify-center">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <button
                    onClick={onSubmit}
                    className="relative overflow-hidden bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-lg transition-all duration-300"
                  >
                    Submit Score
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
    </div>
  )
}

interface PuzzlePieceComponentProps {
  piece: PuzzlePiece
  gameState: GameState
  onDragStart: () => void
  onDragEnd: () => void
  isDragging: boolean
  disabled: boolean
}

function PuzzlePieceComponent({
  piece,
  gameState,
  onDragStart,
  onDragEnd,
  isDragging,
  disabled,
}: PuzzlePieceComponentProps) {
  const config = LEVEL_CONFIG[gameState.level]
  const isCorrectPosition = piece.isPlaced

  const row = piece.correctRow
  const col = piece.correctCol

  const hasTopEdge = row === 0
  const hasBottomEdge = row === config.rows - 1
  const hasLeftEdge = col === 0
  const hasRightEdge = col === config.cols - 1

  // For each shared edge, the tab direction is determined by the edge index.
  // The piece that "owns" the tab sticks out; its neighbor sticks in.
  // Horizontal edges are indexed by row (edge between row r and r+1 = edge index r).
  // Vertical edges are indexed by col (edge between col c and c+1 = edge index c).
  // Even edge index → tab goes DOWN/RIGHT; odd → tab goes UP/LEFT.
  const tabOutBottom = !hasBottomEdge && (row % 2 === 0)
  const tabOutTop    = !hasTopEdge    && ((row - 1) % 2 !== 0) // opposite of the bottom of row above
  const tabOutRight  = !hasRightEdge  && (col % 2 === 0)
  const tabOutLeft   = !hasLeftEdge   && ((col - 1) % 2 !== 0) // opposite of the right of col to left

  const imageUrl = gameState.imageUrl || '/puzzle-images/1.png'

  return (
    <motion.div
      className={`absolute ${
        disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      }`}
      style={{
        top: '-20%',
        left: '-20%',
        width: '140%',
        height: '140%',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
        overflow: 'visible',
      }}
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: isDragging ? 0.5 : 1,
        scale: isDragging ? 0.95 : 1,
      }}
      whileHover={!disabled && !piece.isPlaced ? { scale: 1.05, zIndex: 10 } : {}}
      transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
    >
      <svg
        viewBox="-25 -25 150 150"
        className="w-full h-full"
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <clipPath id={`puzzle-clip-${piece.id}`}>
            <JigsawPath
              hasTopEdge={hasTopEdge}
              hasBottomEdge={hasBottomEdge}
              hasLeftEdge={hasLeftEdge}
              hasRightEdge={hasRightEdge}
              tabOutTop={tabOutTop}
              tabOutRight={tabOutRight}
              tabOutBottom={tabOutBottom}
              tabOutLeft={tabOutLeft}
              fill="black"
            />
          </clipPath>

          <filter id={`inner-shadow-${piece.id}`}>
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="1" result="offsetblur"/>
            <feFlood floodColor="#000000" floodOpacity="0.3"/>
            <feComposite in2="offsetblur" operator="in"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <g clipPath={`url(#puzzle-clip-${piece.id})`}>
          {/* Image is scaled to fit the grid perfectly (square) */}
          {/* Each piece shows its portion using negative offsets */}
          <image
            href={imageUrl}
            x={-(col * 100)}
            y={-(row * 100)}
            width={config.cols * 100}
            height={config.rows * 100}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>

        <g>
          {/* Dark outer stroke */}
          <JigsawPath
            hasTopEdge={hasTopEdge}
            hasBottomEdge={hasBottomEdge}
            hasLeftEdge={hasLeftEdge}
            hasRightEdge={hasRightEdge}
            tabOutTop={tabOutTop}
            tabOutRight={tabOutRight}
            tabOutBottom={tabOutBottom}
            tabOutLeft={tabOutLeft}
            stroke="rgba(0, 0, 0, 0.7)"
            strokeWidth="4"
            fill="none"
          />
          {/* Light inner stroke */}
          <JigsawPath
            hasTopEdge={hasTopEdge}
            hasBottomEdge={hasBottomEdge}
            hasLeftEdge={hasLeftEdge}
            hasRightEdge={hasRightEdge}
            tabOutTop={tabOutTop}
            tabOutRight={tabOutRight}
            tabOutBottom={tabOutBottom}
            tabOutLeft={tabOutLeft}
            stroke={isCorrectPosition ? '#22c55e' : 'rgba(255, 255, 255, 0.9)'}
            strokeWidth={isCorrectPosition ? '3.5' : '2.5'}
            fill="none"
          />
        </g>
      </svg>

      {isCorrectPosition && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="absolute inset-0 border-4 border-green-400 rounded-sm" />
        </motion.div>
      )}
    </motion.div>
  )
}

interface JigsawPathProps {
  hasTopEdge: boolean
  hasBottomEdge: boolean
  hasLeftEdge: boolean
  hasRightEdge: boolean
  tabOutTop: boolean
  tabOutRight: boolean
  tabOutBottom: boolean
  tabOutLeft: boolean
  stroke?: string
  strokeWidth?: string
  fill?: string
}

function JigsawPath({
  hasTopEdge,
  hasBottomEdge,
  hasLeftEdge,
  hasRightEdge,
  tabOutTop,
  tabOutRight,
  tabOutBottom,
  tabOutLeft,
  stroke,
  strokeWidth,
  fill,
}: JigsawPathProps) {
  const s = 15    // tab size
  const n = 0.4   // neck ratio

  // Pre-compute all values as plain numbers to avoid SVG path parsing issues
  const x1 = 50 - s        // 35  - tab start
  const x2 = 50 - s * n    // 44  - neck control
  const x3 = 50 - s * 0.6  // 41  - tab shoulder
  const x4 = 50 - s * 0.3  // 45.5 - tab tip side
  const x5 = 50 + s * 0.3  // 54.5
  const x6 = 50 + s * 0.6  // 59
  const x7 = 50 + s * n    // 56
  const x8 = 50 + s        // 65  - tab end

  const yn1 = -(s * 0.3)   // -4.5
  const yn2 = -(s * 0.7)   // -10.5
  const yn3 = -(s * 1.2)   // -18
  const yn4 = -(s * 1.5)   // -22.5
  const yp1 = s * 0.3      // 4.5
  const yp2 = s * 0.7      // 10.5
  const yp3 = s * 1.2      // 18
  const yp4 = s * 1.5      // 22.5

  const rx1 = 100 + s * 0.3  // 104.5
  const rx2 = 100 + s * 0.7  // 110.5
  const rx3 = 100 + s * 1.2  // 118
  const rx4 = 100 + s * 1.5  // 122.5
  const lx1 = 100 - s * 0.3  // 95.5
  const lx2 = 100 - s * 0.7  // 89.5
  const lx3 = 100 - s * 1.2  // 82
  const lx4 = 100 - s * 1.5  // 77.5

  const by1 = 100 + s * 0.3  // 104.5
  const by2 = 100 + s * 0.7  // 110.5
  const by3 = 100 + s * 1.2  // 118
  const by4 = 100 + s * 1.5  // 122.5
  const ty1 = 100 - s * 0.3  // 95.5
  const ty2 = 100 - s * 0.7  // 89.5
  const ty3 = 100 - s * 1.2  // 82
  const ty4 = 100 - s * 1.5  // 77.5

  const lnx1 = -(s * 0.3)   // -4.5
  const lnx2 = -(s * 0.7)   // -10.5
  const lnx3 = -(s * 1.2)   // -18
  const lnx4 = -(s * 1.5)   // -22.5
  const lpx1 = s * 0.3      // 4.5
  const lpx2 = s * 0.7      // 10.5
  const lpx3 = s * 1.2      // 18
  const lpx4 = s * 1.5      // 22.5

  const p = (x: number, y: number) => `${x},${y}`

  let path = ''

  // Top edge
  if (hasTopEdge) {
    path += `M ${p(0,0)} L ${p(100,0)}`
  } else if (tabOutTop) {
    path += `M ${p(0,0)} L ${p(x1,0)} C ${p(x2,yn1)} ${p(x2,yn2)} ${p(x3,yn3)} C ${p(x4,yn4)} ${p(x5,yn4)} ${p(x6,yn3)} C ${p(x7,yn2)} ${p(x7,yn1)} ${p(x8,0)} L ${p(100,0)}`
  } else {
    path += `M ${p(0,0)} L ${p(x1,0)} C ${p(x2,yp1)} ${p(x2,yp2)} ${p(x3,yp3)} C ${p(x4,yp4)} ${p(x5,yp4)} ${p(x6,yp3)} C ${p(x7,yp2)} ${p(x7,yp1)} ${p(x8,0)} L ${p(100,0)}`
  }

  // Right edge
  if (hasRightEdge) {
    path += ` L ${p(100,100)}`
  } else if (tabOutRight) {
    path += ` L ${p(100,x1)} C ${p(rx1,x2)} ${p(rx2,x2)} ${p(rx3,x3)} C ${p(rx4,x4)} ${p(rx4,x5)} ${p(rx3,x6)} C ${p(rx2,x7)} ${p(rx1,x7)} ${p(100,x8)} L ${p(100,100)}`
  } else {
    path += ` L ${p(100,x1)} C ${p(lx1,x2)} ${p(lx2,x2)} ${p(lx3,x3)} C ${p(lx4,x4)} ${p(lx4,x5)} ${p(lx3,x6)} C ${p(lx2,x7)} ${p(lx1,x7)} ${p(100,x8)} L ${p(100,100)}`
  }

  // Bottom edge (drawn right to left)
  if (hasBottomEdge) {
    path += ` L ${p(0,100)}`
  } else if (tabOutBottom) {
    path += ` L ${p(x8,100)} C ${p(x7,by1)} ${p(x7,by2)} ${p(x6,by3)} C ${p(x5,by4)} ${p(x4,by4)} ${p(x3,by3)} C ${p(x2,by2)} ${p(x2,by1)} ${p(x1,100)} L ${p(0,100)}`
  } else {
    path += ` L ${p(x8,100)} C ${p(x7,ty1)} ${p(x7,ty2)} ${p(x6,ty3)} C ${p(x5,ty4)} ${p(x4,ty4)} ${p(x3,ty3)} C ${p(x2,ty2)} ${p(x2,ty1)} ${p(x1,100)} L ${p(0,100)}`
  }

  // Left edge (drawn bottom to top)
  if (hasLeftEdge) {
    path += ` L ${p(0,0)} Z`
  } else if (tabOutLeft) {
    path += ` L ${p(0,x8)} C ${p(lnx1,x7)} ${p(lnx2,x7)} ${p(lnx3,x6)} C ${p(lnx4,x5)} ${p(lnx4,x4)} ${p(lnx3,x3)} C ${p(lnx2,x2)} ${p(lnx1,x2)} ${p(0,x1)} L ${p(0,0)} Z`
  } else {
    path += ` L ${p(0,x8)} C ${p(lpx1,x7)} ${p(lpx2,x7)} ${p(lpx3,x6)} C ${p(lpx4,x5)} ${p(lpx4,x4)} ${p(lpx3,x3)} C ${p(lpx2,x2)} ${p(lpx1,x2)} ${p(0,x1)} L ${p(0,0)} Z`
  }

  return (
    <path
      d={path}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill={fill || 'none'}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}
