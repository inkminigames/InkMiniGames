'use client'

import { motion } from 'framer-motion'

interface TileProps {
  value: number
  row: number
  col: number
}

const tileColors: Record<number, { bg: string; text: string }> = {
  0: { bg: 'bg-card-border/30', text: 'text-transparent' },
  2: { bg: 'bg-purple-900/30', text: 'text-purple-200' },
  4: { bg: 'bg-purple-800/40', text: 'text-purple-100' },
  8: { bg: 'bg-purple-700/50', text: 'text-white' },
  16: { bg: 'bg-purple-600/60', text: 'text-white' },
  32: { bg: 'bg-purple-500/70', text: 'text-white' },
  64: { bg: 'bg-purple-400/80', text: 'text-white' },
  128: { bg: 'bg-primary-500', text: 'text-white' },
  256: { bg: 'bg-primary-600', text: 'text-white' },
  512: { bg: 'bg-accent-500', text: 'text-white' },
  1024: { bg: 'bg-accent-400', text: 'text-white' },
  2048: { bg: 'bg-gradient-to-br from-primary-400 to-accent-400', text: 'text-white' },
}

export function Tile({ value, row, col }: TileProps) {
  const colors = tileColors[value] || tileColors[2048]

  return (
    <motion.div
      key={`${row}-${col}-${value}`}
      initial={{ scale: value === 0 ? 1 : 0.8, opacity: value === 0 ? 1 : 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.15 }}
      className={`${colors.bg} ${colors.text} rounded-lg flex items-center justify-center font-bold text-2xl md:text-3xl h-full w-full shadow-lg`}
    >
      {value !== 0 && value}
    </motion.div>
  )
}
