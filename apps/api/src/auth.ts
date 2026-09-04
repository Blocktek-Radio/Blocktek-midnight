import type { FastifyRequest } from "fastify"
import type { ApiConfig } from "./config.js"
import type { PrivacyActor } from "./privacy.js"

export function actorFromRequest(request: FastifyRequest, config: ApiConfig): PrivacyActor | null {
  if (config.BLOCKTEK_AUTH_MODE === "unconfigured") return null
  const id = request.headers["x-blocktek-actor"]
  const role = request.headers["x-blocktek-role"]
  if (typeof id !== "string" || !id.trim()) return null
  if (role !== "CONTRIBUTOR" && role !== "EDITOR" && role !== "ADMIN") return null
  return { id: id.trim().slice(0, 160), role }
}

export function authFailure(config: ApiConfig) {
  return {
    error: "AUTHENTICATION_NOT_CONFIGURED",
    message: config.BLOCKTEK_AUTH_MODE === "unconfigured"
      ? "A real authentication integration is required before private contribution operations are enabled"
      : "Provide a server-authenticated contributor or editorial actor",
  }
}
