import { Raydium, TxVersion, DEVNET_PROGRAM_ID } from '@raydium-io/raydium-sdk-v2'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'
import Decimal from 'decimal.js'
 
const connection = new Connection('https://api.devnet.solana.com')
const txVersion = TxVersion.V0
 
const devConfigs = [
  {
    id: 'CQYbhr6amxUER4p5SC44C63R4qw4NFc9Z4Db9vF4tZwG',
    index: 0,
    protocolFeeRate: 120000,
    tradeFeeRate: 100,
    tickSpacing: 10,
    fundFeeRate: 40000,
    description: 'Best for very stable pairs',
    defaultRange: 0.005,
    defaultRangePoint: [0.001, 0.003, 0.005, 0.008, 0.01],
  }
]
 
export async function createClmmPool(base58PrivateKey: string, mint1Str: string, mint2Str: string) {
  try {
    console.log(' Decoding private key...')
    const owner = Keypair.fromSecretKey(bs58.decode(base58PrivateKey))
 
    console.log(' Loading Raydium...')
    const raydium = await Raydium.load({
      owner,
      connection,
      cluster: 'devnet',
      disableFeatureCheck: true,
      disableLoadToken: false,
      blockhashCommitment: 'finalized',
    })
 
    console.log(`Getting token info for:\n  Mint1: ${mint1Str}\n  Mint2: ${mint2Str}`)
    const mint1 = await raydium.token.getTokenInfo(mint1Str)
    const mint2 = await raydium.token.getTokenInfo(mint2Str)
 
    const config = {
      ...devConfigs[0],
      id: new PublicKey(devConfigs[0].id),
      fundOwner: '',
      description: devConfigs[0].description,
    }
 
    console.log(' Creating CLMM pool...')
    const { execute } = await raydium.clmm.createPool({
      programId: DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID,
      mint1,
      mint2,
      ammConfig: config,
      initialPrice: new Decimal(1),
      txVersion,
    })
 
    console.log('🚀 Sending transaction...')
    const { txId } = await execute({ sendAndConfirm: true })
    console.log(` Pool created: https://explorer.solana.com/tx/${txId}?cluster=devnet`)
 
    return { success: true, txId }
  } catch (error: any) {
    console.error(' Pool creation failed:', error.message || error)
    return { success: false, error: error.message || error }
  }
}

const base58Key = '3GLmNNC3fBrbejFu5fyZyDa1ZJjR3mojfWtJdNe11eJKZ8wk7QPXpnXUJXgAnD5sjHzkxqVx7tbJwHvzQiCGBR8A'
const mint1 = 'HPr1d9xkK7nEpPmmz5AXYFvhwDaWCpYJijdN6ahjacpz'
const mint2 = 'N1UpuxU4pMpe4L8tPUp5SNWthzGHXf4QbwDKUPkrtkQ'
 
async function main() {
  const result = await createClmmPool(base58Key, mint1, mint2)
 
  if (result.success) {
    console.log('✅ Success:', `https://explorer.solana.com/tx/${result.txId}?cluster=devnet`)
  } else {
    console.error('❌ Error:', result.error)
  }
}
 
main()
 