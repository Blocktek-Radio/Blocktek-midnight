import { randomBytes } from "node:crypto"
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { firstValueFrom } from "rxjs"
import { getNetworkId, setNetworkId } from "@midnight-ntwrk/midnight-js-network-id"
import { DustSecretKey, ZswapSecretKeys, unshieldedToken } from "@midnight-ntwrk/midnight-js-protocol/ledger"
import { FluentWalletBuilder, type EnvironmentConfiguration } from "@midnight-ntwrk/testkit-js"
import { UnshieldedAddress } from "@midnight-ntwrk/wallet-sdk-address-format"

const requiredNode = [24, 11, 1]
const actualNode = process.versions.node.split(".").map(Number)
const nodeIsSupported = actualNode[0] > requiredNode[0]
  || actualNode[0] === requiredNode[0] && (actualNode[1] > requiredNode[1] || actualNode[1] === requiredNode[1] && actualNode[2] >= requiredNode[2])
if (!nodeIsSupported) throw new Error("Midnight wallet tooling requires Node.js >= 24.11.1")

const network = "preprod" as const
const walletFile = process.env.BLOCKTEK_MIDNIGHT_WALLET_FILE || "/etc/blocktek-radio/midnight-wallet.env"
const environment: EnvironmentConfiguration = {
  walletNetworkId: network,
  networkId: network,
  indexer: "https://indexer.preprod.midnight.network/api/v4/graphql",
  indexerWS: "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
  node: "https://rpc.preprod.midnight.network",
  nodeWS: "wss://rpc.preprod.midnight.network",
  faucet: "https://midnight-tmnight-preprod.nethermind.dev/",
  proofServer: "http://127.0.0.1:6300",
}

const readSeed = async (): Promise<string | null> => {
  try {
    const contents = await readFile(walletFile, "utf8")
    const match = contents.match(/^MIDNIGHT_WALLET_SEED=([0-9a-f]{64})$/m)
    return match?.[1] || null
  } catch {
    return null
  }
}

type WalletState = {
  address: UnshieldedAddress
  balances?: Record<string, bigint>
}

type TestWallet = {
  start: (...args: unknown[]) => Promise<void>
  stop: () => Promise<void>
  unshielded: { state: unknown }
  state: () => { pipe: () => unknown }
}

const main = async (): Promise<void> => {
  const seed = (await readSeed()) || randomBytes(32).toString("hex")
  await mkdir(dirname(walletFile), { recursive: true, mode: 0o700 })
  await writeFile(walletFile, `MIDNIGHT_WALLET_SEED=${seed}\n`, { mode: 0o600 })
  await chmod(walletFile, 0o600)

  setNetworkId(network)
  const builder = FluentWalletBuilder.forEnvironment(environment).withSeed(seed)
  const buildResult = await builder.buildWithoutStarting()
  const built = buildResult as unknown as {
    wallet: TestWallet
    seeds: { shielded: Uint8Array; dust: Uint8Array }
  }
  const wallet = built.wallet

  try {
    await wallet.start(ZswapSecretKeys.fromSeed(built.seeds.shielded), DustSecretKey.fromSeed(built.seeds.dust))
    const state = await firstValueFrom(wallet.unshielded.state as never) as WalletState
    const address = UnshieldedAddress.codec.encode(getNetworkId(), state.address).toString()
    let balance = state.balances?.[unshieldedToken().raw] || BigInt(0)
    if (process.argv.includes("--faucet")) {
      const captchaToken = process.env.MIDNIGHT_FAUCET_CAPTCHA_TOKEN
      if (!captchaToken) throw new Error("MIDNIGHT_FAUCET_CAPTCHA_TOKEN is required; obtain it through the official Turnstile faucet UI")
      const faucetResponse = await fetch(`${environment.faucet!.replace(/\/$/, "")}/api/request-tokens`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, captchaToken }),
      })
      const faucetBody = await faucetResponse.json() as { status?: string; message?: string; transactionIdentifier?: string }
      if (!faucetResponse.ok || faucetBody.status === "error") throw new Error(`Official faucet rejected the request: ${faucetBody.message || `HTTP ${faucetResponse.status}`}`)
      for (let attempt = 0; attempt < 18 && balance === BigInt(0); attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 10_000))
        const current = await firstValueFrom(wallet.state().pipe() as never) as { unshielded?: { balances?: Record<string, bigint> } }
        balance = current.unshielded?.balances?.[unshieldedToken().raw] || BigInt(0)
      }
    }
    console.log(`network=${network}`)
    console.log(`public_address=${address}`)
    console.log(`unshielded_balance=${balance.toString()}`)
    console.log(`wallet_file=${walletFile}`)
  } finally {
    await wallet.stop()
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Midnight wallet bootstrap failed")
  process.exitCode = 1
})
