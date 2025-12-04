import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
      // First check if the score already exists (check by transaction hash first)
      const { data: existingByTxHash } = await supabase
        .from('user_scores')
        .select('*')
        .eq('transaction_hash', data.transaction_hash)
        .maybeSingle()

      if (existingByTxHash) {
        return { success: true }
      }

      // Check by the unique constraint: (wallet_address, game_type, game_id_onchain)
      const { data: existingByGameId } = await supabase
        .from('user_scores')
        .select('*')
        .eq('wallet_address', data.wallet_address)
        .eq('game_type', data.game_type)
        .eq('game_id_onchain', data.game_id_onchain)
        .maybeSingle()

      if (existingByGameId) {
        // This exact game already exists
        return { success: true }
      }

      const { error: insertError } = await supabase
        .from('user_scores')
        .insert(data)

      if (insertError) {
        throw new Error(`Failed to insert score: ${insertError.message}`)
      }

      // Verify the insert
      const { data: verifyData, error: verifyError } = await supabase
        .from('user_scores')
        .select('*')
        .eq('wallet_address', data.wallet_address)
        .eq('game_type', data.game_type)
        .eq('game_id_onchain', data.game_id_onchain)
        .eq('transaction_hash', data.transaction_hash)
        .single()

      if (verifyError || !verifyData) {
        attempt++

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
        continue
      }

      return { success: true }

    } catch (error: any) {
      attempt++

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
  }

  return { success: false, error: `Failed to save score after ${maxRetries} attempts` }
}
