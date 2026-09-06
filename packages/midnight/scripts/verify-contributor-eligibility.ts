import { createHash } from "node:crypto"
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts"
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider"
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider"
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id"
import { DustSecretKey, ZswapSecretKeys } from "@midnight-ntwrk/midnight-js-protocol/ledger"
import { SucceedEntirely } from "@midnight-ntwrk/midnight-js-types"
import { CompiledContributorEligibilityContract, GeneratedContract } from "../src/contract.js"
import { walletProviders } from "./deploy-contributor-eligibility.js"
import { buildWallet, environment, readSeed } from "./bootstrap-testnet-wallet.js"

const managedDirectory = fileURLToPath(new URL("../managed", import.meta.url))
const evidenceFile = process.env.BLOCKTEK_MIDNIGHT_DEPLOYMENT_FILE || "/etc/blocktek-radio/midnight-deployment.json"
const verificationFile = process.env.BLOCKTEK_MIDNIGHT_VERIFICATION_FILE || "/etc/blocktek-radio/midnight-verification.json"
const privateStateId = "blocktekContributorEligibilityPrivateState"
const syncTimeoutMs = Number(process.env.MIDNIGHT_VERIFICATION_SYNC_TIMEOUT_MS || 300_000)

type DeploymentEvidence = {
  network: string
  contractAddress: string
  txId: string
  blockHeight: number
  sourceSha256: string
}

type LatestContractTransaction = {
  hash: string
  blockHeight: number
  status: string | null
}

const writeJson = async (path: string, value: unknown): Promise<void> => {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  const temporary = `${path}.${process.pid}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  await chmod(temporary, 0o600)
  const { rename } = await import("node:fs/promises")
  await rename(temporary, path)
}

const loadDeploymentEvidence = async (): Promise<DeploymentEvidence> => {
  const evidence = JSON.parse(await readFile(evidenceFile, "utf8")) as Partial<DeploymentEvidence>
  if (evidence.network !== "preprod" || !evidence.contractAddress || !evidence.txId || typeof evidence.blockHeight !== "number") {
    throw new Error("Deployment evidence is incomplete or is not a Preprod deployment")
  }
  return evidence as DeploymentEvidence
}

const waitForSyncedWallet = async (wallet: Awaited<ReturnType<typeof buildWallet>>["wallet"]) => {
  const { firstValueFrom, filter, timeout } = await import("rxjs")
  return firstValueFrom(wallet.state().pipe(
    filter((state) => Boolean((state as { isSynced?: boolean }).isSynced)),
    timeout({ first: syncTimeoutMs }),
  ))
}

const latestContractTransaction = async (contractAddress: string): Promise<LatestContractTransaction> => {
  const query = `query($address: HexEncoded!) { contractAction(address: $address) { transaction { hash block { height } ... on RegularTransaction { transactionResult { status } } } } }`
  const response = await fetch(environment.indexer, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables: { address: contractAddress } }),
  })
  if (!response.ok) throw new Error(`Indexer transaction query returned HTTP ${response.status}`)
  const body = await response.json() as { data?: { contractAction?: { transaction?: { hash?: string; block?: { height?: number }; transactionResult?: { status?: string } } } } }
  const transaction = body.data?.contractAction?.transaction
  if (!transaction?.hash || typeof transaction.block?.height !== "number") throw new Error("Indexer did not return a latest contract transaction")
  return { hash: transaction.hash, blockHeight: transaction.block.height, status: transaction.transactionResult?.status || null }
}

const main = async (): Promise<void> => {
  setNetworkId("preprod")
  const deployment = await loadDeploymentEvidence()
  const seed = await readSeed()
  if (!seed) throw new Error("Protected Midnight wallet seed is unavailable")
  const password = process.env.MIDNIGHT_STORAGE_PASSWORD
  if (!password) throw new Error("MIDNIGHT_STORAGE_PASSWORD is required; it is never logged")

  const built = await buildWallet(seed)
  const wallet = built.wallet
  await wallet.start(ZswapSecretKeys.fromSeed(built.seeds.shielded), DustSecretKey.fromSeed(built.seeds.dust))
  try {
    await waitForSyncedWallet(wallet)
    const address = built.keystore.getBech32Address().toString()
    const zkConfigProvider = new NodeZkConfigProvider(managedDirectory)
    const contentCommitment = new Uint8Array(createHash("sha256").update(`blocktek:phase3b:attest:${deployment.contractAddress}`).digest())
    const publicData = indexerPublicDataProvider(environment.indexer, environment.indexerWS)
    let state = await publicData.queryContractState(deployment.contractAddress)
    if (!state) throw new Error("Indexer did not return the deployed contract state after attest")
    const expectedHex = Buffer.from(contentCommitment).toString("hex")
    let call: any | undefined
    let ledger = GeneratedContract.ledger((state as any).data)
    let actualHex = Buffer.from(ledger.approvedContentCommitment).toString("hex")
    if (!ledger.verified || ledger.revoked || actualHex !== expectedHex) {
      const providers = walletProviders(built, wallet, zkConfigProvider, address)
      const contract = await findDeployedContract(providers as any, {
        compiledContract: CompiledContributorEligibilityContract,
        contractAddress: deployment.contractAddress,
        privateStateId,
      })
      call = await (contract.callTx as any).attest(contentCommitment)
      if (call.public.status !== SucceedEntirely) throw new Error(`attest transaction did not succeed entirely: ${call.public.status}`)
      state = await publicData.queryContractState(deployment.contractAddress)
      if (!state) throw new Error("Indexer did not return the contract state after attest")
      ledger = GeneratedContract.ledger((state as any).data)
      actualHex = Buffer.from(ledger.approvedContentCommitment).toString("hex")
    }
    if (!ledger.verified || ledger.revoked || actualHex !== expectedHex) {
      throw new Error("Indexer ledger state does not prove the expected successful attest call")
    }
    const latest = call
      ? { hash: String(call.public.txId), blockHeight: call.public.blockHeight, status: String(call.public.status) }
      : await latestContractTransaction(deployment.contractAddress)

    await writeJson(verificationFile, {
      network: "preprod",
      contractAddress: deployment.contractAddress,
      deploymentTxId: deployment.txId,
      deploymentBlockHeight: deployment.blockHeight,
      verificationCircuit: "attest",
      verificationTxId: latest.hash,
      verificationBlockHeight: latest.blockHeight,
      verificationStatus: latest.status,
      approvedContentCommitment: actualHex,
      ledgerVerified: ledger.verified,
      ledgerRevoked: ledger.revoked,
    })
    console.log(`MIDNIGHT_PROOF_VERIFIED=true`)
    console.log(`verification_contract_address=${deployment.contractAddress}`)
    console.log(`verification_tx_id=${latest.hash}`)
    console.log(`verification_block_height=${latest.blockHeight}`)
    console.log(`verification_file=${verificationFile}`)
  } finally {
    await wallet.stop()
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? `${error.name}: ${error.message}` : "Midnight proof verification failed")
    process.exitCode = 1
  })
}
