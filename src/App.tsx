import { useState, useRef, useCallback, useMemo } from 'react'
import type { Tab } from './types'
import { useHashRouter } from './hooks/useHashRouter'
import type { SchemaRoute, HashState } from './hooks/useHashRouter'
import Topbar from './components/Topbar'
import Sidebar from './components/Sidebar'
import SettingsModal from './components/SettingsModal'
import DashboardView from './views/DashboardView'
import CollectionsView from './views/CollectionsView'
import type { CollectionsViewHandle } from './views/CollectionsView'
import QueryView from './views/QueryView'
import type { QueryViewHandle } from './views/QueryView'
import SchemaView from './views/SchemaView'
import type { SchemaViewHandle } from './views/SchemaView'
import PeersView from './views/PeersView'
import CommitsView from './views/CommitsView'
import { useUIStore } from './store/uiStore'
import styles from './App.module.css'

export default function App() {
  const activeTab              = useUIStore(s => s.activeTab)
  const setActiveTab           = useUIStore(s => s.setActiveTab)
  const activeCollection       = useUIStore(s => s.activeCollection)
  const setActiveCollection    = useUIStore(s => s.setActiveCollection)
  const selectedSchemaType     = useUIStore(s => s.selectedSchemaType)
  const setSelectedSchemaType  = useUIStore(s => s.setSelectedSchemaType)
  const schemaSubView          = useUIStore(s => s.schemaSubView)
  const setSchemaSubView       = useUIStore(s => s.setSchemaSubView)
  const schemaEditorMode       = useUIStore(s => s.schemaEditorMode)
  const setSchemaEditorMode    = useUIStore(s => s.setSchemaEditorMode)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mountedTabs, setMountedTabs]   = useState<Set<Tab>>(() => {
    const initial = new Set<Tab>(['dashboard'])
    if (activeCollection) initial.add('collections')
    initial.add(activeTab)
    return initial
  })
  const [commitsJump, setCommitsJump] = useState<{ docID: string; seq: number } | null>(null)
  const collectionsRef = useRef<CollectionsViewHandle>(null)
  const schemaRef      = useRef<SchemaViewHandle>(null)
  const queryRef       = useRef<QueryViewHandle>(null)

  function selectTab(tab: Tab) {
    setMountedTabs(prev => { const next = new Set(prev); next.add(tab); return next })
    setActiveTab(tab)
  }

  function selectCollection(name: string) {
    setActiveCollection(name)
    selectTab('collections')
  }

  function clearCollection() {
    setActiveCollection(null)
  }

  // Map store state → SchemaRoute for the router
  const schemaRoute = useMemo((): SchemaRoute => {
    if (schemaSubView === 'editor')      return schemaEditorMode === 'patch' ? 'patch-collection' : 'new-collection'
    if (schemaSubView === 'create-view') return 'new-view'
    if (schemaSubView === 'graph')       return 'graph'
    if (schemaSubView === 'sdl')         return 'sdl'
    return 'table'
  }, [schemaSubView, schemaEditorMode])

  const handleHashChange = useCallback(({ tab, collection, schemaType, schemaRoute }: HashState) => {
    setMountedTabs(prev => { const next = new Set(prev); next.add(tab); return next })
    setActiveTab(tab)
    setActiveCollection(collection)
    if (schemaType) setSelectedSchemaType(schemaType)
    // Map SchemaRoute back to store state
    if (schemaRoute === 'new-collection')   { setSchemaSubView('editor');      setSchemaEditorMode('create') }
    else if (schemaRoute === 'patch-collection') { setSchemaSubView('editor'); setSchemaEditorMode('patch')  }
    else if (schemaRoute === 'new-view')    { setSchemaSubView('create-view') }
    else if (schemaRoute === 'graph')       { setSchemaSubView('graph') }
    else if (schemaRoute === 'sdl')         { setSchemaSubView('sdl') }
    else                                    { setSchemaSubView('table') }
  }, [setActiveTab, setActiveCollection, setSelectedSchemaType, setSchemaSubView, setSchemaEditorMode])

  useHashRouter({ tab: activeTab, collection: activeCollection, schemaType: selectedSchemaType, schemaRoute, onHashChange: handleHashChange })

  return (
    <div className={styles.shell}>
      <Topbar onOpenSettings={() => setSettingsOpen(true)} />
      <div className={styles.body}>
        <Sidebar
          activeCollection={activeCollection}
          onSelectCollection={selectCollection}
          activeTab={activeTab}
          onSelectTab={selectTab}
        />
        <main className={styles.main}>
          <div className={styles.content}>
            {mountedTabs.has('dashboard') && (
              <div className={styles.tabPane} hidden={activeTab !== 'dashboard'}><DashboardView /></div>
            )}
            {mountedTabs.has('collections') && (
              <div className={styles.tabPane} hidden={activeTab !== 'collections'}>
                <CollectionsView
                  ref={collectionsRef}
                  collection={activeCollection}
                  onViewSchema={name => { schemaRef.current?.selectType(name); selectTab('schema') }}
                  onCollectionInvalid={clearCollection}
                  onOpenInQueryRunner={query => { selectTab('query'); setTimeout(() => queryRef.current?.openQuery(query), 0) }}
                  onViewCommitGraph={docID => {
                    setCommitsJump(prev => ({ docID, seq: (prev?.seq ?? 0) + 1 }))
                    selectTab('commits')
                  }}
                />
              </div>
            )}
            {mountedTabs.has('query') && (
              <div className={styles.tabPane} hidden={activeTab !== 'query'}><QueryView ref={queryRef} onOpenInCollections={(collection, docID) => {
                setActiveCollection(collection)
                selectTab('collections')
                setTimeout(() => collectionsRef.current?.openDoc(docID), 0)
              }} /></div>
            )}
            {mountedTabs.has('schema') && (
              <div className={styles.tabPane} hidden={activeTab !== 'schema'}><SchemaView ref={schemaRef} /></div>
            )}
            {mountedTabs.has('peers') && (
              <div className={styles.tabPane} hidden={activeTab !== 'peers'}><PeersView /></div>
            )}
            {mountedTabs.has('commits') && (
              <div className={styles.tabPane} hidden={activeTab !== 'commits'}><CommitsView
                jump={commitsJump}
                onOpenInQueryRunner={query => { selectTab('query'); setTimeout(() => queryRef.current?.openQuery(query), 0) }}
                onOpenInCollections={(collection, docID) => {
                  setActiveCollection(collection)
                  selectTab('collections')
                  setTimeout(() => collectionsRef.current?.openDoc(docID), 0)
                }}
              /></div>
            )}
          </div>
        </main>
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
