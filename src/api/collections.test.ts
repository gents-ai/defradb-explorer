import { describe, it, expect } from 'vitest'
import { splitCollectionsResponse } from './collections'

// ── splitCollectionsResponse ──────────────────────────────────────────────────

describe('splitCollectionsResponse', () => {
  it('splits a Go DefraDB descriptor array into collections and views', () => {
    const { collections, viewNames } = splitCollectionsResponse([
      { Name: 'Users', CollectionID: 'c1', VersionID: 'v1', Fields: [{ Name: 'name', FieldID: '1', Kind: 'String', IsPrimary: false }] },
      { Name: 'TopUsers', Query: 'Users { name }' },
    ])
    expect(collections.map(c => c.name)).toEqual(['Users'])
    expect(collections[0].fields.map(f => f.name)).toEqual(['name'])
    expect(viewNames).toEqual(['TopUsers'])
  })

  it('handles a single descriptor object response', () => {
    const { collections, viewNames } = splitCollectionsResponse({
      Name: 'Users', CollectionID: 'c1', VersionID: 'v1', Fields: [],
    })
    expect(collections.map(c => c.name)).toEqual(['Users'])
    expect(viewNames).toEqual([])
  })

  it('synthesizes name-only descriptors from the defradb.rs name list shape', () => {
    const { collections, viewNames } = splitCollectionsResponse({
      collections: ['AgentSession', 'AgentRequest'],
    })
    expect(collections.map(c => c.name)).toEqual(['AgentSession', 'AgentRequest'])
    expect(collections.every(c => Array.isArray(c.fields))).toBe(true)
    expect(viewNames).toEqual([])
  })

  it('returns nothing for an empty defradb.rs name list', () => {
    const { collections, viewNames } = splitCollectionsResponse({ collections: [] })
    expect(collections).toEqual([])
    expect(viewNames).toEqual([])
  })
})
