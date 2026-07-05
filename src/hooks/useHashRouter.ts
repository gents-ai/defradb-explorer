import { useEffect, useRef } from 'react'
import type { Tab } from '../types'

const VALID_TABS = new Set<Tab>(['dashboard', 'collections', 'query', 'schema', 'peers', 'commits'])

export type SchemaRoute =
  | 'table'
  | 'graph'
  | 'sdl'
  | 'new-collection'
  | 'patch-collection'
  | 'new-view'

const SCHEMA_VIEW_ROUTES = new Set<SchemaRoute>(['table', 'graph', 'sdl', 'new-collection', 'patch-collection', 'new-view'])

export interface HashState {
  tab:         Tab
  collection:  string | null
  schemaType:  string | null
  schemaRoute: SchemaRoute
}

// URL format:
//   #schema                        → table, no type
//   #schema/type/Product           → table, type selected
//   #schema/view/graph             → graph view
//   #schema/view/sdl               → SDL view
//   #schema/view/new-collection    → new collection editor
//   #schema/view/patch-collection  → patch collection editor
//   #schema/view/new-view          → new view form
//   #collections/MyCollection      → collections tab, collection selected
function parseHash(): HashState {
  const raw = window.location.hash.slice(1)
  const parts = raw.split('/')
  const tab = VALID_TABS.has(parts[0] as Tab) ? (parts[0] as Tab) : null

  let collection: string | null = null
  let schemaType: string | null = null
  let schemaRoute: SchemaRoute  = 'table'

  if (tab === 'collections' && parts[1]) {
    collection = decodeURIComponent(parts.slice(1).join('/'))
  } else if (tab === 'schema') {
    if (parts[1] === 'type' && parts[2]) {
      schemaType = decodeURIComponent(parts.slice(2).join('/'))
    } else if (parts[1] === 'view' && parts[2] && SCHEMA_VIEW_ROUTES.has(parts[2] as SchemaRoute)) {
      schemaRoute = parts[2] as SchemaRoute
    }
  }

  return { tab: tab ?? 'dashboard', collection, schemaType, schemaRoute }
}

function buildHash(tab: Tab, collection: string | null, schemaType: string | null, schemaRoute: SchemaRoute): string {
  if (tab === 'collections' && collection) return `#collections/${encodeURIComponent(collection)}`
  if (tab === 'schema') {
    if (schemaRoute !== 'table') return `#schema/view/${schemaRoute}`
    if (schemaType)              return `#schema/type/${encodeURIComponent(schemaType)}`
  }
  return `#${tab}`
}

interface Options {
  tab:          Tab
  collection:   string | null
  schemaType:   string | null
  schemaRoute:  SchemaRoute
  onHashChange: (state: HashState) => void
}

export function useHashRouter({ tab, collection, schemaType, schemaRoute, onHashChange }: Options) {
  const pushing = useRef(false)

  // On mount: if hash present apply it, otherwise initialise hash from current state
  useEffect(() => {
    if (window.location.hash && window.location.hash !== '#') {
      onHashChange(parseHash())
    } else {
      window.history.replaceState(null, '', buildHash(tab, collection, schemaType, schemaRoute))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Push hash whenever navigable state changes (driven by UI)
  useEffect(() => {
    const next = buildHash(tab, collection, schemaType, schemaRoute)
    if (window.location.hash !== next) {
      pushing.current = true
      window.history.pushState(null, '', next)
      pushing.current = false
    }
  }, [tab, collection, schemaType, schemaRoute])

  // Listen for back/forward navigation
  useEffect(() => {
    function handlePop() {
      if (pushing.current) return
      onHashChange(parseHash())
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [onHashChange])
}
