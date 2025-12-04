import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { ink, inkSepolia } from './chains'

let cachedConfig: ReturnType<typeof getDefaultConfig> | null = null

export const getConfig = () => {
  if (!cachedConfig) {
    cachedConfig = getDefaultConfig({
      appName: 'Ink Mini Games',
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
      chains: [
        inkSepolia,
        ...(process.env.NEXT_PUBLIC_ENABLE_MAINNET === 'true' ? [ink] : []),
      ],
      ssr: true,
    })
  }
  return cachedConfig
}

export const config = getConfig()
