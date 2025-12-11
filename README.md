# Ink Mini Games

A collection of competitive mini games built on Ink blockchain with on-chain score verification and unified leaderboards.

## Overview

Ink Mini Games is a web3 gaming platform where players compete across multiple mini games. Game states and scores are stored on-chain, enabling verifiable achievements and transparent leaderboards.

## Features

- Five playable games: 2048, Snake, Tetris, Memory Match, and Jigsaw Puzzle
- On-chain game initialization and score submission
- Unified leaderboard across all games
- Replay system to watch previous games
- Game fee system (configurable per game)
- Dynamic puzzle image system with automatic detection

## Tech Stack

**Smart Contracts**
- Solidity
- Hardhat
- Deployed on Ink Sepolia and Ink Mainnet

**Frontend**
- Next.js 14 with TypeScript
- Tailwind CSS v4
- wagmi v2 + viem + RainbowKit
- Framer Motion
- Supabase

## Project Structure

```
InkMiniGames/
├── SmartContracts/
│   └── contracts/        # Game smart contracts
└── WebApp/
    ├── app/             # Next.js pages
    ├── components/      # React components
    └── lib/             # Game logic & utilities
```

## Games

### 2048
Classic 2048 tile-merging puzzle game with score multipliers

### Snake
Navigate the snake to eat food and grow while avoiding walls and yourself

### Tetris
Stack falling blocks to clear lines and score points

### Memory Match
Match pairs of cards in a memory challenge game with three difficulty levels

### Jigsaw Puzzle
Solve realistic jigsaw puzzles with interlocking pieces
- Three difficulty levels (3x3, 4x4, 5x5 grids)
- Real puzzle piece shapes with tabs and blanks that interlock
- Custom images - automatically detected from `/public/puzzle-images/`
- Drag and drop mechanics
- Time and move bonuses

## How It Works

1. **Connect Wallet**: Sign in with your EVM wallet on Ink
2. **Start Game**: Pay entry fee to initialize game on-chain
3. **Play**: All gameplay happens client-side (no gas during play)
4. **Submit Score**: When finished, submit score on-chain for leaderboard

## Adding Puzzle Images

To add custom images for the Jigsaw Puzzle game:

1. Place square images (1:1 aspect ratio) in `WebApp/public/puzzle-images/`
2. Supported formats: `.png`, `.jpg`, `.jpeg`, `.webp`
3. Images are automatically detected - no code changes needed
4. Recommended size: 1000x1000 pixels or larger

## Network Information

**Ink Sepolia (Testnet)**
- Chain ID: 763373
- RPC: https://rpc-gel-sepolia.inkonchain.com

**Ink Mainnet**
- Chain ID: 57073
- RPC: https://rpc-gel.inkonchain.com

## License

MIT

Built on Ink
