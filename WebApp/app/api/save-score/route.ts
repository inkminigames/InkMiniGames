import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createPublicClient, http } from 'viem'
import { inkSepolia } from '@/lib/web3/chains'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!

if (!supabaseSecretKey) {
  throw new Error('SUPABASE_SECRET_KEY environment variable is required')
}


const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey)

const publicClient = createPublicClient({
  chain: inkSepolia,
  transport: http()
})

type ScoreInsertData = {
  wallet_address: string
  game_type: string
  game_id_onchain: number
  score: number
  transaction_hash: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ScoreInsertData
    const { wallet_address, game_type, game_id_onchain, score, transaction_hash } = body

    if (!wallet_address || !game_type || game_id_onchain === undefined || score === undefined || !transaction_hash) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    if (!/^0x[a-fA-F0-9]{64}$/.test(transaction_hash)) {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction hash format' },
        { status: 400 }
      )
    }

    const validGameTypes = ['2048', 'snake', 'tetris', 'memory-match', 'puzzle']
    if (!validGameTypes.includes(game_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid game type' },
        { status: 400 }
      )
    }

    if (score < 0) {
      return NextResponse.json(
        { success: false, error: 'Score must be positive' },
        { status: 400 }
      )
    }

    try {
      const receipt = await publicClient.getTransactionReceipt({
        hash: transaction_hash as `0x${string}`
      })

      if (!receipt || receipt.status !== 'success') {
        return NextResponse.json(
          { success: false, error: 'Transaction not found or failed on-chain' },
          { status: 400 }
        )
      }

      if (receipt.from.toLowerCase() !== wallet_address.toLowerCase()) {
        return NextResponse.json(
          { success: false, error: 'Transaction sender does not match wallet address' },
          { status: 400 }
        )
      }
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: `On-chain verification failed: ${error.message}` },
        { status: 400 }
      )
    }

    const { data: existingByTxHash } = await supabaseAdmin
      .from('user_scores')
      .select('*')
      .eq('transaction_hash', transaction_hash)
      .maybeSingle()

    if (existingByTxHash) {
      return NextResponse.json({ success: true, message: 'Score already exists' })
    }

    const { data: existingByGameId } = await supabaseAdmin
      .from('user_scores')
      .select('*')
      .eq('wallet_address', wallet_address.toLowerCase())
      .eq('game_type', game_type)
      .eq('game_id_onchain', game_id_onchain)
      .maybeSingle()

    if (existingByGameId) {
      return NextResponse.json({ success: true, message: 'Score already exists' })
    }

    const { error: insertError } = await supabaseAdmin
      .from('user_scores')
      .insert({
        wallet_address: wallet_address.toLowerCase(),
        game_type,
        game_id_onchain,
        score,
        transaction_hash
      })

    if (insertError) {
      return NextResponse.json(
        { success: false, error: `Failed to insert score: ${insertError.message}` },
        { status: 500 }
      )
    }

    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('user_scores')
      .select('*')
      .eq('wallet_address', wallet_address.toLowerCase())
      .eq('game_type', game_type)
      .eq('game_id_onchain', game_id_onchain)
      .eq('transaction_hash', transaction_hash)
      .single()

    if (verifyError || !verifyData) {
      return NextResponse.json(
        { success: false, error: 'Failed to verify score insertion' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
