import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Connection {
  id: string
  name: string
  host: string
  token: string
}

const SESSION_CONN = 'defradb:active-connection'

function nameFromHost(host: string): string {
  try { return new URL(host).host } catch { return host || 'New connection' }
}

function makeConnection(host: string, token: string, name?: string): Connection {
  return { id: crypto.randomUUID(), name: name ?? nameFromHost(host), host, token }
}

let _syncingFromStorage = false

const crossTabStorage = createJSONStorage(() => ({
  getItem:    (key: string)              => localStorage.getItem(key),
  setItem:    (key: string, val: string) => { if (!_syncingFromStorage) localStorage.setItem(key, val) },
  removeItem: (key: string)              => localStorage.removeItem(key),
}))

interface ConnectionState {
  connections: Connection[]
  activeConnectionId: string

  boot: (defaultHost: string, defaultToken: string) => void
  addConnection:    (host: string, token: string, name?: string) => string
  updateConnection: (connId: string, changes: Partial<Pick<Connection, 'name' | 'host' | 'token'>>) => void
  deleteConnection: (connId: string) => void
  switchConnection: (connId: string) => void
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set, get) => ({
      connections: [],
      activeConnectionId: '',

      boot(defaultHost, defaultToken) {
        const { connections } = get()
        const storedId = sessionStorage.getItem(SESSION_CONN)
        const conn = connections.find(c => c.id === storedId) ?? connections[0]
        if (conn) {
          sessionStorage.setItem(SESSION_CONN, conn.id)
          set({ activeConnectionId: conn.id })
          return
        }
        const fresh = makeConnection(defaultHost, defaultToken)
        sessionStorage.setItem(SESSION_CONN, fresh.id)
        set({ connections: [fresh], activeConnectionId: fresh.id })
      },

      addConnection(host, token, name) {
        const conn = makeConnection(host, token, name)
        set(s => ({ connections: [...s.connections, conn] }))
        get().switchConnection(conn.id)
        return conn.id
      },

      updateConnection(connId, changes) {
        set(s => ({ connections: s.connections.map(c => c.id === connId ? { ...c, ...changes } : c) }))
      },

      deleteConnection(connId) {
        const { connections, activeConnectionId, switchConnection } = get()
        if (connections.length <= 1) return
        const next = connections.filter(c => c.id !== connId)
        set({ connections: next })
        if (activeConnectionId === connId) switchConnection(next[0].id)
      },

      switchConnection(connId) {
        if (!get().connections.find(c => c.id === connId)) return
        sessionStorage.setItem(SESSION_CONN, connId)
        set({ activeConnectionId: connId })
      },
    }),
    {
      name: 'defradb:connections',
      storage: crossTabStorage,
      partialize: s => ({ connections: s.connections }),
    },
  ),
)

export function useActiveConnection(): Connection | undefined {
  return useConnectionStore(s => s.connections.find(c => c.id === s.activeConnectionId))
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key !== 'defradb:connections' || !e.newValue) return
    try {
      const { state } = JSON.parse(e.newValue)
      if (!Array.isArray(state?.connections)) return
      const { activeConnectionId } = useConnectionStore.getState()
      const stillActive = state.connections.find((c: Connection) => c.id === activeConnectionId)
      _syncingFromStorage = true
      useConnectionStore.setState({
        connections: state.connections,
        ...(stillActive ? {} : { activeConnectionId: state.connections[0]?.id ?? '' }),
      })
      _syncingFromStorage = false
    } catch {
      _syncingFromStorage = false
    }
  })
}
