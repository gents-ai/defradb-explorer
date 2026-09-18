import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { DefraConfig } from '../api/client'
import { useActiveConnection } from '../store/connectionStore'
import { EMBEDDED } from '../lib/embedded'

interface ConfigContextValue {
  config: DefraConfig
}

const ConfigContext = createContext<ConfigContextValue | null>(null)

const DEFAULT_HOST  = EMBEDDED
  ? window.location.origin
  : (import.meta.env.VITE_DEFRADB_URL ?? 'http://localhost:9181')
const DEFAULT_TOKEN = import.meta.env.VITE_DEFRADB_TOKEN  ?? ''

export function ConfigProvider({ children }: { children: ReactNode }) {
  const connection = useActiveConnection()

  const config = useMemo<DefraConfig>(() => ({
    baseUrl: EMBEDDED ? window.location.origin : (connection?.host ?? DEFAULT_HOST),
    token:   EMBEDDED ? undefined : (connection?.token || undefined),
  }), [connection?.host, connection?.token])

  return (
    <ConfigContext.Provider value={{ config }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig must be used inside ConfigProvider')
  return ctx
}

export { DEFAULT_HOST, DEFAULT_TOKEN }
