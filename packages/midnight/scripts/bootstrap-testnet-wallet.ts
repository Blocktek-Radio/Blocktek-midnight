import { randomBytes } from "node:crypto"
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { filter, firstValueFrom, tap, timeout } from "rxjs"
import { ApiPromise, WsProvider } from "@polkadot/api"
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id"
import { DustSecretKey, LedgerParameters, ZswapSecretKeys, unshieldedToken } from "@midnight-ntwrk/midnight-js-protocol/ledger"
import {
  createKeystore,
  DustWallet,
  HDWallet,
  InMemoryTransactionHistoryStorage,
  mergeWalletEntries,
  PublicKey,
  Roles,
  SerializedTransaction,
  ShieldedWallet,
  UnshieldedWallet,
  WalletEntrySchema,
  WalletFacade,
  type DustWallet as DustWalletInstance,
  type FacadeState,
  type UnshieldedKeystore,
} from "@midnightntwrk/wallet-sdk"

const requiredNode = [24, 11, 1]
const actualNode = process.versions.node.split(".").map(Number)
const nodeIsSupported = actualNode[0] > requiredNode[0]
  || actualNode[0] === requiredNode[0] && (actualNode[1] > requiredNode[1] || actualNode[1] === requiredNode[1] && actualNode[2] >= requiredNode[2])
if (!nodeIsSupported) throw new Error("Midnight wallet tooling requires Node.js >= 24.11.1")

const network = "preprod" as const
const walletFile = process.env.BLOCKTEK_MIDNIGHT_WALLET_FILE || "/etc/blocktek-radio/midnight-wallet.env"
const dustStateFile = process.env.BLOCKTEK_MIDNIGHT_DUST_STATE_FILE || "/etc/blocktek-radio/midnight-dust-wallet.json"
export const environment = {
  walletNetworkId: network,
  networkId: network,
  indexer: "https://indexer.preprod.midnight.network/api/v4/graphql",
  indexerWS: "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
  node: "https://rpc.preprod.midnight.network",
  nodeWS: "wss://rpc.preprod.midnight.network",
  faucet: "https://midnight-tmnight-preprod.nethermind.dev/",
  proofServer: "http://127.0.0.1:6300",
}

const deriveRoleSeed = (masterSeed: string, role: 0 | 2 | 3): Uint8Array => {
  const result = HDWallet.fromSeed(Buffer.from(masterSeed, "hex"))
  if (result.type !== "seedOk") throw new Error("Failed to derive wallet role seed")
  const derived = result.hdWallet.selectAccount(0).selectRole(role).deriveKeyAt(0)
  result.hdWallet.clear()
  if (derived.type !== "keyDerived") throw new Error(`Failed to derive wallet role ${role}`)
  return derived.key
}

const makeHttpSubmissionService = () => ({
  submitTransaction: async (transaction: { serialize: () => Uint8Array }) => {
    const api = await ApiPromise.create({
      provider: new WsProvider(environment.nodeWS),
      throwOnConnect: false,
      noInitWarn: true,
    })
    let extrinsic: string
    try {
      extrinsic = api.tx.midnight.sendMnTransaction(`0x${Buffer.from(transaction.serialize()).toString("hex")}`).toHex()
    } finally {
      await api.disconnect()
    }
    const response = await fetch(environment.node, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "author_submitExtrinsic",
        params: [extrinsic],
      }),
    })
    let body: { result?: string; error?: { message?: string } }
    try {
      body = await response.json() as { result?: string; error?: { message?: string } }
    } catch {
      throw new Error(`HTTP RPC submission returned non-JSON HTTP ${response.status}`)
    }
    if (!response.ok || body.error || !body.result) {
      throw new Error(`HTTP RPC submission rejected the transaction: ${body.error?.message || `HTTP ${response.status}`}`)
    }
    return {
      _tag: "Submitted" as const,
      tx: SerializedTransaction.of(transaction.serialize()),
      txHash: body.result,
    }
  },
  close: async () => undefined,
})

