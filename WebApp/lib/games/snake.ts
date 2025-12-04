/**
 * Snake Game Logic
 */

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

export interface Position {
  x: number
  y: number
}

export interface GameState {
  snake: Position[] // Array of positions, head is at index 0
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
 * Generate food position that doesn't collide with snake
 */
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

/**
 * Initialize a new game
 */
export function initializeGame(seed?: number): GameState {
  const gameSeed = seed || Date.now()
  const rng = new SeededRandom(gameSeed)

  // Initialize snake in the middle, moving right
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

/**
 * Check if two positions are equal
 */
function positionsEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y
}

/**
 * Check if direction change is valid (can't reverse direction)
 */
function isValidDirectionChange(current: Direction, next: Direction): boolean {
  const opposites: { [key in Direction]: Direction } = {
    'UP': 'DOWN',
    'DOWN': 'UP',
    'LEFT': 'RIGHT',
    'RIGHT': 'LEFT',
  }

  return opposites[current] !== next
}

/**
 * Get next head position based on direction
 */
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

/**
 * Check if position is out of bounds
 */
function isOutOfBounds(pos: Position): boolean {
  return pos.x < 0 || pos.x >= BOARD_WIDTH || pos.y < 0 || pos.y >= BOARD_HEIGHT
}

/**
 * Check if snake collides with itself
 */
function checkSelfCollision(snake: Position[]): boolean {
  const head = snake[0]
  return snake.slice(1).some(segment => positionsEqual(segment, head))
}

/**
 * Make a move
 */
export function makeMove(state: GameState, direction: Direction): GameState {
  if (state.gameOver) {
    return state
  }

  // Update next direction if it's a valid change
  let nextDirection = state.nextDirection
  let directionChanged = false
  if (isValidDirectionChange(state.direction, direction)) {
    nextDirection = direction
    // Only count as a move if direction actually changed
    directionChanged = direction !== state.direction
  }

  // Move snake using the nextDirection
  const head = state.snake[0]
  const newHead = getNextHeadPosition(head, nextDirection)

  // Check collisions
  if (isOutOfBounds(newHead) || checkSelfCollision([newHead, ...state.snake])) {
    return {
      ...state,
      gameOver: true,
      moves: directionChanged ? [...state.moves, direction] : state.moves,
      level: state.level,
    }
  }

  const newSnake = [newHead, ...state.snake]
  let newScore = state.score
  let newFood = state.food

  // Check if food is eaten
  let newLevel = state.level
  if (positionsEqual(newHead, state.food)) {
    newScore += 10
    // Level up every 50 points
    newLevel = Math.floor(newScore / 50) + 1
    // Generate new food using deterministic RNG
    const rng = new SeededRandom(state.seed)
    // Skip to correct position in RNG sequence based on number of food eaten
    const foodCount = Math.floor(newScore / 10)
    for (let i = 0; i < foodCount; i++) {
      generateFood(newSnake, rng)
    }
    newFood = generateFood(newSnake, rng)
  } else {
    // Remove tail if no food eaten
    newSnake.pop()
  }

  return {
    snake: newSnake,
    food: newFood,
    direction: nextDirection,
    nextDirection: nextDirection,
    score: newScore,
    level: newLevel,
    moves: directionChanged ? [...state.moves, direction] : state.moves,
    gameOver: false,
    seed: state.seed,
  }
}

/**
 * Auto-move (continue in current direction)
 */
export function autoMove(state: GameState): GameState {
  return makeMove(state, state.nextDirection)
}

/**
 * Encode moves to string for blockchain storage
 */
export function encodeMoves(moves: Direction[]): string {
  const moveMap: { [key in Direction]: string } = {
    'UP': 'U',
    'DOWN': 'D',
    'LEFT': 'L',
    'RIGHT': 'R',
  }

  return moves.map(move => moveMap[move]).join('')
}

/**
 * Decode moves from string
 */
export function decodeMoves(encoded: string | `0x${string}`): Direction[] {
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

  const moveMap: { [key: string]: Direction } = {
    'U': 'UP',
    'D': 'DOWN',
    'L': 'LEFT',
    'R': 'RIGHT',
  }

  return moveString.split('').map(char => moveMap[char]).filter(Boolean)
}

/**
 * Get board dimensions
 */
export function getBoardDimensions() {
  return { width: BOARD_WIDTH, height: BOARD_HEIGHT }
}

/**
 * Check if position is snake head
 */
export function isSnakeHead(pos: Position, snake: Position[]): boolean {
  return positionsEqual(pos, snake[0])
}

/**
 * Check if position is snake body
 */
export function isSnakeBody(pos: Position, snake: Position[]): boolean {
  return snake.slice(1).some(segment => positionsEqual(segment, pos))
}

/**
 * Check if position is food
 */
export function isFood(pos: Position, food: Position): boolean {
  return positionsEqual(pos, food)
}
