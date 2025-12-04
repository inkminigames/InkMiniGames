/**
 * Tetris Game Logic
 */

export type Direction = 'LEFT' | 'RIGHT' | 'DOWN' | 'ROTATE_CW' | 'ROTATE_CCW' | 'HARD_DROP'

export interface Position {
  x: number
  y: number
}

export interface Tetromino {
  shape: number[][]
  color: string
  position: Position
  type: string
}

export interface GameState {
  board: number[][] // 20 rows x 10 columns, 0 = empty, 1-7 = tetromino colors
  currentPiece: Tetromino | null
  nextPiece: Tetromino | null
  score: number
  level: number
  lines: number
  moves: Direction[]
  gameOver: boolean
  seed: number
}

// Tetromino shapes (I, O, T, S, Z, J, L)
const TETROMINOS: { [key: string]: { shape: number[][], color: string } } = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: '#00f0f0', // Cyan
  },
  O: {
    shape: [
      [2, 2],
      [2, 2],
    ],
    color: '#f0f000', // Yellow
  },
  T: {
    shape: [
      [0, 3, 0],
      [3, 3, 3],
      [0, 0, 0],
    ],
    color: '#a000f0', // Purple
  },
  S: {
    shape: [
      [0, 4, 4],
      [4, 4, 0],
      [0, 0, 0],
    ],
    color: '#00f000', // Green
  },
  Z: {
    shape: [
      [5, 5, 0],
      [0, 5, 5],
      [0, 0, 0],
    ],
    color: '#f00000', // Red
  },
  J: {
    shape: [
      [6, 0, 0],
      [6, 6, 6],
      [0, 0, 0],
    ],
    color: '#0000f0', // Blue
  },
  L: {
    shape: [
      [0, 0, 7],
      [7, 7, 7],
      [0, 0, 0],
    ],
    color: '#f0a000', // Orange
  },
}

const TETROMINO_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const POINTS_PER_LINE = [0, 100, 300, 500, 800] // 0, 1, 2, 3, 4 lines

// Simple pseudo-random number generator (seeded)
class SeededRandom {
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
}

/**
 * Initialize an empty board
 */
export function initializeBoard(): number[][] {
  return Array(BOARD_HEIGHT)
    .fill(null)
    .map(() => Array(BOARD_WIDTH).fill(0))
}

/**
 * Generate a random tetromino
 */
function generateTetromino(rng: SeededRandom): Tetromino {
  const type = TETROMINO_TYPES[rng.nextInt(TETROMINO_TYPES.length)]
  const template = TETROMINOS[type]

  // Calculate proper starting position based on shape width
  const shapeWidth = template.shape[0].length
  const startX = Math.floor((BOARD_WIDTH - shapeWidth) / 2)

  return {
    shape: template.shape.map(row => [...row]),
    color: template.color,
    position: { x: startX, y: 0 },
    type,
  }
}

/**
 * Initialize a new game
 */
export function initializeGame(seed?: number): GameState {
  const gameSeed = seed || Date.now()
  const rng = new SeededRandom(gameSeed)

  const board = initializeBoard()
  const currentPiece = generateTetromino(rng)
  const nextPiece = generateTetromino(rng)

  return {
    board,
    currentPiece,
    nextPiece,
    score: 1,
    level: 1,
    lines: 0,
    moves: [],
    gameOver: false,
    seed: gameSeed,
  }
}

/**
 * Check if a piece can be placed at a position
 */
function canPlacePiece(board: number[][], piece: Tetromino, offsetX: number = 0, offsetY: number = 0): boolean {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const newX = piece.position.x + x + offsetX
        const newY = piece.position.y + y + offsetY

        // Check boundaries
        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
          return false
        }

        // Check collision with existing pieces (only if newY >= 0)
        if (newY >= 0 && board[newY][newX]) {
          return false
        }
      }
    }
  }
  return true
}

/**
 * Lock the current piece into the board
 */
function lockPiece(board: number[][], piece: Tetromino): number[][] {
  const newBoard = board.map(row => [...row])

  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const boardY = piece.position.y + y
        const boardX = piece.position.x + x
        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
          newBoard[boardY][boardX] = piece.shape[y][x]
        }
      }
    }
  }

  return newBoard
}

/**
 * Clear completed lines and return new board and number of lines cleared
 */
function clearLines(board: number[][]): { newBoard: number[][], linesCleared: number } {
  const newBoard: number[][] = []
  let linesCleared = 0

  for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
    if (board[y].every(cell => cell !== 0)) {
      linesCleared++
    } else {
      newBoard.unshift(board[y])
    }
  }

  // Add empty lines at the top
  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array(BOARD_WIDTH).fill(0))
  }

  return { newBoard, linesCleared }
}

/**
 * Rotate piece clockwise
 */
