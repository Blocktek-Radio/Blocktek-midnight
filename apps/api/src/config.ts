import { z } from "zod"

const configSchema = z.object({
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_BASE_URL: z.string().url().default("http://localhost:3000"),
  AI_PROVIDER: z.enum(["development", "openai-compatible"]).default("development"),
  AI_PROVIDER_URL: z.string().url().optional().or(z.literal("")),
  AI_PROVIDER_API_KEY: z.string().optional().or(z.literal("")),
  MIDNIGHT_NETWORK: z.string().default("unconfigured"),
  RADIO_STREAM_URL: z.string().url().optional().or(z.literal("")),
})

export type ApiConfig = z.infer<typeof configSchema>

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return configSchema.parse(env)
}
