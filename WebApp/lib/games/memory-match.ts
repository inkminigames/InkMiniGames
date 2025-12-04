export type Card = {
  id: number
  value: string
  isFlipped: boolean
  isMatched: boolean
}

export type Move = {
  cardIndex: number
  timestamp: number
}

export type Level = 1 | 2 | 3

export type GameState = {
  cards: Card[]
  flippedCards: number[]
  matchedPairs: number
  attempts: number
  maxAttempts: number
  score: number
  gameOver: boolean
  won: boolean
  moves: Move[]
  theme: string
  startTime: number
  hintsRemaining: number
  hintedCards: number[]
  level: Level
}

export const THEMES = {
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦'],
  fruits: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🥝', '🍍', '🥭', '🍈', '🥥', '🍅', '🫐', '🥑', '🍐'],
  nature: ['🌸', '🌺', '🌻', '🌷', '🌹', '🌼', '🌵', '🍀', '🌿', '☘️', '🌾', '🌴', '🍁', '🍂', '🌱', '🪴', '🌳', '🌲'],
  space: ['🌟', '⭐', '✨', '💫', '🌙', '☀️', '🪐', '🌍', '🌎', '🌏', '🚀', '🛸', '🌠', '☄️', '🌌', '🔭', '👽', '🛰️'],
  food: ['🍕', '🍔', '🌮', '🌯', '🥗', '🍣', '🍜', '🍝', '🥘', '🍲', '🥙', '🌭', '🥐', '🍩', '🍪', '🧁', '🎂', '🍰']
}

export const LEVEL_CONFIG = {
  1: { gridSize: 6, pairsCount: 3, gridCols: 3, gridRows: 2, maxAttempts: 15, pointsPerMatch: 50 },
  2: { gridSize: 16, pairsCount: 8, gridCols: 4, gridRows: 4, maxAttempts: 35, pointsPerMatch: 100 },
  3: { gridSize: 36, pairsCount: 18, gridCols: 6, gridRows: 6, maxAttempts: 50, pointsPerMatch: 150 }
}

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

export function initializeGame(seed?: number, level: Level = 3): GameState {
  const gameSeed = seed || Date.now()
  const rng = new SeededRandom(gameSeed)
  const config = LEVEL_CONFIG[level]

  const themeKeys = Object.keys(THEMES) as Array<keyof typeof THEMES>
  const selectedTheme = themeKeys[rng.nextInt(themeKeys.length)]
  const themeEmojis = THEMES[selectedTheme]

  const shuffled = [...themeEmojis].sort(() => rng.next() - 0.5)
  const selectedEmojis = shuffled.slice(0, config.pairsCount)

  const cardValues = [...selectedEmojis, ...selectedEmojis]

  
  const cardsNeeded = config.gridSize - cardValues.length
  for (let i = 0; i < cardsNeeded; i++) {
    cardValues.push('') 
  }

  for (let i = cardValues.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [cardValues[i], cardValues[j]] = [cardValues[j], cardValues[i]]
  }

  const cards: Card[] = cardValues.map((value, index) => ({
    id: index,
    value,
    isFlipped: false,
    isMatched: false
  }))

  return {
    cards,
    flippedCards: [],
    matchedPairs: 0,
    attempts: 0,
    maxAttempts: config.maxAttempts,
    score: 1,
    gameOver: false,
    won: false,
    moves: [],
    theme: selectedTheme,
    startTime: Date.now(),
    hintsRemaining: 5,
    hintedCards: [],
    level
  }
}

