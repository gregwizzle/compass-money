"use client"

import { useEffect, useState } from "react"

/** Webpack injects this in dev; Turbopack often leaves it empty — we still poll for changes. */
declare const __webpack_hash__: string | undefined

const NEXT_HMR_REFRESH_HASH_COOKIE = "__next_hmr_refresh_hash__"

type WebpackHot = {
  status: () => string
  addStatusHandler: (cb: (status: string) => void) => void
  removeStatusHandler: (cb: (status: string) => void) => void
}

function getWebpackHot(): WebpackHot | null {
  const g = globalThis as unknown as { module?: { hot?: WebpackHot } }
  return g.module?.hot ?? null
}

function readCookie(name: string): string {
  const safe = name.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&")
  if (typeof document === "undefined") return ""
  const m = document.cookie.match(new RegExp(`(?:^|; )${safe}=([^;]*)`))
  return m?.[1] != null ? decodeURIComponent(m[1]) : ""
}

/** Fingerprint that tends to change when Next dev applies a new client build. */
function computeDevSig(): string {
  const w =
    typeof __webpack_hash__ !== "undefined" && __webpack_hash__ !== ""
      ? String(__webpack_hash__)
      : ""
  const c = readCookie(NEXT_HMR_REFRESH_HASH_COOKIE)
  return `${w}|${c}`
}

function formatStamp() {
  return new Date().toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
}

/**
 * Static “last applied” time in dev — updates when HMR / Fast Refresh delivers a new client
 * build (webpack status, compilation hash, Next HMR cookie, or head chunk injection for Turbopack).
 */
export function DevPageStamp() {
  /** Empty until mount — avoids hydration mismatch (server vs client `Date` differ). */
  const [stamp, setStamp] = useState("")

  useEffect(() => {
    const refresh = () => setStamp(formatStamp())
    refresh()

    const cleaners: (() => void)[] = []

    const hot = getWebpackHot()
    if (hot) {
      let lastHmrStatus = hot.status()
      const onStatus = (status: string) => {
        if (lastHmrStatus === "apply" && status === "idle") {
          refresh()
        }
        lastHmrStatus = status
      }
      hot.addStatusHandler(onStatus)
      cleaners.push(() => hot.removeStatusHandler(onStatus))
    }

    let lastSig = computeDevSig()
    const poll = window.setInterval(() => {
      const next = computeDevSig()
      if (next !== lastSig) {
        lastSig = next
        refresh()
      }
    }, 350)
    cleaners.push(() => clearInterval(poll))

    const skipMutationsUntil = Date.now() + 2400
    let debounce: ReturnType<typeof setTimeout> | undefined
    const mo = new MutationObserver(() => {
      if (Date.now() < skipMutationsUntil) return
      clearTimeout(debounce)
      debounce = setTimeout(refresh, 120)
    })
    mo.observe(document.head, { childList: true, subtree: true })
    cleaners.push(() => {
      mo.disconnect()
      clearTimeout(debounce)
    })

    return () => cleaners.forEach((fn) => fn())
  }, [])

  if (process.env.NODE_ENV !== "development") return null

  return (
    <div
      className="pointer-events-none absolute bottom-2 left-2 z-10 select-none font-mono text-[10px] tabular-nums tracking-tight text-slate-400/90"
      aria-hidden
      title="Updates when dev server applies a client change (HMR / refresh)"
    >
      dev · applied {stamp || "…"}
    </div>
  )
}
