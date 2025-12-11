export type Move = {
  pieceId: number
  fromRow: number
  fromCol: number
  toRow: number
  toCol: number
}

export type Level = 1 | 2 | 3

export interface PuzzlePiece {
  id: number
  currentRow: number
  currentCol: number
  correctRow: number
  correctCol: number
  isPlaced: boolean
}

export interface GameState {
  pieces: PuzzlePiece[]
  level: Level
  moves: Move[]
  score: number
  gameOver: boolean
  won: boolean
  startTime: number
  seed: number
  imagePattern: number
  imageUrl: string
}

export const LEVEL_CONFIG = {
  1: { rows: 3, cols: 3, pieces: 9, baseScore: 1000 },
  2: { rows: 4, cols: 4, pieces: 16, baseScore: 2000 },
  3: { rows: 5, cols: 5, pieces: 25, baseScore: 3000 },
} as const

export class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max)
  }

  getSeed(): number {
    return this.seed
  }
}

function shuffle<T>(array: T[], rng: SeededRandom): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

let cachedPuzzleImages: string[] | null = null

export async function fetchPuzzleImages(): Promise<string[]> {
  if (cachedPuzzleImages !== null) {
    return cachedPuzzleImages
  }

  try {
    const response = await fetch('/api/puzzle-images')
    const data = await response.json()
    const images = data.images.length > 0 ? data.images : ['/puzzle-images/1.png']
    cachedPuzzleImages = images
    return images
  } catch (error) {
    throw error
  }
}

export function getPuzzleImages(): string[] {
  return cachedPuzzleImages || ['/puzzle-images/1.png']
}

export function getRandomPuzzleImage(seed: number): string {
  const images = getPuzzleImages()
  const rng = new SeededRandom(seed)
  const index = rng.nextInt(images.length)
  return images[index]
}

export function initializeGame(seed: number, level: Level): GameState {
  const config = LEVEL_CONFIG[level]
  const rng = new SeededRandom(seed)

  const pieces: PuzzlePiece[] = []
  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      const id = row * config.cols + col
      pieces.push({
        id,
        currentRow: -1,
        currentCol: -1,
        correctRow: row,
        correctCol: col,
        isPlaced: false,
      })
    }
  }

  const scrambledPieces = shuffle(pieces, rng)

  scrambledPieces.forEach((piece, index) => {
    piece.currentRow = Math.floor(index / config.cols) + config.rows + 1
    piece.currentCol = index % config.cols
  })

  const images = getPuzzleImages()
  const rng2 = new SeededRandom(seed)
  const imageIndex = rng2.nextInt(images.length)
  const imageUrl = images[imageIndex]

  const puzzleArray: number[] = []
  scrambledPieces.forEach(piece => {
    puzzleArray.push(piece.id)
    puzzleArray.push(piece.currentRow * 100 + piece.currentCol)
    puzzleArray.push(piece.correctRow * 100 + piece.correctCol)
  })
  puzzleArray.push(imageIndex)

  const imagePattern = seed % 10

  return {
    pieces: scrambledPieces,
    level,
    moves: [],
    score: 0,
    gameOver: false,
    won: false,
    startTime: Date.now(),
    seed,
    imagePattern,
    imageUrl,
  }
}

export function makeMove(state: GameState, move: Move): GameState {
  if (state.gameOver) return state

  const newPieces = state.pieces.map(p => ({ ...p }))
  const piece = newPieces.find(p => p.id === move.pieceId)

  if (!piece) return state

  piece.currentRow = move.toRow
  piece.currentCol = move.toCol

  piece.isPlaced = piece.currentRow === piece.correctRow && piece.currentCol === piece.correctCol

  const newMoves = [...state.moves, move]

  const allPlaced = newPieces.every(p => p.isPlaced)
  const won = allPlaced
  const gameOver = won

  let score = state.score
  if (won) {
    const config = LEVEL_CONFIG[state.level]
    const timeElapsed = (Date.now() - state.startTime) / 1000
    const moveCount = newMoves.length

    const timeBonus = Math.max(0, Math.floor(500 - timeElapsed))
    const moveBonus = Math.max(0, Math.floor((config.pieces * 10 - moveCount) * 10))

    score = config.baseScore + timeBonus + moveBonus
  }

  return {
    ...state,
    pieces: newPieces,
    moves: newMoves,
    score,
    gameOver,
    won,
  }
}

