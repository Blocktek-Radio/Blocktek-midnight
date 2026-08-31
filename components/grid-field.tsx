"use client"

import { useEffect, useRef } from "react"

/**
 * Animated synthwave-style perspective wireframe grid rendered on a canvas.
 * Draws a floor grid that scrolls toward the viewer with a subtle sine
 * elevation, plus a glowing horizon. Respects prefers-reduced-motion.
 */
export function GridField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let width = 0
    let height = 0
    let dpr = 1
    let raf = 0
    let t = 0

    const accent = "rgba(120, 160, 255, ALPHA)"

    function resize() {
      const parent = canvas.parentElement
      if (!parent) return
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = parent.clientWidth
      height = parent.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function draw() {
      ctx.clearRect(0, 0, width, height)

      const horizon = height * 0.42
      const rows = 26
      const cols = 24
      const spacing = 0.05
      const scroll = (t * spacing) % 1

      // vertical converging lines
      for (let i = -cols; i <= cols; i++) {
        const x = width / 2 + (i / cols) * width * 1.15
        ctx.beginPath()
        ctx.strokeStyle = accent.replace("ALPHA", "0.10")
        ctx.lineWidth = 1
        ctx.moveTo(width / 2, horizon)
        ctx.lineTo(x, height)
        ctx.stroke()
      }

      // horizontal scrolling lines with perspective easing
      for (let r = 0; r < rows; r++) {
        const p = (r + scroll) / rows
        const eased = p * p
        const y = horizon + eased * (height - horizon)
        const alpha = 0.05 + eased * 0.22
        ctx.beginPath()
        ctx.strokeStyle = accent.replace("ALPHA", alpha.toFixed(3))
        ctx.lineWidth = 1
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // glowing horizon line
      const grad = ctx.createLinearGradient(0, horizon - 60, 0, horizon + 4)
      grad.addColorStop(0, accent.replace("ALPHA", "0"))
      grad.addColorStop(1, accent.replace("ALPHA", "0.28"))
      ctx.fillStyle = grad
      ctx.fillRect(0, horizon - 60, width, 64)
      ctx.beginPath()
      ctx.strokeStyle = accent.replace("ALPHA", "0.6")
      ctx.lineWidth = 1.5
      ctx.moveTo(0, horizon)
      ctx.lineTo(width, horizon)
      ctx.stroke()

      if (!prefersReduced) {
        t += 0.15
        raf = requestAnimationFrame(draw)
      }
    }

    resize()
    draw()

    const onResize = () => {
      resize()
      if (prefersReduced) draw()
    }
    window.addEventListener("resize", onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />
}
