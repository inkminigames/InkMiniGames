



export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

export interface Position {
  x: number
  y: number
}

export interface GameState {
  snake: Position[] 
  food: Position
  direction: Direction
  nextDirection: Direction
  score: number
  level: number
  moves: Direction[]
  gameOver: boolean
  seed: number
}

const BOARD_WIDTH = 20
const BOARD_HEIGHT = 20
const INITIAL_SNAKE_LENGTH = 3


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




function generateFood(snake: Position[], rng: SeededRandom): Position {
  let food: Position
  let attempts = 0
  const maxAttempts = 100

  do {
    food = {
      x: rng.nextInt(BOARD_WIDTH),
      y: rng.nextInt(BOARD_HEIGHT),
    }
    attempts++
  } while (
    attempts < maxAttempts &&
    snake.some(segment => segment.x === food.x && segment.y === food.y)
  )

  return food
}




export function initializeGame(seed?: number): GameState {
  const gameSeed = seed || Date.now()
  const rng = new SeededRandom(gameSeed)

  
  const startX = Math.floor(BOARD_WIDTH / 2)
  const startY = Math.floor(BOARD_HEIGHT / 2)

  const snake: Position[] = []
  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
    snake.push({ x: startX - i, y: startY })
  }

  const food = generateFood(snake, rng)

  return {
    snake,
    food,
    direction: 'RIGHT',
    nextDirection: 'RIGHT',
    score: 1,
    level: 1,
    moves: [],
    gameOver: false,
    seed: gameSeed,
  }
}




function positionsEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y
}




function isValidDirectionChange(current: Direction, next: Direction): boolean {
  const opposites: { [key in Direction]: Direction } = {
    'UP': 'DOWN',
    'DOWN': 'UP',
    'LEFT': 'RIGHT',
    'RIGHT': 'LEFT',
  }

  return opposites[current] !== next
}




function getNextHeadPosition(head: Position, direction: Direction): Position {
  const newHead = { ...head }

  switch (direction) {
    case 'UP':
      newHead.y -= 1
      break
    case 'DOWN':
      newHead.y += 1
      break
    case 'LEFT':
      newHead.x -= 1
      break
    case 'RIGHT':
      newHead.x += 1
      break
  }

  return newHead
}




function isOutOfBounds(pos: Position): boolean {
  return pos.x < 0 || pos.x >= BOARD_WIDTH || pos.y < 0 || pos.y >= BOARD_HEIGHT
}




function checkSelfCollision(snake: Position[]): boolean {
  const head = snake[0]
  return snake.slice(1).some(segment => positionsEqual(segment, head))
}




export function makeMove(state: GameState, direction: Direction): GameState {
  if (state.gameOver) {
    return state
  }

  
  let nextDirection = state.nextDirection
  if (isValidDirectionChange(state.direction, direction)) {
    nextDirection = direction
  }

  
  const head = state.snake[0]
  const newHead = getNextHeadPosition(head, nextDirection)

  
  if (isOutOfBounds(newHead) || checkSelfCollision([newHead, ...state.snake])) {
    return {
      ...state,
      gameOver: true,
      moves: [...state.moves, nextDirection],
      level: state.level,
    }
  }

  const newSnake = [newHead, ...state.snake]
  let newScore = state.score
  let newFood = state.food

  
  let newLevel = state.level
  if (positionsEqual(newHead, state.food)) {
    newScore += 10
    
    newLevel = Math.floor(newScore / 50) + 1
    
    const rng = new SeededRandom(state.seed)
    
    const foodCount = Math.floor(newScore / 10)
    for (let i = 0; i < foodCount; i++) {
      generateFood(newSnake, rng)
    }
    newFood = generateFood(newSnake, rng)
  } else {
    
    newSnake.pop()
  }

  return {
    snake: newSnake,
    food: newFood,
    direction: nextDirection,
    nextDirection: nextDirection,
    score: newScore,
    level: newLevel,
    moves: [...state.moves, nextDirection],
    gameOver: false,
    seed: state.seed,
  }
}




export function autoMove(state: GameState): GameState {
  return makeMove(state, state.nextDirection)
}




export function encodeMoves(moves: Direction[]): string {
  const moveMap: { [key in Direction]: string } = {
    'UP': 'U',
    'DOWN': 'D',
    'LEFT': 'L',
    'RIGHT': 'R',
  }

  return moves.map(move => moveMap[move]).join('')
}




export function decodeMoves(encoded: string | `0x${string}` | Uint8Array): Direction[] {
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

  const moveMap: { [key: string]: Direction } = {
    'U': 'UP',
    'D': 'DOWN',
    'L': 'LEFT',
    'R': 'RIGHT',
  }

  return moveString.split('').map(char => moveMap[char]).filter(Boolean)
}




export function getBoardDimensions() {
  return { width: BOARD_WIDTH, height: BOARD_HEIGHT }
}




export function isSnakeHead(pos: Position, snake: Position[]): boolean {
  return positionsEqual(pos, snake[0])
}




export function isSnakeBody(pos: Position, snake: Position[]): boolean {
  return snake.slice(1).some(segment => positionsEqual(segment, pos))
}




export function isFood(pos: Position, food: Position): boolean {
  return positionsEqual(pos, food)
}
