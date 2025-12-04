# Ink Mini Games

A collection of competitive mini games built on Ink blockchain with on-chain score verification and unified leaderboards.

## Overview

Ink Mini Games is a web3 gaming platform where players compete across multiple mini games. Game states and scores are stored on-chain, enabling verifiable achievements and transparent leaderboards.

## Features

- Four playable games: 2048, Snake, Tetris, and Memory Match
- On-chain game initialization and score submission
- Unified leaderboard across all games
- Replay system to watch previous games
- Game fee system (configurable per game)

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

## How It Works

1. **Connect Wallet**: Sign in with your EVM wallet on Ink
2. **Start Game**: Pay entry fee to initialize game on-chain
3. **Play**: All gameplay happens client-side (no gas during play)
4. **Submit Score**: When finished, submit score on-chain for leaderboard

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
