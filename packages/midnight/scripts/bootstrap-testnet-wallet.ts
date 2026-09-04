import { randomBytes } from "node:crypto"
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { filter, firstValueFrom, tap, timeout } from "rxjs"
import { getNetworkId, setNetworkId } from "@midnight-ntwrk/midnight-js-network-id"
import { DustSecretKey, ZswapSecretKeys, unshieldedToken } from "@midnight-ntwrk/midnight-js-protocol/ledger"
import { FluentWalletBuilder, type EnvironmentConfiguration } from "@midnight-ntwrk/testkit-js"
import { UnshieldedAddress } from "@midnight-ntwrk/wallet-sdk-address-format"
import type { FacadeState, UnshieldedKeystore, WalletFacade } from "@midnight-ntwrk/wallet-sdk"

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

const waitForWalletState = async (wallet: WalletFacade): Promise<FacadeState> => firstValueFrom(
  wallet.state().pipe(
    tap((state) => {
      if (process.argv.includes("--verbose")) {
        const progress = state.dust.progress
        const applied = progress.appliedId === undefined ? "unknown" : progress.appliedId.toString()
        const highest = progress.highestTransactionId === undefined ? "unknown" : progress.highestTransactionId.toString()
        console.error(`wallet_sync dust_applied=${applied} dust_highest=${highest} dust_connected=${progress.isConnected} dust_strict=${progress.isStrictlyComplete()} unshielded_coins=${state.unshielded.availableCoins.length}`)
      }
    }),
    filter((state) => state.unshielded.progress.isStrictlyComplete()),
    timeout({ first: 180_000 }),
  ),
)

const waitForBalance = async (wallet: WalletFacade): Promise<FacadeState> => firstValueFrom(
  wallet.state().pipe(
    filter((state) => state.unshielded.progress.isStrictlyComplete() && (state.unshielded.balances[unshieldedToken().raw] || BigInt(0)) > BigInt(0)),
    timeout({ first: 180_000 }),
  ),
)

const waitForDust = async (wallet: WalletFacade): Promise<bigint> => firstValueFrom(
  wallet.state().pipe(
    filter((state) => state.dust.balance(new Date()) > BigInt(0)),
    timeout({ first: 300_000 }),
  ),
).then((state) => state.dust.balance(new Date()))

const main = async (): Promise<void> => {
  const seed = (await readSeed()) || randomBytes(32).toString("hex")
  await mkdir(dirname(walletFile), { recursive: true, mode: 0o700 })
  await writeFile(walletFile, `MIDNIGHT_WALLET_SEED=${seed}\n`, { mode: 0o600 })
  await chmod(walletFile, 0o600)

  setNetworkId(network)
  const builder = FluentWalletBuilder.forEnvironment(environment)
    .withSeed(seed)
    .withDustOptions({ additionalFeeOverhead: BigInt(1_000), feeBlocksMargin: 5 })
  const buildResult = await builder.buildWithoutStarting()
  const built = buildResult as unknown as {
    wallet: WalletFacade
    seeds: { shielded: Uint8Array; dust: Uint8Array }
    keystore: UnshieldedKeystore
  }
  const wallet = built.wallet

  try {
    await wallet.start(ZswapSecretKeys.fromSeed(built.seeds.shielded), DustSecretKey.fromSeed(built.seeds.dust))
    let state = await waitForWalletState(wallet)
    if (process.argv.includes("--faucet") && (state.unshielded.balances[unshieldedToken().raw] || BigInt(0)) === BigInt(0)) {
      state = await waitForBalance(wallet)
    }
    const address = UnshieldedAddress.codec.encode(getNetworkId(), state.unshielded.address).toString()
    let balance = state.unshielded.balances[unshieldedToken().raw] || BigInt(0)
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
      state = await waitForBalance(wallet)
      balance = state.unshielded.balances[unshieldedToken().raw] || BigInt(0)
    }
    if (process.argv.includes("--generate-dust")) {
      const unregisteredUtxos = state.unshielded.availableCoins.filter((coin) => !coin.meta.registeredForDustGeneration)
      if (unregisteredUtxos.length > 0) {
        const recipe = await wallet.registerNightUtxosForDustGeneration(
          unregisteredUtxos,
          built.keystore.getPublicKey(),
          (payload) => built.keystore.signData(payload),
          state.dust.address,
        )
        const transaction = await wallet.finalizeRecipe(recipe)
        const txId = await wallet.submitTransaction(transaction)
        console.log(`dust_registration_tx=${txId}`)
        const dustBalance = await waitForDust(wallet)
        console.log(`dust_balance=${dustBalance.toString()}`)
      } else {
        console.log("dust_registration=already_registered_or_unavailable")
        console.log(`dust_balance=${state.dust.balance(new Date()).toString()}`)
      }
    }
    console.log(`network=${network}`)
    console.log(`public_address=${address}`)
    console.log(`unshielded_balance=${balance.toString()}`)
    console.log(`dust_synced=${state.dust.progress.isStrictlyComplete()}`)
    console.log(`dust_balance=${state.dust.balance(new Date()).toString()}`)
    console.log(`wallet_file=${walletFile}`)
  } finally {
    await wallet.stop()
  }
}

void main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.stack || error.message)
    const cause = (error as Error & { cause?: unknown }).cause
    if (cause) console.error("submission_cause=", cause)
  } else {
    console.error("Midnight wallet bootstrap failed")
  }
  process.exitCode = 1
})
