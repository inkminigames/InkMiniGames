import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { type Chain } from 'viem'
import { ink, inkSepolia } from './chains'

let cachedConfig: ReturnType<typeof getDefaultConfig> | null = null

const isMainnet = process.env.NEXT_PUBLIC_ENABLE_MAINNET === 'true'
const chains: [Chain, ...Chain[]] = isMainnet ? [ink] : [inkSepolia]

export const getConfig = () => {
  if (!cachedConfig) {
    cachedConfig = getDefaultConfig({
      appName: 'Ink Mini Games',
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'PROJECT_ID',
      chains,
      ssr: true,
    })
  }
  return cachedConfig
}

export const config = getConfig()
