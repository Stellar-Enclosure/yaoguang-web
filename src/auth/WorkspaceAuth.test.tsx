import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {AuthProvider, useAuth} from './AuthContext'
import {workspaceAuth, workspaceOAuth, workspaceTransport} from './authTransport'
import {identityFixture, snapshotFixture} from '../test/permissionFixtures'

const Probe = () => {
  const auth = useAuth()
  return <><p>{auth.workspace}:{auth.authorization?.user.id ?? 'none'}</p>
    <button onClick={() => void auth.logout()}>logout</button>
    <button onClick={() => void auth.refreshAuthorization().catch(() => undefined)}>reload</button></>
}
beforeEach(() => {
  vi.stubEnv('VITE_PERMISSION_NAMESPACE', 'default')
  vi.stubEnv('VITE_PERMISSION_ENVIRONMENT', 'dev')
  for (const resource of ['yuheng', 'yaoguang'] as const) {
    vi.spyOn(workspaceAuth[resource], 'identity').mockResolvedValue(identityFixture(resource))
    vi.spyOn(workspaceTransport[resource], 'request').mockResolvedValue({success: true, data: snapshotFixture(resource)})
  }
  vi.spyOn(workspaceOAuth, 'logout').mockImplementation(() => {
    workspaceAuth.yaoguang.context.invalidate()
    workspaceAuth.yuheng.context.invalidate()
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllEnvs() })

const renderWorkspace = (resource: 'yaoguang' | 'yuheng') => {
  const queryClient = new QueryClient()
  const boundary = (workspace: 'yaoguang' | 'yuheng') => <QueryClientProvider client={queryClient}>
    <AuthProvider resource={workspace}><Probe /></AuthProvider>
  </QueryClientProvider>
  const view = render(boundary(resource))
  return {...view, queryClient, switchTo: (workspace: 'yaoguang' | 'yuheng') => view.rerender(boundary(workspace))}
}

describe('current application permission context', () => {
  it('loads identity and the same application snapshot without old bootstrap permission arrays', async () => {
    renderWorkspace('yaoguang')
    await screen.findByText('yaoguang:user-a')
    expect(workspaceAuth.yaoguang.identity).toHaveBeenCalledOnce()
    expect(workspaceAuth.yuheng.identity).not.toHaveBeenCalled()
    expect(workspaceTransport.yaoguang.request).toHaveBeenCalledWith('/api/v1/authorization/effective-permissions', expect.objectContaining({signal: expect.any(AbortSignal)}))
  })
  it.each(['issuer', 'subject', 'tenant', 'application', 'environment'])('rejects a mismatched %s', async field => {
    const valid = snapshotFixture('yaoguang')
    const value = field === 'issuer' ? {...valid, issuer: 'https://other.example/tenants/1'}
      : field === 'subject' ? {...valid, subject: 'other'}
      : {...valid, catalogScope: {...valid.catalogScope, ...(field === 'tenant' ? {tenantId: '2'} : field === 'application' ? {applicationCode: 'yuheng'} : {environment: 'prod'})}}
    vi.mocked(workspaceTransport.yaoguang.request).mockResolvedValue({success: true, data: value})
    renderWorkspace('yaoguang')
    await waitFor(() => expect(workspaceTransport.yaoguang.request).toHaveBeenCalledOnce())
    expect(screen.getByText('yaoguang:none')).toBeTruthy()
  })
  it('ignores a stale snapshot after a workspace switch', async () => {
    let resolveOld: (value: unknown) => void = () => {}
    vi.mocked(workspaceTransport.yuheng.request).mockImplementation(() => new Promise(resolve => { resolveOld = resolve }))
    const view = renderWorkspace('yuheng')
    await waitFor(() => expect(workspaceTransport.yuheng.request).toHaveBeenCalledOnce())
    const capture = workspaceAuth.yuheng.context.capture()
    view.queryClient.setQueryData(['old-workspace'], {secret: 'old-workspace-data'})
    view.switchTo('yaoguang')
    await screen.findByText('yaoguang:user-a')
    expect(capture.signal.aborted).toBe(true)
    expect(view.queryClient.getQueryData(['old-workspace'])).toBeUndefined()
    await act(async () => resolveOld({success: true, data: snapshotFixture('yuheng')}))
    expect(screen.getByText('yaoguang:user-a')).toBeTruthy()
  })
  it('drops a late snapshot after logout and never restores old grants', async () => {
    let resolveOld: (value: unknown) => void = () => {}
    vi.mocked(workspaceTransport.yaoguang.request).mockImplementation(() => new Promise(resolve => { resolveOld = resolve }))
    renderWorkspace('yaoguang')
    await waitFor(() => expect(workspaceTransport.yaoguang.request).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByText('logout'))
    await waitFor(() => expect(workspaceOAuth.logout).toHaveBeenCalledOnce())
    await act(async () => resolveOld({success: true, data: snapshotFixture('yaoguang')}))
    expect(screen.getByText('yaoguang:none')).toBeTruthy()
  })
  it('clears an accepted view when the shared request epoch changes', async () => {
    renderWorkspace('yaoguang')
    await screen.findByText('yaoguang:user-a')
    act(() => workspaceAuth.yaoguang.context.invalidate())
    expect(screen.getByText('yaoguang:none')).toBeTruthy()
  })
})
