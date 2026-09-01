import { readdir, readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import postgres from "postgres"

const migrationsDirectory = join(dirname(fileURLToPath(import.meta.url)), "migrations")

export async function migrateDatabase(databaseUrl: string): Promise<void> {
  const sql = postgres(databaseUrl, { max: 1, idle_timeout: 5 })
  try {
    await sql`CREATE TABLE IF NOT EXISTS "_blocktek_migrations" ("id" text PRIMARY KEY, "applied_at" timestamptz NOT NULL DEFAULT now())`
    const applied = new Set((await sql`SELECT "id" FROM "_blocktek_migrations"`).map((row) => String(row.id)))
    const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort()
    for (const file of files) {
      if (applied.has(file)) continue
      const migration = await readFile(join(migrationsDirectory, file), "utf8")
      await sql.begin(async (transaction) => {
        await transaction.unsafe(migration)
        await transaction`INSERT INTO "_blocktek_migrations" ("id") VALUES (${file})`
      })
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
}

async function runFromCli() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is required to run database migrations")
  await migrateDatabase(databaseUrl)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void runFromCli().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
