import {cleanup, renderHook} from '@testing-library/react'
import {afterEach, describe, expect, it, vi} from 'vitest'
import type {PropsWithChildren} from 'react'
import type {BackendFieldCatalog} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {authorizationFixture} from '../test/permissionFixtures'
import {inputFields} from './fieldReferences'
const state = vi.hoisted(() => ({authorization: undefined as ReturnType<typeof authorizationFixture> | undefined}))
vi.mock('../auth/AuthContext', () => ({useAuth: () => state}))
import {FieldCatalogContext, useWritableFields} from './FieldCatalog'
afterEach(() => {cleanup(); state.authorization = undefined})
const writableCatalog = (): BackendFieldCatalog => {
  const authorization = authorizationFixture('yaoguang', ['yuheng:knowledge:write'])
  return {catalogScope: authorization.snapshot.catalogScope, catalogVersion: authorization.snapshot.catalogVersion,
    fields: Object.fromEntries(inputFields.KnowledgeBaseCommandDTO.map(key => [key, {access: 'PROTECTED', inputBinding: true,
      fieldPolicy: {valueType: 'STRING', write: {mode: 'ALL', codes: ['yuheng:knowledge:write']}}}]))}
}
const wrapper = (catalog: BackendFieldCatalog | null) => ({children}: PropsWithChildren) => <FieldCatalogContext.Provider value={catalog}>{children}</FieldCatalogContext.Provider>
describe('complete-replacement field experience', () => {
  it('requires current actor permission and a real backend input binding for every submitted field', () => {
    state.authorization = authorizationFixture('yaoguang', ['yuheng:knowledge:write'])
    const catalog = writableCatalog()
    expect(renderHook(() => useWritableFields('KnowledgeBaseCommandDTO'), {wrapper: wrapper(catalog)}).result.current).toBe(true)
    const key = inputFields.KnowledgeBaseCommandDTO[0]
    const readonly = {...catalog, fields: {...catalog.fields, [key]: {...catalog.fields[key], inputBinding: false}}}
    expect(renderHook(() => useWritableFields('KnowledgeBaseCommandDTO'), {wrapper: wrapper(readonly)}).result.current).toBe(false)
  })
  it('keeps the form readonly on missing metadata, changed catalog or missing write permission', () => {
    state.authorization = authorizationFixture('yaoguang', ['yuheng:knowledge:write'])
    expect(renderHook(() => useWritableFields('KnowledgeBaseCommandDTO'), {wrapper: wrapper(null)}).result.current).toBe(false)
    const catalog = writableCatalog()
    expect(renderHook(() => useWritableFields('KnowledgeBaseCommandDTO'), {wrapper: wrapper({...catalog, catalogVersion: '99'})}).result.current).toBe(false)
    state.authorization = authorizationFixture('yaoguang', ['yuheng:knowledge:read'])
    expect(renderHook(() => useWritableFields('KnowledgeBaseCommandDTO'), {wrapper: wrapper(catalog)}).result.current).toBe(false)
  })
})
