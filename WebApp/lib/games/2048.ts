// 2048 Game Logic

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
export type Board = number[][]
export type Move = Direction

// Seeded RNG for deterministic gameplay
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

export interface GameState {
  board: Board
  score: number
  moves: Move[]
  gameOver: boolean
  won: boolean
  rng?: SeededRandom // For deterministic tile placement
  seed?: number // Initial seed for replay
}

// Initialize a 4x4 board with two random tiles using a seed
export function initializeBoard(seed?: number): Board {
  const gameSeed = seed || Date.now()
  const rng = new SeededRandom(gameSeed)
  const board: Board = Array(4).fill(null).map(() => Array(4).fill(0))
  addRandomTile(board, rng)
  addRandomTile(board, rng)
  return board
}

// Add a random tile (90% chance of 2, 10% chance of 4) using seeded RNG
function addRandomTile(board: Board, rng: SeededRandom): boolean {
  const emptyTiles: [number, number][] = []

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] === 0) {
        emptyTiles.push([i, j])
      }
    }
  }

  if (emptyTiles.length === 0) return false

  const [row, col] = emptyTiles[rng.nextInt(emptyTiles.length)]
  board[row][col] = rng.next() < 0.9 ? 2 : 4
  return true
}

// Move tiles in a direction
export function move(board: Board, direction: Direction): { board: Board; score: number; moved: boolean } {
  const newBoard = board.map(row => [...row])
  let score = 0
  let moved = false

  switch (direction) {
    case 'UP':
      for (let col = 0; col < 4; col++) {
        const column = [newBoard[0][col], newBoard[1][col], newBoard[2][col], newBoard[3][col]]
        const { line: newColumn, score: colScore, moved: colMoved } = mergeLine(column)
        for (let row = 0; row < 4; row++) {
          newBoard[row][col] = newColumn[row]
        }
        score += colScore
        moved = moved || colMoved
      }
      break

    case 'DOWN':
      for (let col = 0; col < 4; col++) {
        const column = [newBoard[3][col], newBoard[2][col], newBoard[1][col], newBoard[0][col]]
        const { line: newColumn, score: colScore, moved: colMoved } = mergeLine(column)
        for (let row = 0; row < 4; row++) {
          newBoard[3 - row][col] = newColumn[row]
        }
        score += colScore
        moved = moved || colMoved
      }
      break

    case 'LEFT':
      for (let row = 0; row < 4; row++) {
        const { line: newRow, score: rowScore, moved: rowMoved } = mergeLine(newBoard[row])
        newBoard[row] = newRow
        score += rowScore
        moved = moved || rowMoved
      }
      break

    case 'RIGHT':
      for (let row = 0; row < 4; row++) {
        const reversed = [...newBoard[row]].reverse()
        const { line: newRow, score: rowScore, moved: rowMoved } = mergeLine(reversed)
        newBoard[row] = newRow.reverse()
        score += rowScore
        moved = moved || rowMoved
      }
      break
  }

  return { board: newBoard, score, moved }
}

// Merge a line (row or column)
function mergeLine(line: number[]): { line: number[]; score: number; moved: boolean } {
  const original = [...line]

  // Remove zeros
  let newLine = line.filter(val => val !== 0)
  let score = 0
  let moved = false

  // Merge adjacent equal tiles
  for (let i = 0; i < newLine.length - 1; i++) {
    if (newLine[i] === newLine[i + 1]) {
      newLine[i] *= 2
      score += newLine[i]
      newLine.splice(i + 1, 1)
    }
  }

  // Fill with zeros
  while (newLine.length < 4) {
    newLine.push(0)
  }

  // Check if anything changed
  moved = JSON.stringify(original) !== JSON.stringify(newLine)

  return { line: newLine, score, moved }
}

// Check if game is over (no moves possible)
export function isGameOver(board: Board): boolean {
  // Check for empty tiles
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] === 0) return false
    }
  }

  // Check for possible merges horizontally
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i][j] === board[i][j + 1]) return false
    }
  }

  // Check for possible merges vertically
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] === board[i + 1][j]) return false
    }
  }

  return true
}

// Check if player won (reached 2048)
export function hasWon(board: Board): boolean {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] >= 2048) return true
    }
  }
  return false
}

// Make a move and update game state
export function makeMove(state: GameState, direction: Direction): GameState {
  if (state.gameOver) return state

  const { board: newBoard, score: moveScore, moved } = move(state.board, direction)

  if (!moved) return state

  // Ensure we have an RNG - create one from seed or current state
  let rng = state.rng
  if (!rng) {
    // If no RNG exists, create one from seed or use a default
    const seed = state.seed || Date.now()
    rng = new SeededRandom(seed)

    // Advance RNG to current state based on number of moves
    // Each move uses the RNG twice (position and value)
    for (let i = 0; i < state.moves.length * 2; i++) {
      rng.next()
    }
  }

  // Add random tile using seeded RNG
  const boardWithNewTile = newBoard.map(row => [...row])
  addRandomTile(boardWithNewTile, rng)

  const newScore = state.score + moveScore
  const won = hasWon(boardWithNewTile)
  const gameOver = isGameOver(boardWithNewTile)
  const moves = [...state.moves, direction]

  return {
    board: boardWithNewTile,
    score: newScore,
    moves,
    gameOver,
    won,
    rng,
    seed: state.seed,
  }
}

// Convert board to flat array for smart contract
export function boardToArray(board: Board): number[] {
  return board.flat()
}

// Convert flat array to board
export function arrayToBoard(arr: number[]): Board {
  const board: Board = []
  for (let i = 0; i < 4; i++) {
    board.push(arr.slice(i * 4, (i + 1) * 4))
  }
  return board
}

// Create a deterministic seed from a board state (for replays)
export function boardToSeed(board: Board): number {
  // Create a simple hash from the board state
  let hash = 0
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      hash = ((hash << 5) - hash) + board[i][j]
      hash = hash & hash // Convert to 32bit integer
    }
  }
  return Math.abs(hash) || 1 // Ensure non-zero
}

// Encode moves as bytes (for smart contract)
export function encodeMoves(moves: Move[]): string {
  const moveMap: Record<Move, string> = {
    UP: '0',
    DOWN: '1',
    LEFT: '2',
    RIGHT: '3',
  }
  return moves.map(m => moveMap[m]).join('')
}

// Decode moves from bytes
export function decodeMoves(encoded: string | `0x${string}`): Move[] {
  if (!encoded || encoded === '0x') return []

  let moveString = encoded

  // If it's hex encoded (starts with 0x), convert from hex to string
  if (encoded.startsWith('0x')) {
    const hex = encoded.slice(2)
    // Convert hex pairs to characters
    moveString = ''
    for (let i = 0; i < hex.length; i += 2) {
      const byte = parseInt(hex.substr(i, 2), 16)
      moveString += String.fromCharCode(byte)
    }
  }

  const reverseMap: Record<string, Move> = {
    '0': 'UP',
    '1': 'DOWN',
    '2': 'LEFT',
    '3': 'RIGHT',
  }
  return moveString.split('').map(c => reverseMap[c]).filter(Boolean)
}
