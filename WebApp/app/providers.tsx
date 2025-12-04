'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { ReactNode, useState, useMemo } from 'react'
import { config } from '@/lib/web3/config'
import { ToastProvider } from '@/components/providers/ToastProvider'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  }))

  const rainbowKitTheme = useMemo(() => darkTheme({
    accentColor: '#8b5cf6',
    accentColorForeground: 'white',
    borderRadius: 'none',
    fontStack: 'rounded',
  }), [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowKitTheme}>
          <ToastProvider />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
