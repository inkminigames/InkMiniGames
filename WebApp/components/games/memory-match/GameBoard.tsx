'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Card, LEVEL_CONFIG } from '@/lib/games/memory-match'
import type { Level } from '@/lib/games/memory-match'

interface GameBoardProps {
  cards: Card[]
  onCardClick: (index: number) => void
  disabled?: boolean
  isReplay?: boolean
  gameOver?: boolean
  won?: boolean
  score?: number
  onSubmit?: () => void
  onNewGame?: () => void
  hintsRemaining?: number
  hintedCards?: number[]
  onUseHint?: () => void
  level?: Level
}

export function GameBoard({
  cards,
  onCardClick,
  disabled = false,
  isReplay = false,
  gameOver = false,
  won = false,
  score = 0,
  onSubmit,
  onNewGame,
  hintsRemaining = 0,
  hintedCards = [],
  onUseHint,
  level = 3
}: GameBoardProps) {
  const config = LEVEL_CONFIG[level]

  return (
    <div className="relative">
      {}
      {!isReplay && !gameOver && hintsRemaining > 0 && (
        <div className="flex justify-center mb-4">
          <motion.button
            onClick={onUseHint}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg transition-all duration-300 flex items-center gap-2"
          >
            <span className="text-xl">💡</span>
            <span>Use Hint ({hintsRemaining} left)</span>
          </motion.button>
        </div>
      )}

      <div
        className="grid gap-4 p-6 bg-card rounded-2xl border-2 border-border mx-auto"
        style={{
          gridTemplateColumns: `repeat(${config.gridCols}, minmax(0, 1fr))`,
          maxWidth: level === 1 ? '500px' : level === 2 ? '600px' : '700px',
          width: '100%'
        }}
      >
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.015 }}
          >
            <CardComponent
              card={card}
              onClick={() => !disabled && !isReplay && onCardClick(index)}
              disabled={disabled || card.isMatched || card.isFlipped}
              isHinted={hintedCards.includes(index)}
            />
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {gameOver && !isReplay && (
          <motion.div
            className="absolute inset-0 bg-background/95 backdrop-blur-sm rounded-2xl flex items-center justify-center"
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
                {won ? 'You Won!' : 'Game Over!'}
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
    </div>
  )
}

interface CardComponentProps {
  card: Card
  onClick: () => void
  disabled: boolean
  isHinted?: boolean
}

function CardComponent({ card, onClick, disabled, isHinted = false }: CardComponentProps) {
  
  if (!card.value) {
    return (
      <div className="relative aspect-square opacity-0 pointer-events-none" />
    )
  }

  return (
    <motion.div
      className="relative aspect-square cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={disabled ? undefined : onClick}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: card.isFlipped || card.isMatched || isHinted ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
      >
        <div
          className={`absolute w-full h-full rounded-xl flex items-center justify-center shadow-lg border-2 ${
            isHinted
              ? 'bg-gradient-to-br from-yellow-400/80 to-orange-400 border-yellow-400'
              : 'bg-gradient-to-br from-primary/80 to-primary border-primary/50'
          }`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-4xl">{isHinted ? '💡' : '❓'}</div>
        </div>

        <div
          className={`absolute w-full h-full rounded-xl flex items-center justify-center shadow-lg border-2 ${
            card.isMatched
              ? 'bg-gradient-to-br from-green-500/90 to-green-600 border-green-400'
              : 'bg-gradient-to-br from-card to-muted border-border'
          }`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <motion.div
            className="text-5xl"
            animate={card.isMatched ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5 }}
          >
            {card.value}
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence>
        {card.isMatched && (
          <motion.div
            className="absolute inset-0 rounded-xl"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="absolute inset-0 rounded-xl border-4 border-green-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
