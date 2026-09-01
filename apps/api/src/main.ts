import { buildServer } from "./server.js"
import { loadConfig } from "./config.js"

const config = loadConfig()
const app = buildServer(config)

async function start() {
  try {
    await app.listen({ host: config.API_HOST, port: config.API_PORT })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

void start()
