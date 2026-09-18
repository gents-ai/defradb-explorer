import { useEffect } from 'react'
import { useHealthCheck } from '../hooks/useHealthCheck'
import { useConfig } from '../context/ConfigContext'
import { EMBEDDED } from '../lib/embedded'
import styles from './ConnectionBadge.module.css'

interface Props {
  onOpenSettings: () => void
}

export default function ConnectionBadge({ onOpenSettings }: Props) {
  const { config } = useConfig()
  const { data: healthy, isFetching, isError } = useHealthCheck()

  const state = isFetching && healthy === undefined ? 'checking'
    : isError || healthy === false               ? 'disconnected'
    : 'connected'

  let host: string
  try { host = new URL(config.baseUrl).host } catch { host = config.baseUrl }

  useEffect(() => {
    document.title = host ? `DefraDB · ${host}` : 'DefraDB'
    return () => { document.title = 'DefraDB' }
  }, [host])

  const contents = (
    <>
      <span className={styles.dot} />
      <span className={styles.host}>{host}</span>
      {state !== 'connected' && (
        <span className={styles.label}>
          {state === 'checking' ? 'Connecting…' : 'Disconnected'}
        </span>
      )}
    </>
  )

  // Embedded builds are pinned to the serving node; there are no connection
  // settings to open, so the badge is purely informational.
  if (EMBEDDED) {
    return <span className={`${styles.badge} ${styles[state]}`}>{contents}</span>
  }

  return (
    <button className={`${styles.badge} ${styles[state]}`} onClick={onOpenSettings} title="Connection settings">
      {contents}
    </button>
  )
}