export function flipCard(state: GameState, cardIndex: number): GameState {
  if (state.gameOver) return state
  if (state.flippedCards.length >= 2) return state
  if (state.cards[cardIndex].isMatched) return state
  if (state.cards[cardIndex].isFlipped) return state

  
  if (!state.cards[cardIndex].value) return state

  const config = LEVEL_CONFIG[state.level]

  const newCards = state.cards.map((card, idx) => {
    if (idx === cardIndex) {
      return { ...card, isFlipped: true }
    }
    return card
  })

  const newFlippedCards = [...state.flippedCards, cardIndex]
  const newMoves = [...state.moves, { cardIndex, timestamp: Date.now() }]

  if (newFlippedCards.length === 2) {
    const [first, second] = newFlippedCards
    const firstCard = newCards[first]
    const secondCard = newCards[second]

    if (firstCard.value === secondCard.value && firstCard.value !== '') {
      newCards[first] = { ...firstCard, isMatched: true }
      newCards[second] = { ...secondCard, isMatched: true }

      const newMatchedPairs = state.matchedPairs + 1
      const newAttempts = state.attempts + 1
      const baseScore = config.pointsPerMatch
      const timeBonus = Math.max(0, 50 - Math.floor((Date.now() - state.startTime) / 1000))
      const attemptBonus = Math.max(0, (state.maxAttempts - newAttempts) * 2)
      const newScore = state.score + baseScore + timeBonus + attemptBonus

      const won = newMatchedPairs === config.pairsCount
      const gameOver = won || newAttempts >= state.maxAttempts

      return {
        ...state,
        cards: newCards,
        flippedCards: [],
        matchedPairs: newMatchedPairs,
        attempts: newAttempts,
        score: newScore,
        won,
        gameOver,
        moves: newMoves
      }
    } else {
      return {
        ...state,
        cards: newCards,
        flippedCards: newFlippedCards,
        attempts: state.attempts + 1,
        moves: newMoves,
        gameOver: state.attempts + 1 >= state.maxAttempts
      }
    }
  }

  return {
    ...state,
    cards: newCards,
    flippedCards: newFlippedCards,
    moves: newMoves
  }
}

export function unflipCards(state: GameState): GameState {
  if (state.flippedCards.length !== 2) return state

  const newCards = state.cards.map(card => {
    if (card.isFlipped && !card.isMatched) {
      return { ...card, isFlipped: false }
    }
    return card
  })

  return {
    ...state,
    cards: newCards,
    flippedCards: []
  }
}

export function useHint(state: GameState): GameState {
  if (state.hintsRemaining <= 0 || state.gameOver) return state

  
  const unmatchedCards = state.cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => !card.isMatched && !card.isFlipped)

  if (unmatchedCards.length === 0) return state

  
  const cardsToReveal = Math.min(5, unmatchedCards.length)
  const shuffled = [...unmatchedCards].sort(() => Math.random() - 0.5)
  const selectedIndices = shuffled.slice(0, cardsToReveal).map(({ index }) => index)

  return {
    ...state,
    hintsRemaining: state.hintsRemaining - 1,
    hintedCards: selectedIndices
  }
}

export function clearHints(state: GameState): GameState {
  return {
    ...state,
    hintedCards: []
  }
}

export function encodeMoves(moves: Move[]): Uint8Array {
  const buffer = new Uint8Array(moves.length * 2)
  moves.forEach((move, i) => {
    buffer[i * 2] = move.cardIndex
    buffer[i * 2 + 1] = 0
  })
  return buffer
}

export function decodeMoves(encoded: string | `0x${string}` | Uint8Array): Move[] {
  if (!encoded) return []

  const moves: Move[] = []

  if (encoded instanceof Uint8Array) {
    
    for (let i = 0; i < encoded.length; i += 2) {
      moves.push({ cardIndex: encoded[i], timestamp: 0 })
    }
  } else if (encoded === '0x') {
    return []
  } else if (typeof encoded === 'string') {
    const hex = encoded.startsWith('0x') ? encoded.slice(2) : encoded
    
    for (let i = 0; i < hex.length; i += 4) {
      const byte = parseInt(hex.substring(i, i + 2), 16)
      moves.push({ cardIndex: byte, timestamp: 0 })
    }
  }

  return moves
}

export function gridToArray(cards: Card[], gridSize: number): number[] {
  return cards.slice(0, gridSize).map(card => {
    if (!card.value) return 0 
    const themeKeys = Object.keys(THEMES) as Array<keyof typeof THEMES>
    for (const theme of themeKeys) {
      const index = THEMES[theme].indexOf(card.value)
      if (index !== -1) return index
    }
    return 0
  })
}

export function arrayToGrid(arr: number[], theme: string): Card[] {
  const themeEmojis = THEMES[theme as keyof typeof THEMES] || THEMES.animals
  const cards = arr.map((value, index) => ({
    id: index,
    value: themeEmojis[value] || '❓',
    isFlipped: false,
    isMatched: false
  }))

  return cards
}