function rotatePiece(piece: Tetromino, clockwise: boolean = true): Tetromino {
  if (piece.type === 'O') {
    return piece // O piece doesn't rotate
  }

  const size = piece.shape.length
  const rotated: number[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(0))

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (clockwise) {
        rotated[x][size - 1 - y] = piece.shape[y][x]
      } else {
        rotated[size - 1 - x][y] = piece.shape[y][x]
      }
    }
  }

  return {
    ...piece,
    shape: rotated,
  }
}

/**
 * Make a move
 */
export function makeMove(state: GameState, direction: Direction): GameState {
  if (state.gameOver || !state.currentPiece) {
    return state
  }

  let newPiece = { ...state.currentPiece, position: { ...state.currentPiece.position } }
  let shouldLock = false

  switch (direction) {
    case 'LEFT':
      if (canPlacePiece(state.board, newPiece, -1, 0)) {
        newPiece.position.x -= 1
      }
      break

    case 'RIGHT':
      if (canPlacePiece(state.board, newPiece, 1, 0)) {
        newPiece.position.x += 1
      }
      break

    case 'DOWN':
      if (canPlacePiece(state.board, newPiece, 0, 1)) {
        newPiece.position.y += 1
      } else {
        shouldLock = true
      }
      break

    case 'HARD_DROP':
      while (canPlacePiece(state.board, newPiece, 0, 1)) {
        newPiece.position.y += 1
      }
      shouldLock = true
      break

    case 'ROTATE_CW':
      const rotatedCW = rotatePiece(newPiece, true)
      if (canPlacePiece(state.board, rotatedCW)) {
        newPiece = rotatedCW
      }
      break

    case 'ROTATE_CCW':
      const rotatedCCW = rotatePiece(newPiece, false)
      if (canPlacePiece(state.board, rotatedCCW)) {
        newPiece = rotatedCCW
      }
      break
  }

  // If piece should lock
  if (shouldLock) {
    let newBoard = lockPiece(state.board, newPiece)
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard)

    const newLines = state.lines + linesCleared
    const newLevel = Math.floor(newLines / 10) + 1
    const newScore = state.score + POINTS_PER_LINE[linesCleared] * newLevel

    // Generate next piece using deterministic RNG
    const rng = new SeededRandom(state.seed)
    // We need to skip to generate the piece that comes AFTER nextPiece
    // Initial game generates 2 pieces (current + next)
    // Each lock generates 1 new piece
    // So we need to generate: 2 + number_of_locks pieces total
    const newMoves = [...state.moves, direction]
    const locksCount = newMoves.filter(m => m === 'DOWN' || m === 'HARD_DROP').length

    // Generate pieces up to this point
    for (let i = 0; i < 2 + locksCount; i++) {
      generateTetromino(rng)
    }
    const nextNextPiece = generateTetromino(rng)

    const nextCurrentPiece = state.nextPiece

    // Check if game over (new piece can't be placed)
    const gameOver = nextCurrentPiece ? !canPlacePiece(clearedBoard, nextCurrentPiece) : true

    return {
      board: clearedBoard,
      currentPiece: gameOver ? null : nextCurrentPiece,
      nextPiece: nextNextPiece,
      score: newScore,
      level: newLevel,
      lines: newLines,
      moves: newMoves,
      gameOver,
      seed: state.seed,
    }
  }

  return {
    ...state,
    currentPiece: newPiece,
    moves: [...state.moves, direction],
  }
}

/**
 * Encode moves to string for blockchain storage
 */
export function encodeMoves(moves: Direction[]): string {
  const moveMap: { [key in Direction]: string } = {
    'LEFT': 'L',
    'RIGHT': 'R',
    'DOWN': 'D',
    'HARD_DROP': 'H',
    'ROTATE_CW': 'C',
    'ROTATE_CCW': 'W',
  }

  return moves.map(move => moveMap[move]).join('')
}

/**
 * Decode moves from string
 */
export function decodeMoves(encoded: string | `0x${string}`): Direction[] {
  if (!encoded || encoded === '0x') return []

  const hex = encoded.startsWith('0x') ? encoded.slice(2) : encoded
  const moves: Direction[] = []

  const enumMap: { [key: number]: Direction } = {
    0: 'LEFT',
    1: 'RIGHT',
    2: 'DOWN',
    3: 'ROTATE_CW',
    4: 'HARD_DROP',
    5: 'ROTATE_CCW',
  }

  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.substring(i, i + 2), 16)
    const direction = enumMap[byte]
    if (direction) {
      moves.push(direction)
    }
  }

  return moves
}

/**
 * Get cell color
 */
export function getCellColor(value: number): string {
  const colors: { [key: number]: string } = {
    0: 'transparent',
    1: '#00f0f0', // I - Cyan
    2: '#f0f000', // O - Yellow
    3: '#a000f0', // T - Purple
    4: '#00f000', // S - Green
    5: '#f00000', // Z - Red
    6: '#0000f0', // J - Blue
    7: '#f0a000', // L - Orange
  }

  return colors[value] || 'transparent'
}