export const buildWallet = async (seed: string): Promise<{
  wallet: WalletFacade
  seeds: { shielded: Uint8Array; dust: Uint8Array }
  keystore: UnshieldedKeystore
  dust: DustWalletInstance
}> => {
  const shieldedSeed = deriveRoleSeed(seed, Roles.Zswap)
  const unshieldedSeed = deriveRoleSeed(seed, Roles.NightExternal)
  const dustSeed = deriveRoleSeed(seed, Roles.Dust)
  const configuration = {
    indexerClientConnection: {
      indexerHttpUrl: environment.indexer,
      indexerWsUrl: environment.indexerWS,
      bufferSize: 100_000,
      resumeThreshold: 5_000,
    },
    batchUpdates: {
      size: 10_000,
      timeout: 50,
      spacing: 0,
    },
    provingServerUrl: new URL(environment.proofServer),
    networkId: network,
    relayURL: new URL(environment.nodeWS),
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
    costParameters: {
      ledgerParams: LedgerParameters.initialParameters(),
      additionalFeeOverhead: BigInt(1_000),
      feeBlocksMargin: 5,
    },
  }
  const keystore = createKeystore(unshieldedSeed, network)
  const shieldedWallet = ShieldedWallet(configuration).startWithSeed(shieldedSeed)
  const unshieldedWallet = UnshieldedWallet(configuration).startWithPublicKey(PublicKey.fromKeyStore(keystore))
  const dustWalletClass = DustWallet(configuration)
  let serializedDustState: string | null = null
  try {
    serializedDustState = (await readFile(dustStateFile, "utf8")).trim() || null
  } catch {
    serializedDustState = null
  }
  const dustWallet = serializedDustState
    ? dustWalletClass.restore(serializedDustState)
    : dustWalletClass.startWithSeed(dustSeed, LedgerParameters.initialParameters().dust)
  const wallet = await WalletFacade.init({
    configuration,
    ...(process.env.MIDNIGHT_RPC_SUBMISSION_MODE === "http" ? { submissionService: () => makeHttpSubmissionService() as never } : {}),
    shielded: () => shieldedWallet,
    unshielded: () => unshieldedWallet,
    dust: () => dustWallet,
  })
  return { wallet, seeds: { shielded: shieldedSeed, dust: dustSeed }, keystore, dust: dustWallet }
}

let dustPersistencePromise: Promise<void> | undefined
const persistDustState = (dust: DustWalletInstance): Promise<void> => {
  if (dustPersistencePromise) return dustPersistencePromise
  dustPersistencePromise = (async () => {
  await mkdir(dirname(dustStateFile), { recursive: true, mode: 0o700 })
    const serialized = await dust.serializeState()
    const temporaryFile = `${dustStateFile}.${process.pid}.tmp`
    await writeFile(temporaryFile, serialized, { mode: 0o600 })
    await chmod(temporaryFile, 0o600)
    await rename(temporaryFile, dustStateFile)
  })().finally(() => {
    dustPersistencePromise = undefined
  })
  return dustPersistencePromise
}

export const readSeed = async (): Promise<string | null> => {
  try {
    const contents = await readFile(walletFile, "utf8")
    const match = contents.match(/^MIDNIGHT_WALLET_SEED=([0-9a-f]{64})$/m)
    return match?.[1] || null
  } catch {
    return null
  }
}

export const waitForWalletState = async (wallet: WalletFacade): Promise<FacadeState> => firstValueFrom(
  wallet.state().pipe(
    tap((state) => {
      if (process.argv.includes("--verbose")) {
        const progress = state.dust.progress
        const applied = progress.appliedIndex.toString()
        const highestWallet = progress.highestRelevantWalletIndex.toString()
        const highestSource = progress.highestRelevantIndex.toString()
        console.error(`wallet_sync facade_synced=${state.isSynced} dust_applied=${applied} dust_highest_wallet=${highestWallet} dust_highest_source=${highestSource} dust_connected=${progress.isConnected} dust_strict=${progress.isStrictlyComplete()} unshielded_connected=${state.unshielded.progress.isConnected} unshielded_coins=${state.unshielded.availableCoins.length}`)
      }
    }),
    filter((state) => state.isSynced),
    timeout({ first: 21_600_000 }),
  ),
)

