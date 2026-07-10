import { useState, useEffect, useCallback, useRef } from 'react'
import { Info } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useConnectionStore, useActiveConnection } from '../store/connectionStore'
import { activateConnection } from '../store/uiStore'
import { checkHealth } from '../api/health'
import styles from './SettingsModal.module.css'

interface Props {
  onClose: () => void
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CopyIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 16 16" fill="none">
      <rect x={5} y={5} width={9} height={9} rx={1.5} stroke="currentColor" strokeWidth={1.4}/>
      <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 16 16" fill="none">
      <polyline points="2.5,8 6,11.5 13.5,4.5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function WarnIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none">
      <path d="M8 2L14.5 13.5H1.5L8 2Z" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round"/>
      <path d="M8 6.5V9.5" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round"/>
      <circle cx={8} cy={11.5} r={0.75} fill="currentColor"/>
    </svg>
  )
}

function DotsIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="currentColor">
      <circle cx={7} cy={2.5} r={1.2}/>
      <circle cx={7} cy={7}   r={1.2}/>
      <circle cx={7} cy={11.5} r={1.2}/>
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none">
      <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"/>
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0'])

function isPrivateNetworkScenario(endpoint: string): boolean {
  if (LOCAL_HOSTS.has(window.location.hostname)) return false
  try { return LOCAL_HOSTS.has(new URL(endpoint).hostname) } catch { return false }
}

function parseHost(url: string): string {
  try { return new URL(url).host } catch { return url }
}

type EditMode = 'current' | 'editing-conn' | 'new-conn'

// ── Main modal ────────────────────────────────────────────────────────────────

