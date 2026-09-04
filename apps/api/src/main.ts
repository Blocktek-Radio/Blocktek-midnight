import { buildServer } from "./server.js"
import { loadConfig } from "./config.js"
import { migrateDatabase } from "./db/migrate.js"
import { createPostgresRadioRepository } from "./db/repository.js"
import { PostgresAiDecisionStore } from "./db/repository.js"
import { PostgresPrivacyStore } from "./privacy.js"
import postgres from "postgres"

const config = loadConfig()

async function start() {
  const radioRepository = config.DATABASE_URL
    ? createPostgresRadioRepository(config.DATABASE_URL, {
      url: config.RADIO_PUBLIC_STREAM_URL || config.RADIO_STREAM_URL || undefined,
      name: config.RADIO_STREAM_NAME,
      enabled: config.RADIO_STREAM_ENABLED,
    })
    : undefined
  const decisionSql = config.DATABASE_URL ? postgres(config.DATABASE_URL, { max: 2, idle_timeout: 20 }) : undefined
  const privacyStore = config.DATABASE_URL ? new PostgresPrivacyStore(config.DATABASE_URL) : undefined
  try {
    if (config.DATABASE_URL) await migrateDatabase(config.DATABASE_URL)
    const app = buildServer(config, { radioRepository, aiDecisionStore: decisionSql ? new PostgresAiDecisionStore(decisionSql) : undefined, privacyStore })
    await app.listen({ host: config.API_HOST, port: config.API_PORT })
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

void start()