export function getPieceAt(state: GameState, row: number, col: number): PuzzlePiece | null {
  return state.pieces.find(p => p.currentRow === row && p.currentCol === col) || null
}

export function canPlacePiece(state: GameState, row: number, col: number): boolean {
  const config = LEVEL_CONFIG[state.level]

  if (row < 0 || row >= config.rows || col < 0 || col >= config.cols) {
    return false
  }

  const existingPiece = getPieceAt(state, row, col)
  return !existingPiece
}

export function puzzleToArray(state: GameState): number[] {
  const array: number[] = []

  state.pieces.forEach(piece => {
    array.push(piece.id)
    array.push(piece.currentRow * 100 + piece.currentCol)
    array.push(piece.correctRow * 100 + piece.correctCol)
  })

  const images = getPuzzleImages()
  const imageIndex = images.findIndex(img => img === state.imageUrl)
  array.push(imageIndex >= 0 ? imageIndex : 0)

  return array
}

export function arrayToPuzzle(array: number[], level: Level, seed: number): GameState {
  const config = LEVEL_CONFIG[level]
  const pieces: PuzzlePiece[] = []

  let index = 0
  for (let i = 0; i < config.pieces; i++) {
    const id = array[index++]
    const currentPos = array[index++]
    const correctPos = array[index++]

    pieces.push({
      id,
      currentRow: Math.floor(currentPos / 100),
      currentCol: currentPos % 100,
      correctRow: Math.floor(correctPos / 100),
      correctCol: correctPos % 100,
      isPlaced: Math.floor(currentPos / 100) === Math.floor(correctPos / 100) &&
                currentPos % 100 === correctPos % 100,
    })
  }

  const images = getPuzzleImages()
  const imageIndex = array.length > config.pieces * 3 ? array[config.pieces * 3] : 0
  const imageUrl = images[imageIndex]

  const imagePattern = seed % 10

  return {
    pieces,
    level,
    moves: [],
    score: 0,
    gameOver: false,
    won: false,
    startTime: Date.now(),
    seed,
    imagePattern,
    imageUrl,
  }
}

export function encodeMoves(moves: Move[]): Uint8Array {
  const encoded: number[] = []

  moves.forEach(move => {
    encoded.push(move.pieceId)
    encoded.push(move.fromRow)
    encoded.push(move.fromCol)
    encoded.push(move.toRow)
    encoded.push(move.toCol)
  })

  return new Uint8Array(encoded)
}

export function decodeMoves(encoded: string | `0x${string}` | Uint8Array): Move[] {
  if (!encoded) return []

  let bytes: number[] = []

  if (encoded instanceof Uint8Array) {
    bytes = Array.from(encoded)
  } else if (encoded === '0x') {
    return []
  } else if (typeof encoded === 'string') {
    if (encoded.startsWith('0x')) {
      const hex = encoded.slice(2)
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16))
      }
    }
  }

  const moves: Move[] = []
  for (let i = 0; i < bytes.length; i += 5) {
    if (i + 4 < bytes.length) {
      moves.push({
        pieceId: bytes[i],
        fromRow: bytes[i + 1],
        fromCol: bytes[i + 2],
        toRow: bytes[i + 3],
        toCol: bytes[i + 4],
      })
    }
  }

  return moves
}

export function generateGradientPattern(imagePattern: number, pieceId: number, totalPieces: number): string {
  const patterns = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
    ['#30cfd0', '#330867'],
    ['#a8edea', '#fed6e3'],
    ['#ff9a9e', '#fecfef'],
    ['#ffecd2', '#fcb69f'],
    ['#ff6e7f', '#bfe9ff'],
  ]

  const [color1, color2] = patterns[imagePattern % patterns.length]
  const angle = (pieceId * 137.5) % 360

  return `linear-gradient(${angle}deg, ${color1}, ${color2})`
}
