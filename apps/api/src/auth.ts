import { createHmac, timingSafeEqual } from "node:crypto"
import type { FastifyRequest } from "fastify"
import type { ApiConfig } from "./config.js"
import type { PrivacyActor } from "./privacy.js"

export function actorFromRequest(request: FastifyRequest, config: ApiConfig): PrivacyActor | null {
  if (config.BLOCKTEK_AUTH_MODE === "unconfigured") return null
  const id = request.headers["x-blocktek-actor"]
  const role = request.headers["x-blocktek-role"]
  if (typeof id !== "string" || !id.trim()) return null
  if (role !== "CONTRIBUTOR" && role !== "EDITOR" && role !== "ADMIN") return null
  if (config.BLOCKTEK_AUTH_MODE === "trusted-proxy") {
    const timestamp = request.headers["x-blocktek-auth-timestamp"]
    const signature = request.headers["x-blocktek-auth-signature"]
    if (!config.BLOCKTEK_AUTH_SHARED_SECRET || typeof timestamp !== "string" || typeof signature !== "string") return null
    const timestampMs = Number(timestamp)
    if (!Number.isSafeInteger(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) return null
    const expected = createHmac("sha256", config.BLOCKTEK_AUTH_SHARED_SECRET)
      .update(`${timestamp}.${id.trim().slice(0, 160)}.${role}`)
      .digest("hex")
    const provided = Buffer.from(signature, "hex")
    const expectedBuffer = Buffer.from(expected, "hex")
    if (provided.length !== expectedBuffer.length || !timingSafeEqual(provided, expectedBuffer)) return null
  }
  return { id: id.trim().slice(0, 160), role }
}

export function authFailure(config: ApiConfig) {
  return {
    error: "AUTHENTICATION_NOT_CONFIGURED",
    message: config.BLOCKTEK_AUTH_MODE === "unconfigured"
      ? "A real authentication integration is required before private contribution operations are enabled"
      : "Provide a server-authenticated contributor or editorial actor with a valid signed proxy assertion",
  }
}
