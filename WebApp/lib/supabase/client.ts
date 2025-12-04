import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export const supabase = createClient(supabaseUrl, supabasePublishableKey)

export type UserScore = {
  id: string
  wallet_address: string
  game_type: string
  game_id_onchain: number
  score: number
  created_at: string
  transaction_hash?: string
}

export type ScoreInsertData = {
  wallet_address: string
  game_type: string
  game_id_onchain: number
  score: number
  transaction_hash: string
}

export async function saveScoreWithVerification(
  data: ScoreInsertData,
  maxRetries: number = 3
): Promise<{ success: boolean; error?: string }> {
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      const response = await fetch('/api/save-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        return { success: true }
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save score')
      }

      return { success: false, error: result.error || 'Unknown error' }

    } catch (error: any) {
      attempt++

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
  }

  return { success: false, error: `Failed to save score after ${maxRetries} attempts` }
}
