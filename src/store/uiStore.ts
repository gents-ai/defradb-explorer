import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Tab } from '../types'

type SchemaSubView = 'table' | 'graph' | 'sdl' | 'editor' | 'create-view'
type SchemaEditorMode = 'create' | 'patch'

interface UIState {
  activeTab: Tab
  setActiveTab: (tab: Tab) => void

  activeCollection: string | null
  setActiveCollection: (name: string | null) => void

  schemaSubView: SchemaSubView
  setSchemaSubView: (v: SchemaSubView) => void
  schemaEditorMode: SchemaEditorMode
  setSchemaEditorMode: (m: SchemaEditorMode) => void
  selectedSchemaType: string | null
  setSelectedSchemaType: (name: string | null) => void

  commitsDocID: string | null
  setCommitsDocID: (id: string | null) => void
  commitsViewMode: 'list' | 'graph'
  setCommitsViewMode: (m: 'list' | 'graph') => void

  viewDraftSdl: string
  setViewDraftSdl: (v: string) => void
  viewDraftQuery: string
  setViewDraftQuery: (v: string) => void
  schemaEditorDraftCreate: string
  setSchemaEditorDraftCreate: (v: string) => void
  schemaEditorDraftPatch: string
  setSchemaEditorDraftPatch: (v: string) => void
}

// Connection-keyed storage — set before first use and on every connection switch
let _connId = ''

export function activateConnection(id: string) {
  _connId = id
  if (id) useUIStore.persist.rehydrate()
}

const connStorage = createJSONStorage(() => ({
  getItem:    (k: string) => localStorage.getItem(`defradb:conn:${_connId}:${k}`),
  setItem:    (k: string, v: string) => { if (_connId) localStorage.setItem(`defradb:conn:${_connId}:${k}`, v) },
  removeItem: (k: string) => localStorage.removeItem(`defradb:conn:${_connId}:${k}`),
}))

const VALID_TABS = new Set<Tab>(['dashboard', 'collections', 'query', 'schema', 'peers', 'commits'])
const VALID_SCHEMA_SUB: Set<SchemaSubView> = new Set(['table', 'graph', 'sdl', 'editor', 'create-view'])

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),

      activeCollection: null,
      setActiveCollection: (name) => set({ activeCollection: name }),

      schemaSubView: 'table',
      setSchemaSubView: (v) => set({ schemaSubView: v }),
      schemaEditorMode: 'create',
      setSchemaEditorMode: (m) => set({ schemaEditorMode: m }),
      selectedSchemaType: null,
      setSelectedSchemaType: (name) => set({ selectedSchemaType: name }),

      commitsDocID: null,
      setCommitsDocID: (id) => set({ commitsDocID: id }),
      commitsViewMode: 'graph',
      setCommitsViewMode: (m) => set({ commitsViewMode: m }),

      viewDraftSdl: '',
      setViewDraftSdl: (v) => set({ viewDraftSdl: v }),
      viewDraftQuery: '',
      setViewDraftQuery: (v) => set({ viewDraftQuery: v }),
      schemaEditorDraftCreate: '',
      setSchemaEditorDraftCreate: (v) => set({ schemaEditorDraftCreate: v }),
      schemaEditorDraftPatch: '',
      setSchemaEditorDraftPatch: (v) => set({ schemaEditorDraftPatch: v }),
    }),
    {
      name: 'session',
      storage: connStorage,
      partialize: (state) => ({
        activeTab:                VALID_TABS.has(state.activeTab) ? state.activeTab : 'dashboard',
        activeCollection:         state.activeCollection,
        schemaSubView:            VALID_SCHEMA_SUB.has(state.schemaSubView) ? state.schemaSubView : 'table',
        schemaEditorMode:         state.schemaEditorMode === 'patch' ? 'patch' : 'create',
        selectedSchemaType:       state.selectedSchemaType,
        commitsDocID:             state.commitsDocID,
        commitsViewMode:          state.commitsViewMode,
        viewDraftSdl:             state.viewDraftSdl,
        viewDraftQuery:           state.viewDraftQuery,
        schemaEditorDraftCreate:  state.schemaEditorDraftCreate,
        schemaEditorDraftPatch:   state.schemaEditorDraftPatch,
      }),
    },
  ),
)
