

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
export type Board = number[][]
export type Move = Direction


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
  rng?: SeededRandom 
  seed?: number 
}


export function initializeBoard(seed?: number): Board {
  const gameSeed = seed || Date.now()
  const rng = new SeededRandom(gameSeed)
  const board: Board = Array(4).fill(null).map(() => Array(4).fill(0))
  addRandomTile(board, rng)
  addRandomTile(board, rng)
  return board
}


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


function mergeLine(line: number[]): { line: number[]; score: number; moved: boolean } {
  const original = [...line]

  
  let newLine = line.filter(val => val !== 0)
  let score = 0
  let moved = false

  
  for (let i = 0; i < newLine.length - 1; i++) {
    if (newLine[i] === newLine[i + 1]) {
      newLine[i] *= 2
      score += newLine[i]
      newLine.splice(i + 1, 1)
    }
  }

  
  while (newLine.length < 4) {
    newLine.push(0)
  }

  
  moved = JSON.stringify(original) !== JSON.stringify(newLine)

  return { line: newLine, score, moved }
}


export function isGameOver(board: Board): boolean {
  
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] === 0) return false
    }
  }

  
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i][j] === board[i][j + 1]) return false
    }
  }

  
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] === board[i + 1][j]) return false
    }
  }

  return true
}


export function hasWon(board: Board): boolean {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] >= 2048) return true
    }
  }
  return false
}


export function makeMove(state: GameState, direction: Direction): GameState {
  if (state.gameOver) return state

  const { board: newBoard, score: moveScore, moved } = move(state.board, direction)

  if (!moved) return state

  
  let rng = state.rng
  if (!rng) {
    
    const seed = state.seed || Date.now()
    rng = new SeededRandom(seed)

    
    
    for (let i = 0; i < state.moves.length * 2; i++) {
      rng.next()
    }
  }

  
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


export function boardToArray(board: Board): number[] {
  return board.flat()
}


export function arrayToBoard(arr: number[]): Board {
  const board: Board = []
  for (let i = 0; i < 4; i++) {
    board.push(arr.slice(i * 4, (i + 1) * 4))
  }
  return board
}


export function boardToSeed(board: Board): number {
  
  let hash = 0
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      hash = ((hash << 5) - hash) + board[i][j]
      hash = hash & hash 
    }
  }
  return Math.abs(hash) || 1 
}


export function encodeMoves(moves: Move[]): string {
  const moveMap: Record<Move, string> = {
    UP: '0',
    DOWN: '1',
    LEFT: '2',
    RIGHT: '3',
  }
  return moves.map(m => moveMap[m]).join('')
}


export function decodeMoves(encoded: string | `0x${string}` | Uint8Array): Move[] {
  if (!encoded) return []

  let moveString = ''

  
  if (encoded instanceof Uint8Array) {
    moveString = Array.from(encoded).map(byte => String.fromCharCode(byte)).join('')
  } else if (encoded === '0x') {
    return []
  } else if (typeof encoded === 'string') {
    
    if (encoded.startsWith('0x')) {
      const hex = encoded.slice(2)
      
      for (let i = 0; i < hex.length; i += 2) {
        const byte = parseInt(hex.substr(i, 2), 16)
        moveString += String.fromCharCode(byte)
      }
    } else {
      moveString = encoded
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
