import { z } from "zod"

const configSchema = z.object({
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_BASE_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().url().optional().or(z.literal("")),
  REDIS_URL: z.string().url().optional().or(z.literal("")),
  AI_PROVIDER: z.enum(["development", "openai-compatible", "asi-cloud", "groq"]).default("development"),
  AI_MODEL: z.string().trim().max(120).optional().or(z.literal("")),
  AI_TIMEOUT_MS: z.coerce.number().int().min(500).max(60000).default(12000),
  AI_PROGRAMMING_MODE: z.enum(["DETERMINISTIC", "AI_ASSISTED", "AI_PROGRAMMED"]).default("DETERMINISTIC"),
  AI_PROVIDER_URL: z.string().url().optional().or(z.literal("")),
  AI_PROVIDER_API_KEY: z.string().optional().or(z.literal("")),
  MIDNIGHT_NETWORK: z.string().default("unconfigured"),
  RADIO_STREAM_URL: z.string().url().optional().or(z.literal("")),
  RADIO_PUBLIC_STREAM_URL: z.string().url().optional().or(z.literal("")),
  RADIO_STREAM_NAME: z.string().trim().min(1).max(120).default("Signal / Main"),
  RADIO_STREAM_ENABLED: z.preprocess((value) => {
    if (typeof value === "string") return value.toLowerCase() === "true"
    return value
  }, z.boolean().default(false)),
  RADIO_BROADCAST_ENABLED: z.preprocess((value) => typeof value === "string" ? value.toLowerCase() === "true" : value, z.boolean().default(false)),
  ICECAST_MOUNT: z.string().trim().regex(/^\/.+/).default("/live"),
  MEDIA_ROOT: z.string().trim().default("/opt/blocktek-radio/media"),
})

export type ApiConfig = z.infer<typeof configSchema>

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return configSchema.parse(env)
}