const waitForUnshieldedWalletState = async (wallet: WalletFacade): Promise<FacadeState> => firstValueFrom(
  wallet.state().pipe(
    filter((state) => state.unshielded.progress.isStrictlyComplete() && state.unshielded.availableCoins.length > 0),
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

const waitForRegisteredUtxos = async (wallet: WalletFacade): Promise<FacadeState> => firstValueFrom(
  wallet.state().pipe(
    filter((state) => state.unshielded.progress.isStrictlyComplete()
      && state.unshielded.availableCoins.length > 0
      && state.unshielded.availableCoins.every((coin) => coin.meta.registeredForDustGeneration)),
    timeout({ first: 300_000 }),
  ),
)

export const main = async (): Promise<void> => {
  const seed = (await readSeed()) || randomBytes(32).toString("hex")
  await mkdir(dirname(walletFile), { recursive: true, mode: 0o700 })
  await writeFile(walletFile, `MIDNIGHT_WALLET_SEED=${seed}\n`, { mode: 0o600 })
  await chmod(walletFile, 0o600)

  setNetworkId(network)
  const built = await buildWallet(seed)
  const wallet = built.wallet

  try {
    await wallet.start(ZswapSecretKeys.fromSeed(built.seeds.shielded), DustSecretKey.fromSeed(built.seeds.dust))
    const dustPersistenceTimer = setInterval(() => {
      void persistDustState(built.dust).catch(() => undefined)
    }, 10_000)
    try {
    let state = process.argv.includes("--generate-dust")
      ? await waitForUnshieldedWalletState(wallet)
      : await waitForWalletState(wallet)
    if (process.argv.includes("--faucet") && (state.unshielded.balances[unshieldedToken().raw] || BigInt(0)) === BigInt(0)) {
      state = await waitForBalance(wallet)
    }
    const address = built.keystore.getBech32Address().toString()
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
      console.log(`wallet_tnight_balance=${balance.toString()}`)
      console.log(`unregistered_night_utxos=${unregisteredUtxos.length}`)
      if (unregisteredUtxos.length > 0) {
        const recipe = await wallet.registerNightUtxosForDustGeneration(
          unregisteredUtxos,
          built.keystore.getPublicKey(),
          (payload) => built.keystore.signData(payload),
          state.dust.address,
        )
        const transaction = await wallet.finalizeRecipe(recipe)
        const txId = await wallet.submitTransaction(transaction)
        console.log("registration_submitted=true")
        console.log(`registration_tx_id=${txId}`)
        state = await waitForRegisteredUtxos(wallet)
        console.log("registration_confirmed=true")
        console.log("dust_generation_started=true")
        const dustBalance = await waitForDust(wallet)
        console.log(`dust_balance=${dustBalance.toString()}`)
      } else {
        console.log("dust_registration=already_registered_or_unavailable")
        if (!state.dust.progress.isStrictlyComplete()) state = await waitForWalletState(wallet)
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
      clearInterval(dustPersistenceTimer)
      await persistDustState(built.dust)
    }
  } finally {
    await wallet.stop()
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main().catch((error: unknown) => {
    if (error instanceof Error) {
      console.error(`${error.name}: ${error.message}`)
      const cause = (error as Error & { cause?: unknown }).cause
      if (cause instanceof Error) console.error(`cause=${cause.name}: ${cause.message}`)
    } else {
      console.error("Midnight wallet bootstrap failed")
    }
    process.exitCode = 1
  })
}
