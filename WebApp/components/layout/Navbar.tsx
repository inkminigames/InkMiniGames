'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import Image from 'next/image'
import { Container } from '@/components/ui/Container'
import { usePathname } from 'next/navigation'

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-white/[0.08] bg-black/95 backdrop-blur-2xl">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-purple/5" />
      <Container>
        <div className="relative flex h-28 items-center justify-between">
          <Link
            href="/"
            className="group flex items-center gap-3"
          >
            <div className="relative h-16 w-48 transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_12px_rgba(139,92,246,0.8)]">
              <Image
                src="/ink_mini_games_transp_logo.png"
                alt="Ink Mini Games"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className={`relative px-8 py-3 text-lg border overflow-hidden group ${
                pathname === '/'
                  ? 'text-white bg-white/5 border-primary'
                  : 'text-white/70 bg-white/[0.02] border-white/10'
              }`}
            >
              <span className="relative z-10 transition-colors duration-300 group-hover:text-white">Home</span>
              {pathname !== '/' && (
                <div className="absolute inset-0 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              )}
            </Link>
            <Link
              href="/games"
              className={`relative px-8 py-3 text-lg border overflow-hidden group ${
                pathname === '/games'
                  ? 'text-white bg-white/5 border-primary'
                  : 'text-white/70 bg-white/[0.02] border-white/10'
              }`}
            >
              <span className="relative z-10 transition-colors duration-300 group-hover:text-white">Games</span>
              {pathname !== '/games' && (
                <div className="absolute inset-0 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              )}
            </Link>
            <Link
              href="/leaderboard"
              className={`relative px-8 py-3 text-lg border overflow-hidden group ${
                pathname === '/leaderboard'
                  ? 'text-white bg-white/5 border-primary'
                  : 'text-white/70 bg-white/[0.02] border-white/10'
              }`}
            >
              <span className="relative z-10 transition-colors duration-300 group-hover:text-white">Leaderboard</span>
              {pathname !== '/leaderboard' && (
                <div className="absolute inset-0 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              )}
            </Link>
            <Link
              href="/replay"
              className={`relative px-8 py-3 text-lg border overflow-hidden group ${
                pathname === '/replay'
                  ? 'text-white bg-white/5 border-primary'
                  : 'text-white/70 bg-white/[0.02] border-white/10'
              }`}
            >
              <span className="relative z-10 transition-colors duration-300 group-hover:text-white">Replay</span>
              {pathname !== '/replay' && (
                <div className="absolute inset-0 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              )}
            </Link>
          </div>

          <div className="flex items-center">
            <ConnectButton
              chainStatus="icon"
              showBalance={false}
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          </div>
        </div>
      </Container>
    </nav>
  )
}
