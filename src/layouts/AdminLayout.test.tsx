import {authorizationFixture} from '../test/permissionFixtures'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {cleanup, render, screen} from '@testing-library/react'
import {MemoryRouter, Route, Routes} from 'react-router-dom'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {AdminLayout} from './AdminLayout'

const mocks = vi.hoisted(() => ({logout: vi.fn(), canRead: true}))
type WujieTestWindow = Window & {$wujie?: {props?: {embedded?: boolean}}}
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({authorization: authorizationFixture('yaoguang', mocks.canRead ? ['yuheng:knowledge:read'] : []), logout: mocks.logout}),
}))
const renderLayout = (path = '/knowledge', embedded = false) => {
  ;(window as WujieTestWindow).$wujie = embedded ? {props: {embedded: true}} : undefined
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<AdminLayout />}>
            <Route path="*" element={<div>Knowledge workspace</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  mocks.canRead = true
  mocks.logout.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation(() => ({
    matches: true, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })))
})
afterEach(() => {
  cleanup()
  delete (window as WujieTestWindow).$wujie
  vi.unstubAllGlobals()
})
describe('Yaoguang application ownership', () => {
  it('owns knowledge navigation and excludes gateway and LLM administration', () => {
    renderLayout()
    expect(screen.getByText('Yaoguang Admin')).toBeInTheDocument()
    expect(screen.getByText('知识库')).toBeInTheDocument()
    expect(screen.queryByText('网关治理')).not.toBeInTheDocument()
    expect(screen.queryByText('模型与渠道')).not.toBeInTheDocument()
    expect(screen.getByText('版本 v0.0.1')).toBeInTheDocument()
  })
  it('retains knowledge navigation without a duplicate host header in embedded mode', () => {
    renderLayout('/knowledge/12/wiki/34', true)
    expect(screen.getByText('知识库')).toBeInTheDocument()
    expect(screen.queryByText('Yaoguang Admin')).not.toBeInTheDocument()
  })
  it('hides knowledge navigation without the existing read capability', () => {
    mocks.canRead = false
    renderLayout()
    expect(screen.queryByText('知识库')).not.toBeInTheDocument()
  })
})
