import { buildServer } from "./server.js"
import { loadConfig } from "./config.js"
import { migrateDatabase } from "./db/migrate.js"
import { createPostgresRadioRepository } from "./db/repository.js"

const config = loadConfig()

async function start() {
  const radioRepository = config.DATABASE_URL
    ? createPostgresRadioRepository(config.DATABASE_URL, {
      url: config.RADIO_PUBLIC_STREAM_URL || config.RADIO_STREAM_URL || undefined,
      name: config.RADIO_STREAM_NAME,
      enabled: config.RADIO_STREAM_ENABLED,
    })
    : undefined
  try {
    if (config.DATABASE_URL) await migrateDatabase(config.DATABASE_URL)
    const app = buildServer(config, { radioRepository })
    await app.listen({ host: config.API_HOST, port: config.API_PORT })
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

void start()
