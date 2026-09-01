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
    if (canvas === null) return
    const canvasElement: HTMLCanvasElement = canvas
    const context = canvasElement.getContext("2d")
    if (context === null) return
    const drawingContext: CanvasRenderingContext2D = context

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let width = 0
    let height = 0
    let dpr = 1
    let raf = 0
    let t = 0

    const accent = "rgba(120, 160, 255, ALPHA)"

    function resize() {
      const parent = canvasElement.parentElement
      if (!parent) return
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = parent.clientWidth
      height = parent.clientHeight
      canvasElement.width = width * dpr
      canvasElement.height = height * dpr
      canvasElement.style.width = `${width}px`
      canvasElement.style.height = `${height}px`
      drawingContext.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function draw() {
      drawingContext.clearRect(0, 0, width, height)

      const horizon = height * 0.42
      const rows = 26
      const cols = 24
      const spacing = 0.05
      const scroll = (t * spacing) % 1

      // vertical converging lines
      for (let i = -cols; i <= cols; i++) {
        const x = width / 2 + (i / cols) * width * 1.15
        drawingContext.beginPath()
        drawingContext.strokeStyle = accent.replace("ALPHA", "0.10")
        drawingContext.lineWidth = 1
        drawingContext.moveTo(width / 2, horizon)
        drawingContext.lineTo(x, height)
        drawingContext.stroke()
      }

      // horizontal scrolling lines with perspective easing
      for (let r = 0; r < rows; r++) {
        const p = (r + scroll) / rows
        const eased = p * p
        const y = horizon + eased * (height - horizon)
        const alpha = 0.05 + eased * 0.22
        drawingContext.beginPath()
        drawingContext.strokeStyle = accent.replace("ALPHA", alpha.toFixed(3))
        drawingContext.lineWidth = 1
        drawingContext.moveTo(0, y)
        drawingContext.lineTo(width, y)
        drawingContext.stroke()
      }

      // glowing horizon line
      const grad = drawingContext.createLinearGradient(0, horizon - 60, 0, horizon + 4)
      grad.addColorStop(0, accent.replace("ALPHA", "0"))
      grad.addColorStop(1, accent.replace("ALPHA", "0.28"))
      drawingContext.fillStyle = grad
      drawingContext.fillRect(0, horizon - 60, width, 64)
      drawingContext.beginPath()
      drawingContext.strokeStyle = accent.replace("ALPHA", "0.6")
      drawingContext.lineWidth = 1.5
      drawingContext.moveTo(0, horizon)
      drawingContext.lineTo(width, horizon)
      drawingContext.stroke()

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
