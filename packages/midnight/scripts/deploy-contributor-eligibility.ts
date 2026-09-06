import { createHash } from "node:crypto"
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { filter, firstValueFrom, timeout } from "rxjs"
import {
  createUnprovenDeployTx,
  deployContract,
  type ContractProviders,
} from "@midnight-ntwrk/midnight-js-contracts"
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider"
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider"
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider"
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider"
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id"
import { sampleSigningKey } from "@midnight-ntwrk/midnight-js-protocol/ledger"
import type { MidnightProvider, WalletProvider } from "@midnight-ntwrk/midnight-js-types"
import {
  DustSecretKey,
  LedgerParameters,
  ZswapSecretKeys,
} from "@midnight-ntwrk/midnight-js-protocol/ledger"
import { CompiledContributorEligibilityContract } from "../src/contract.js"
import {
  buildWallet,
  environment,
  readSeed,
} from "./bootstrap-testnet-wallet.js"

const managedDirectory = fileURLToPath(new URL("../managed", import.meta.url))
const sourcePath = fileURLToPath(new URL("../../../contracts/midnight/contributor-eligibility.compact", import.meta.url))
const readinessFile = process.env.BLOCKTEK_MIDNIGHT_READINESS_FILE || "/etc/blocktek-radio/midnight-deployment-readiness.json"
const evidenceFile = process.env.BLOCKTEK_MIDNIGHT_DEPLOYMENT_FILE || "/etc/blocktek-radio/midnight-deployment.json"
const privateStateDirectory = process.env.MIDNIGHT_PRIVATE_STATE_DIR || "/var/lib/blocktek-radio/midnight-private-state"
const syncTimeoutMs = Number(process.env.MIDNIGHT_DEPLOYMENT_SYNC_TIMEOUT_MS || 300_000)

type Readiness = {
  MIDNIGHT_DEPLOYMENT_READY: boolean
  network: string
  providerHealthy: boolean
  walletSynchronized: boolean
  registeredNightUtxos: boolean
  dustSynced: boolean
  usableDust: boolean
  artifactsValid: boolean
  privateStateConfigured: boolean
  reasons: string[]
}

const sha256File = async (path: string): Promise<string> => {
  return createHash("sha256").update(await readFile(path)).digest("hex")
}

const probe = async (url: string, init?: RequestInit): Promise<boolean> => {
  try {
    const response = await fetch(url, init)
    return response.ok
  } catch {
    return false
  }
}

const providerHealth = async (): Promise<boolean> => {
  const node = await probe(environment.node, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "system_health", params: [] }),
  })
  const indexer = await probe(environment.indexer, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: "{ __typename }" }),
  })
  const proof = await probe(`${environment.proofServer}/version`)
  return node && indexer && proof
}

const artifactHealth = async (): Promise<boolean> => {
  const expectedSourceHash = "844d44c4daadeae00b34a26410ac5807b1a81e83fa84c136c7dbbfe91ea418db"
  if (await sha256File(sourcePath) !== expectedSourceHash) return false
  const zkConfig = new NodeZkConfigProvider(managedDirectory)
  try {
    await Promise.all([
      zkConfig.getProverKey("attest"),
      zkConfig.getVerifierKey("attest"),
      zkConfig.getZKIR("attest"),
      zkConfig.getProverKey("revoke"),
      zkConfig.getVerifierKey("revoke"),
      zkConfig.getZKIR("revoke"),
    ])
    return true
  } catch {
    return false
  }
}

const waitForUnshielded = async (wallet: Awaited<ReturnType<typeof buildWallet>>["wallet"]) => firstValueFrom(
  wallet.state().pipe(
    filter((state) => state.unshielded.progress.isStrictlyComplete()),
    timeout({ first: syncTimeoutMs }),
  ),
)