export default function SettingsModal({ onClose }: Props) {
  const queryClient        = useQueryClient()

  const activeConnectionId = useConnectionStore(s => s.activeConnectionId)
  const activeConnection   = useActiveConnection()
  const connections        = useConnectionStore(s => s.connections)

  const addConnection      = useConnectionStore(s => s.addConnection)
  const updateConnection   = useConnectionStore(s => s.updateConnection)
  const deleteConnection   = useConnectionStore(s => s.deleteConnection)
  const switchConnection   = useConnectionStore(s => s.switchConnection)

  // Edit mode
  const [editMode, setEditMode]           = useState<EditMode>('current')
  const [editingConnId, setEditingConnId] = useState<string | null>(null)
  const [showConnPanel, setShowConnPanel] = useState(connections.length > 1)

  // Selected connection (not yet switched)
  const [selectedConnId, setSelectedConnId] = useState(activeConnectionId)

  // Form fields
  const [baseUrl, setBaseUrl] = useState(activeConnection?.host ?? '')
  const [token, setToken]     = useState(activeConnection?.token ?? '')

  // UI state
  const [testing, setTesting]       = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)
  const [copied, setCopied]         = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const openMenuRef                 = useRef<HTMLDivElement | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Health status keyed by connection id
  const [connHealth, setConnHealth] = useState<Record<string, 'checking' | 'online' | 'offline'>>({})

  // Ping all connections on modal open (delayed so first render isn't immediately red)
  useEffect(() => {
    const timer = setTimeout(() => {
      const init: Record<string, 'checking'> = {}
      connections.forEach(c => { init[c.id] = 'checking' })
      setConnHealth(init)
      connections.forEach(async conn => {
        try {
          const ok = await checkHealth({ baseUrl: conn.host, token: conn.token || undefined })
          setConnHealth(prev => ({ ...prev, [conn.id]: ok ? 'online' : 'offline' }))
        } catch {
          setConnHealth(prev => ({ ...prev, [conn.id]: 'offline' }))
        }
      })
    }, 800)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const corsCommand    = `defradb start --allowed-origins ${window.location.origin}`
  const showPNAWarning = isPrivateNetworkScenario(baseUrl)

  // Escape closes modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Close ⋮ menu on outside click
  useEffect(() => {
    if (!openMenuId) return
    function handle(e: MouseEvent) {
      if (openMenuRef.current && !openMenuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [openMenuId])

  // Reset form if selected/editing connection was deleted externally (cross-tab)
  useEffect(() => {
    if (editMode === 'current' && !connections.find(c => c.id === selectedConnId)) {
      setSelectedConnId(activeConnectionId)
      setBaseUrl(activeConnection?.host ?? '')
      setToken(activeConnection?.token ?? '')
      setTestResult(null)
    }
    if (editMode === 'editing-conn' && !connections.find(c => c.id === editingConnId)) {
      setEditMode('current')
      setBaseUrl(activeConnection?.host ?? '')
      setToken(activeConnection?.token ?? '')
      setTestResult(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections])

  // ── Derived ──────────────────────────────────────────────────────────────────

  const selectedConn = connections.find(c => c.id === selectedConnId) ?? activeConnection

  const isDirty = editMode === 'current' && (
    baseUrl.trim() !== (selectedConn?.host ?? '') ||
    token.trim()   !== (selectedConn?.token ?? '')
  )

  const selectionChanged = editMode === 'current' && selectedConnId !== activeConnectionId

  function healthDotStyle(connId: string): React.CSSProperties {
    const h = connHealth[connId]
    if (h === 'online')  return { background: '#39e265', boxShadow: '0 0 0 2px rgba(57,226,101,0.2)' }
    if (h === 'offline') return { background: '#FF5F57' }
    return { background: 'var(--gray-600)' }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(corsCommand).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [corsCommand])

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const ok = await checkHealth({ baseUrl: baseUrl.trim(), token: token.trim() || undefined })
      setTestResult(ok ? 'ok' : 'fail')
    } catch {
      setTestResult('fail')
    } finally {
      setTesting(false)
    }
  }

  function handleSaveCurrent() {
    if (!activeConnectionId) return
    updateConnection(activeConnectionId, { host: baseUrl.trim(), token: token.trim() })
    queryClient.clear()
    onClose()
  }

  function handleSaveAndConnect() {
    if (!selectedConnId) return
    updateConnection(selectedConnId, { host: baseUrl.trim(), token: token.trim() })
    switchConnection(selectedConnId)
    activateConnection(selectedConnId)
    queryClient.clear()
    onClose()
  }

  function handleSaveAsNewConn() {
    const id = addConnection(baseUrl.trim(), token.trim(), parseHost(baseUrl.trim()) || 'New connection')
    activateConnection(id)
    queryClient.clear()
    onClose()
  }

  function handleSaveEditingConn() {
    if (!editingConnId) return
    updateConnection(editingConnId, {
      name:  parseHost(baseUrl.trim()) || 'Connection',
      host:  baseUrl.trim(),
      token: token.trim(),
    })
    if (editingConnId === activeConnectionId) queryClient.clear()
    setTestResult(null)
    setEditMode('current')
  }

  function handleAddConnection() {
    const id = addConnection(baseUrl.trim(), token.trim(), parseHost(baseUrl.trim()) || 'New connection')
    activateConnection(id)
    queryClient.clear()
    onClose()
  }

  function handleConnect() {
    if (selectedConnId) { switchConnection(selectedConnId); activateConnection(selectedConnId) }
    queryClient.clear()
    onClose()
  }

  function handleDeleteConfirmed(connId: string) {
    deleteConnection(connId)
    setConfirmDeleteId(null)
    if (editingConnId === connId) { setEditMode('current'); setBaseUrl(activeConnection?.host ?? ''); setToken(activeConnection?.token ?? ''); setTestResult(null) }
  }

  // ── Footer actions ────────────────────────────────────────────────────────────

  function renderFooterActions() {
    if (editMode === 'current') {
      if (selectionChanged && isDirty) {
        return <button className={styles.btnSave} onClick={handleSaveAndConnect}>Save &amp; connect</button>
      }
      if (selectionChanged) {
        return <button className={styles.btnSave} onClick={handleConnect}>Connect</button>
      }
      if (!isDirty) return null
      return (
        <>
          {connections.length > 1 && (
            <button className={styles.btnSaveAsNew} onClick={handleSaveAsNewConn}>
              Save as new connection
            </button>
          )}
          <button className={styles.btnSave} onClick={handleSaveCurrent}>
            Save &amp; connect
          </button>
        </>
      )
    }
    if (editMode === 'editing-conn') {
      return <button className={styles.btnSave} onClick={handleSaveEditingConn}>Save changes</button>
    }
    // new-conn
    return (
      <button className={styles.btnSave} onClick={handleAddConnection} disabled={!baseUrl.trim()}>
        Add &amp; connect
      </button>
    )
  }

  // ── Delete confirm label ──────────────────────────────────────────────────────

  const deletingConn = confirmDeleteId
    ? connections.find(c => c.id === confirmDeleteId)
    : null
  const deletingLabel = deletingConn
    ? (deletingConn.host || 'this connection')
    : ''

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`${styles.modal} ${(showConnPanel || connections.length > 1 || editMode === 'new-conn') ? styles.modalWide : ''}`} role="dialog" aria-modal="true" aria-label="Connection settings">

        {/* ── Header ── */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Connection settings</h2>
            <p className={styles.tabNote}>Changes apply to this tab only</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={`${styles.body} ${!showConnPanel && connections.length === 1 && editMode !== 'new-conn' ? styles.bodySingle : ''}`}>

          {/* ── Left: Editor ── */}
          <div className={styles.bodyLeft}>

            {/* Sub-mode header (back + title for editing / new-conn) */}
            {editMode !== 'current' && (
              <div className={styles.sectionHeader}>
                <button className={styles.backBtn} onClick={() => { setEditMode('current'); setBaseUrl(selectedConn?.host ?? ''); setToken(selectedConn?.token ?? ''); setTestResult(null) }} title="Back">
                  <BackIcon />
                </button>
                <span className={styles.sectionTitle}>
                  {editMode === 'editing-conn' ? 'Edit connection' : 'New connection'}
                </span>
              </div>
            )}

            {/* Current connection label when multiple connections exist */}
            {editMode === 'current' && connections.length > 1 && (
              <p className={styles.connLabel}>
                Connection: <strong>{selectedConn?.host}</strong>
              </p>
            )}

            {/* Endpoint */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="defra-url">DefraDB endpoint</label>
              <input
                id="defra-url"
                className={`${styles.input} ${styles.inputMono}`}
                type="url"
                value={baseUrl}
                onChange={e => { setBaseUrl(e.target.value); setTestResult(null) }}
                placeholder="http://localhost:9181"
                spellCheck={false}
                autoFocus={editMode === 'new-conn'}
              />
              <div className={styles.corsHint}>
                <p className={styles.hint}>Start DefraDB with CORS enabled:</p>
                <div className={styles.codeRow}>
                  <code className={styles.code}>{corsCommand}</code>
                  <button className={styles.copyBtn} onClick={handleCopy} title="Copy to clipboard">
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </div>
              </div>
            </div>

            {/* Token */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="defra-token">
                Auth token <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="defra-token"
                className={`${styles.input} ${styles.inputMono}`}
                type="password"
                value={token}
                onChange={e => { setToken(e.target.value); setTestResult(null) }}
                placeholder="Bearer token for ACP-enabled instances"
                spellCheck={false}
              />
            </div>

            {showPNAWarning && (
              <div className={styles.pnaWarning}>
                <p className={styles.pnaTitle}>⚠ Private Network Access blocked</p>
                <p className={styles.pnaBody}>
                  Chrome 130+ blocks requests from public pages to <code>localhost</code>.
                </p>
                <ol className={styles.pnaList}>
                  <li>Run the dashboard locally: <code className={styles.pnaCode}>npm run dev</code></li>
                  <li>Or disable: <code className={styles.pnaCode}>chrome://flags/#private-network-access-send-preflights</code> → Disabled</li>
                </ol>
              </div>
            )}

            {testResult && (
              <div className={`${styles.testResult} ${testResult === 'ok' ? styles.testOk : styles.testFail}`}>
                {testResult === 'ok'
                  ? `✓ Connected to ${baseUrl.trim()}`
                  : showPNAWarning
                    ? `✗ ${baseUrl.trim()} — blocked by Private Network Access (see above)`
                    : `✗ Could not reach ${baseUrl.trim()} — check the URL and CORS settings`}
              </div>
            )}

            {connections.length === 1 && editMode === 'current' && !showConnPanel && (
              <div className={styles.connectionNoteRow}>
                <span className={styles.connectionNoteText}>
                  <Info size={14} className={styles.connectionNoteIcon} />
                  Add additional connections to explore different DefraDB nodes per tab.
                </span>
                <button className={styles.connectionNoteBtn} onClick={() => { setShowConnPanel(true); setEditMode('new-conn'); setBaseUrl(''); setToken(''); setTestResult(null) }}>
                  + Add connection
                </button>
              </div>
            )}

          </div>

          {/* ── Right: Connections list ── */}
          {(showConnPanel || connections.length > 1 || editMode === 'new-conn') && <div className={styles.bodyRight}>

            <div className={styles.connectionsHeader}>
              <p className={styles.savedLabel}>Connections</p>
              {editMode !== 'new-conn' && (
                <button className={styles.newBtn} onClick={() => { setOpenMenuId(null); setEditMode('new-conn'); setBaseUrl(''); setToken(''); setTestResult(null) }}>
                  <PlusIcon /> New
                </button>
              )}
            </div>

            <div className={styles.connectionList}>
              {/* Live preview row when adding a connection */}
              {editMode === 'new-conn' && (
                <div className={`${styles.connectionRow} ${styles.connectionRowNew}`}>
                  <div className={styles.connectionInner}>
                    <span className={styles.dot} style={{ background: 'var(--gray-600)' }} />
                    <div className={styles.connectionInfo}>
                      <span className={styles.connectionName} style={{ color: 'var(--muted)' }}>
                        {baseUrl || 'No endpoint set'}
                      </span>
                    </div>
                    <span className={styles.newBadge}>New</span>
                  </div>
                </div>
              )}

              {connections.map(conn => {
                const isActive   = conn.id === activeConnectionId
                const isSelected = conn.id === selectedConnId && editMode === 'current'
                const isEditing  = editMode === 'editing-conn' && editingConnId === conn.id
                const menuOpen   = openMenuId === conn.id
                const canDelete  = connections.length > 1

                return (
                  <div
                    key={conn.id}
                    className={`${styles.connectionRow} ${isEditing ? styles.connectionRowSelected : ''} ${isActive ? styles.connectionRowActive : ''} ${isSelected && !isActive ? styles.connectionRowHighlighted : ''}`}
                    onClick={() => {
                      if (editMode !== 'current') return
                      setSelectedConnId(conn.id)
                      setBaseUrl(conn.host)
                      setToken(conn.token)
                      setTestResult(null)
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' && editMode === 'current') { setSelectedConnId(conn.id); setBaseUrl(conn.host); setToken(conn.token); setTestResult(null) } }}
                    aria-label={`Select ${conn.host}`}
                  >
                    <div className={styles.connectionInner}>
                      <span
                        className={`${styles.dot} ${connHealth[conn.id] === 'checking' ? styles.dotPulse : ''}`}
                        style={healthDotStyle(conn.id)}
                      />
                      <div className={styles.connectionInfo}>
                        <span className={styles.connectionName}>{conn.host}</span>
                      </div>
                      <div className={styles.connectionActions} onClick={e => e.stopPropagation()}>
                        {isActive && connections.length > 1 && <span className={styles.thisTabBadge}>This tab</span>}
                        <div className={styles.menuWrap}>
                          <button
                            className={`${styles.menuBtn} ${menuOpen ? styles.menuBtnOpen : ''}`}
                            onMouseDown={e => e.stopPropagation()}
                            onClick={() => { setConfirmDeleteId(null); setOpenMenuId(id => id === conn.id ? null : conn.id) }}
                            aria-label="Connection options"
                            aria-haspopup="true"
                            aria-expanded={menuOpen}
                          >
                            <DotsIcon />
                          </button>
                          {menuOpen && (
                            <div className={styles.rowMenu} ref={openMenuRef}>
                              <button
                                className={styles.rowMenuItem}
                                onClick={() => {
                                  setOpenMenuId(null)
                                  setEditingConnId(conn.id)
                                  setEditMode('editing-conn')
                                  setBaseUrl(conn.host)
                                  setToken(conn.token)
                                  setTestResult(null)
                                }}
                              >
                                Edit connection
                              </button>
                              {canDelete && (
                                <button
                                  className={`${styles.rowMenuItem} ${styles.rowMenuItemDanger}`}
                                  onClick={() => { setOpenMenuId(null); setConfirmDeleteId(conn.id) }}
                                >
                                  Delete connection
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

            </div>

            <p className={styles.connectionNote}>
              Switching connections only affects this tab. Other tabs keep their own.
            </p>

          </div>}

        </div>

        {/* ── Delete confirmation dialog ── */}
        {confirmDeleteId && (
          <div
            className={styles.confirmOverlay}
            onClick={e => { if (e.target === e.currentTarget) setConfirmDeleteId(null) }}
          >
            <div className={styles.confirmDialog} role="alertdialog" aria-modal="true">
              <div className={styles.confirmIcon}><WarnIcon /></div>
              <div className={styles.confirmContent}>
                <p className={styles.confirmTitle}>Delete &ldquo;{deletingLabel}&rdquo;?</p>
                <p className={styles.confirmBody}>This connection will be permanently removed.</p>
              </div>
              <div className={styles.confirmActions}>
                <button className={styles.deleteCancelBtn} onClick={() => setConfirmDeleteId(null)}>Keep it</button>
                <button
                  className={styles.deleteConfirmBtn}
                  onClick={() => handleDeleteConfirmed(confirmDeleteId)}
                >
                  Delete connection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className={styles.footer}>
          <button className={styles.btnTest} onClick={handleTest} disabled={testing || !baseUrl.trim()}>
            {testing ? 'Testing…' : 'Test connection'}
          </button>
          <div className={styles.footerRight}>
            <button
              className={styles.btnCancel}
              onClick={() => {
                if (editMode !== 'current') {
                  setEditMode('current')
                  setBaseUrl(selectedConn?.host ?? '')
                  setToken(selectedConn?.token ?? '')
                  setTestResult(null)
                } else {
                  onClose()
                }
              }}
            >
              {editMode !== 'current' ? 'Back' : !isDirty && !selectionChanged ? 'Close' : 'Cancel'}
            </button>
            {renderFooterActions()}
          </div>
        </div>

      </div>
    </div>
  )
}
