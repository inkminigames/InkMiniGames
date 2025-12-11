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

  const tabOutTop = !hasTopEdge && ((row - 1) % 2 === 1)
  const tabOutBottom = !hasBottomEdge && (row % 2 === 0)
  const tabOutLeft = !hasLeftEdge && ((col - 1) % 2 === 1)
  const tabOutRight = !hasRightEdge && (col % 2 === 0)

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
  let path = ''

  const tabSize = 15
  const neckRatio = 0.4

  if (hasTopEdge) {
    path += 'M 0,0 L 100,0'
  } else {
    if (tabOutTop) {
      path += `M 0,0 L ${50 - tabSize},0`
      path += ` C ${50 - tabSize * neckRatio},-${tabSize * 0.3} ${50 - tabSize * neckRatio},-${tabSize * 0.7} ${50 - tabSize * 0.6},-${tabSize * 1.2}`
      path += ` C ${50 - tabSize * 0.3},-${tabSize * 1.5} ${50 + tabSize * 0.3},-${tabSize * 1.5} ${50 + tabSize * 0.6},-${tabSize * 1.2}`
      path += ` C ${50 + tabSize * neckRatio},-${tabSize * 0.7} ${50 + tabSize * neckRatio},-${tabSize * 0.3} ${50 + tabSize},0`
      path += ` L 100,0`
    } else {
      path += `M 0,0 L ${50 - tabSize},0`
      path += ` C ${50 - tabSize * neckRatio},${tabSize * 0.3} ${50 - tabSize * neckRatio},${tabSize * 0.7} ${50 - tabSize * 0.6},${tabSize * 1.2}`
      path += ` C ${50 - tabSize * 0.3},${tabSize * 1.5} ${50 + tabSize * 0.3},${tabSize * 1.5} ${50 + tabSize * 0.6},${tabSize * 1.2}`
      path += ` C ${50 + tabSize * neckRatio},${tabSize * 0.7} ${50 + tabSize * neckRatio},${tabSize * 0.3} ${50 + tabSize},0`
      path += ` L 100,0`
    }
  }

  if (hasRightEdge) {
    path += ' L 100,100'
  } else {
    if (tabOutRight) {
      path += ` L 100,${50 - tabSize}`
      path += ` C ${100 + tabSize * 0.3},${50 - tabSize * neckRatio} ${100 + tabSize * 0.7},${50 - tabSize * neckRatio} ${100 + tabSize * 1.2},${50 - tabSize * 0.6}`
      path += ` C ${100 + tabSize * 1.5},${50 - tabSize * 0.3} ${100 + tabSize * 1.5},${50 + tabSize * 0.3} ${100 + tabSize * 1.2},${50 + tabSize * 0.6}`
      path += ` C ${100 + tabSize * 0.7},${50 + tabSize * neckRatio} ${100 + tabSize * 0.3},${50 + tabSize * neckRatio} 100,${50 + tabSize}`
      path += ' L 100,100'
    } else {
      path += ` L 100,${50 - tabSize}`
      path += ` C ${100 - tabSize * 0.3},${50 - tabSize * neckRatio} ${100 - tabSize * 0.7},${50 - tabSize * neckRatio} ${100 - tabSize * 1.2},${50 - tabSize * 0.6}`
      path += ` C ${100 - tabSize * 1.5},${50 - tabSize * 0.3} ${100 - tabSize * 1.5},${50 + tabSize * 0.3} ${100 - tabSize * 1.2},${50 + tabSize * 0.6}`
      path += ` C ${100 - tabSize * 0.7},${50 + tabSize * neckRatio} ${100 - tabSize * 0.3},${50 + tabSize * neckRatio} 100,${50 + tabSize}`
      path += ' L 100,100'
    }
  }

  if (hasBottomEdge) {
    path += ' L 0,100'
  } else {
    if (tabOutBottom) {
      path += ` L ${50 + tabSize},100`
      path += ` C ${50 + tabSize * neckRatio},${100 + tabSize * 0.3} ${50 + tabSize * neckRatio},${100 + tabSize * 0.7} ${50 + tabSize * 0.6},${100 + tabSize * 1.2}`
      path += ` C ${50 + tabSize * 0.3},${100 + tabSize * 1.5} ${50 - tabSize * 0.3},${100 + tabSize * 1.5} ${50 - tabSize * 0.6},${100 + tabSize * 1.2}`
      path += ` C ${50 - tabSize * neckRatio},${100 + tabSize * 0.7} ${50 - tabSize * neckRatio},${100 + tabSize * 0.3} ${50 - tabSize},100`
      path += ' L 0,100'
    } else {
      path += ` L ${50 + tabSize},100`
      path += ` C ${50 + tabSize * neckRatio},${100 - tabSize * 0.3} ${50 + tabSize * neckRatio},${100 - tabSize * 0.7} ${50 + tabSize * 0.6},${100 - tabSize * 1.2}`
      path += ` C ${50 + tabSize * 0.3},${100 - tabSize * 1.5} ${50 - tabSize * 0.3},${100 - tabSize * 1.5} ${50 - tabSize * 0.6},${100 - tabSize * 1.2}`
      path += ` C ${50 - tabSize * neckRatio},${100 - tabSize * 0.7} ${50 - tabSize * neckRatio},${100 - tabSize * 0.3} ${50 - tabSize},100`
      path += ' L 0,100'
    }
  }

  if (hasLeftEdge) {
    path += ' L 0,0 Z'
  } else {
    if (tabOutLeft) {
      path += ` L 0,${50 + tabSize}`
      path += ` C -${tabSize * 0.3},${50 + tabSize * neckRatio} -${tabSize * 0.7},${50 + tabSize * neckRatio} -${tabSize * 1.2},${50 + tabSize * 0.6}`
      path += ` C -${tabSize * 1.5},${50 + tabSize * 0.3} -${tabSize * 1.5},${50 - tabSize * 0.3} -${tabSize * 1.2},${50 - tabSize * 0.6}`
      path += ` C -${tabSize * 0.7},${50 - tabSize * neckRatio} -${tabSize * 0.3},${50 - tabSize * neckRatio} 0,${50 - tabSize}`
      path += ' L 0,0 Z'
    } else {
      path += ` L 0,${50 + tabSize}`
      path += ` C ${tabSize * 0.3},${50 + tabSize * neckRatio} ${tabSize * 0.7},${50 + tabSize * neckRatio} ${tabSize * 1.2},${50 + tabSize * 0.6}`
      path += ` C ${tabSize * 1.5},${50 + tabSize * 0.3} ${tabSize * 1.5},${50 - tabSize * 0.3} ${tabSize * 1.2},${50 - tabSize * 0.6}`
      path += ` C ${tabSize * 0.7},${50 - tabSize * neckRatio} ${tabSize * 0.3},${50 - tabSize * neckRatio} 0,${50 - tabSize}`
      path += ' L 0,0 Z'
    }
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