export const walletProviders = (
  built: Awaited<ReturnType<typeof buildWallet>>,
  wallet: Awaited<ReturnType<typeof buildWallet>>["wallet"],
  zkConfigProvider: NodeZkConfigProvider<string>,
  address: string,
): ContractProviders<any> => {
  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => ZswapSecretKeys.fromSeed(built.seeds.shielded).coinPublicKey,
    getEncryptionPublicKey: () => ZswapSecretKeys.fromSeed(built.seeds.shielded).encryptionPublicKey,
    balanceTx: async (tx, ttl) => {
      const recipe = await wallet.balanceUnboundTransaction(
        tx,
        {
          shieldedSecretKeys: ZswapSecretKeys.fromSeed(built.seeds.shielded),
          dustSecretKey: DustSecretKey.fromSeed(built.seeds.dust),
        },
        { ttl: ttl || new Date(Date.now() + 30 * 60 * 1000) },
      )
      return wallet.finalizeRecipe(recipe)
    },
  }
  const midnightProvider: MidnightProvider = {
    submitTx: (tx) => wallet.submitTransaction(tx),
  }
  const password = process.env.MIDNIGHT_STORAGE_PASSWORD
  if (!password) throw new Error("MIDNIGHT_STORAGE_PASSWORD is required for real deployment; it is never logged")
  return {
    privateStateProvider: levelPrivateStateProvider({
      accountId: address,
      midnightDbName: resolve(privateStateDirectory, "state"),
      privateStoragePasswordProvider: () => password,
    }),
    publicDataProvider: indexerPublicDataProvider(environment.indexer, environment.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(environment.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider,
  }
}

export const makeInitialCommitment = (address: string, label: string): Uint8Array =>
  new Uint8Array(createHash("sha256").update(`blocktek:${label}:${address}`).digest())

const writeJson = async (path: string, value: unknown): Promise<void> => {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  const temporary = `${path}.${process.pid}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  await chmod(temporary, 0o600)
  const { rename } = await import("node:fs/promises")
  await rename(temporary, path)
}

const main = async (): Promise<void> => {
  const dryRun = process.argv.includes("--dry-run")
  setNetworkId("preprod")
  const readiness: Readiness = {
    MIDNIGHT_DEPLOYMENT_READY: false,
    network: "preprod",
    providerHealthy: await providerHealth(),
    walletSynchronized: false,
    registeredNightUtxos: false,
    dustSynced: false,
    usableDust: false,
    artifactsValid: await artifactHealth(),
    privateStateConfigured: Boolean(process.env.MIDNIGHT_STORAGE_PASSWORD),
    reasons: [],
  }
  if (!readiness.providerHealthy) readiness.reasons.push("Preprod node, indexer, or proof server is not healthy")
    if (!readiness.artifactsValid) readiness.reasons.push("Generated Compact/ZK artifacts failed integrity validation")
    if (!readiness.privateStateConfigured) readiness.reasons.push("MIDNIGHT_STORAGE_PASSWORD is not configured for encrypted private state")

  const seed = await readSeed()
  if (!seed) throw new Error("Protected Midnight wallet seed is unavailable; no new deployment wallet will be generated")
  const built = await buildWallet(seed)
  const wallet = built.wallet
  await wallet.start(ZswapSecretKeys.fromSeed(built.seeds.shielded), DustSecretKey.fromSeed(built.seeds.dust))
  try {
    const state = dryRun
      ? await waitForUnshielded(wallet)
      : await firstValueFrom(wallet.state().pipe(
        filter((current) => current.isSynced),
        timeout({ first: syncTimeoutMs }),
      ))
    const address = built.keystore.getBech32Address().toString()
    readiness.registeredNightUtxos = state.unshielded.availableCoins.length > 0
      && state.unshielded.availableCoins.every((coin) => coin.meta.registeredForDustGeneration)
    readiness.walletSynchronized = state.isSynced
    readiness.dustSynced = state.dust.progress.isStrictlyComplete()
    readiness.usableDust = state.dust.balance(new Date()) > 0n
    if (!readiness.walletSynchronized) readiness.reasons.push("Wallet facade is not fully synchronized")
    if (!readiness.registeredNightUtxos) readiness.reasons.push("No fully registered NIGHT UTXO set is available")
    if (!readiness.dustSynced) readiness.reasons.push("DUST ledger synchronization is incomplete")
    if (!readiness.usableDust) readiness.reasons.push("Usable tDUST balance is zero")
    readiness.MIDNIGHT_DEPLOYMENT_READY = Object.values({
      providerHealthy: readiness.providerHealthy,
      walletSynchronized: readiness.walletSynchronized,
      registeredNightUtxos: readiness.registeredNightUtxos,
      dustSynced: readiness.dustSynced,
      usableDust: readiness.usableDust,
      artifactsValid: readiness.artifactsValid,
      privateStateConfigured: readiness.privateStateConfigured,
    }).every(Boolean)
    await writeJson(readinessFile, readiness)
    console.log(`MIDNIGHT_DEPLOYMENT_READY=${readiness.MIDNIGHT_DEPLOYMENT_READY}`)
    console.log(`deployment_readiness_file=${readinessFile}`)
    const zkConfigProvider = new NodeZkConfigProvider(managedDirectory)
    const contributorCommitment = makeInitialCommitment(address, "contributor")
    const eligibilityCommitment = makeInitialCommitment(address, "eligibility")
    const initialPrivateState = { contributorCommitment, eligibilityCommitment }
    const deployOptions = {
      compiledContract: CompiledContributorEligibilityContract,
      args: [contributorCommitment, eligibilityCommitment] as [Uint8Array, Uint8Array],
      initialPrivateState,
      privateStateId: "blocktekContributorEligibilityPrivateState",
      signingKey: sampleSigningKey(),
    }

    if (dryRun) {
      const preview = await createUnprovenDeployTx(
        { zkConfigProvider, walletProvider: {
          getCoinPublicKey: () => ZswapSecretKeys.fromSeed(built.seeds.shielded).coinPublicKey,
          getEncryptionPublicKey: () => ZswapSecretKeys.fromSeed(built.seeds.shielded).encryptionPublicKey,
          balanceTx: async () => { throw new Error("dry-run wallet provider must not balance or submit") },
        } } as any,
        deployOptions as any,
      )
      console.log(`dry_run_unproven_deploy_constructed=true`)
      console.log(`dry_run_contract_address=${preview.public.contractAddress}`)
    }

    if (!readiness.MIDNIGHT_DEPLOYMENT_READY) {
      for (const reason of readiness.reasons) console.log(`readiness_blocker=${reason}`)
      if (!dryRun) throw new Error("Deployment gate is closed; no transaction was constructed or submitted")
      return
    }

    if (!dryRun) {
      try {
        await readFile(evidenceFile, "utf8")
        throw new Error(`Deployment evidence already exists at ${evidenceFile}; refusing a duplicate deployment`)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      }
    }

    console.log("MIDNIGHT_DEPLOYMENT_READY=true")
    const providers = walletProviders(built, wallet, zkConfigProvider, address)
    const deployed = await deployContract(providers, deployOptions)
    const tx = deployed.deployTxData.public
    await writeJson(evidenceFile, {
      network: "preprod",
      contractAddress: deployed.deployTxData.public.contractAddress.toString(),
      txId: tx.txId,
      blockHeight: tx.blockHeight,
      sourceSha256: await sha256File(sourcePath),
      artifactsDirectory: managedDirectory,
    })
    console.log(`deployment_contract_address=${deployed.deployTxData.public.contractAddress}`)
    console.log(`deployment_tx_id=${tx.txId}`)
    console.log(`deployment_block_height=${tx.blockHeight}`)
    console.log(`deployment_evidence_file=${evidenceFile}`)
  } finally {
    await wallet.stop()
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? `${error.name}: ${error.message}` : "Midnight deployment failed")
    process.exitCode = 1
  })
}
