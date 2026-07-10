import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PreferencesState {
  collectionsPageSize: number
  setCollectionsPageSize: (n: number) => void

  queryShowSchema: boolean
  setQueryShowSchema: (v: boolean) => void
  queryVarsOpen: boolean
  setQueryVarsOpen: (v: boolean) => void
  queryVarsHeight: number
  setQueryVarsHeight: (h: number) => void
  querySchemaWidth: number
  setQuerySchemaWidth: (w: number) => void

  schemaGuideWidth: number
  setSchemaGuideWidth: (w: number) => void
  schemaSidebarWidth: number
  setSchemaSidebarWidth: (w: number) => void
  viewGuideWidth: number
  setViewGuideWidth: (w: number) => void
  viewsSidebarWidth: number
  setViewsSidebarWidth: (w: number) => void
  schemaEditorPreviewHeight: number
  setSchemaEditorPreviewHeight: (h: number) => void
  viewSdlHeight: number
  setViewSdlHeight: (h: number) => void
  collectionsDetailWidth: number
  setCollectionsDetailWidth: (w: number) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      collectionsPageSize: 20,
      setCollectionsPageSize: (n) => set({ collectionsPageSize: n }),

      queryShowSchema: true,
      setQueryShowSchema: (v) => set({ queryShowSchema: v }),
      queryVarsOpen: false,
      setQueryVarsOpen: (v) => set({ queryVarsOpen: v }),
      queryVarsHeight: 120,
      setQueryVarsHeight: (h) => set({ queryVarsHeight: h }),
      querySchemaWidth: 320,
      setQuerySchemaWidth: (w) => set({ querySchemaWidth: w }),

      schemaGuideWidth: 400,
      setSchemaGuideWidth: (w) => set({ schemaGuideWidth: w }),
      schemaSidebarWidth: 280,
      setSchemaSidebarWidth: (w) => set({ schemaSidebarWidth: w }),
      viewGuideWidth: 400,
      setViewGuideWidth: (w) => set({ viewGuideWidth: w }),
      viewsSidebarWidth: 220,
      setViewsSidebarWidth: (w) => set({ viewsSidebarWidth: w }),
      schemaEditorPreviewHeight: 260,
      setSchemaEditorPreviewHeight: (h) => set({ schemaEditorPreviewHeight: h }),
      viewSdlHeight: 220,
      setViewSdlHeight: (h) => set({ viewSdlHeight: h }),
      collectionsDetailWidth: 0,
      setCollectionsDetailWidth: (w) => set({ collectionsDetailWidth: w }),
    }),
    { name: 'defradb:prefs' },
  ),
)
