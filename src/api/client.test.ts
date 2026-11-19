import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {apiRequest, GatewayApiError} from './client'
import {createLogicalTrace} from './trace'
import {createWorkspaceTransport, workspaceAuth} from '../auth/authTransport'

const response = (body: unknown, status = 200) => Response.json(body, {status})

beforeEach(() => {
  for (const workspace of ['yaoguang', 'yuheng'] as const) {
    const context = workspaceAuth[workspace].context
    vi.spyOn(workspaceAuth[workspace], 'authority').mockReturnValue({
      context,
      apiBaseUrl: 'https://' + workspace + '-api.example.invalid',
      resource: 'https://resources.example.invalid/' + workspace,
      authorizationHeader: () => 'Bearer ' + workspace + '-fixture',
      invalidate: () => context.invalidate(),
    })
  }
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('typed API client', () => {
  it('sends trace, idempotency and only the approved Resource Bearer to Yaoguang', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ok: true}))
    vi.stubGlobal('fetch', fetcher)
    const trace = createLogicalTrace()
    await apiRequest('/api/test', {method: 'PUT', trace, body: {name: 'fixture'}, idempotencyKey: 'one-mutation',
      headers: {'X-Admin-Actor-Id': 'untrusted'}})
    const [url, init] = fetcher.mock.calls[0]
    const headers = new Headers(init?.headers)
    expect(url).toBe('https://yaoguang-api.example.invalid/api/test')
    expect(init).toMatchObject({credentials: 'omit', redirect: 'error'})
    expect(headers.get('Authorization')).toBe('Bearer yaoguang-fixture')
    expect(headers.has('X-Admin-Actor-Id')).toBe(false)
    expect(headers.has('X-Trace-Id')).toBe(false)
    expect(headers.get('traceparent')).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/)
    expect(headers.get('x-egon-request-id')).toMatch(/^[0-9a-f]{32}$/)
    expect(headers.get('Idempotency-Key')).toBe('one-mutation')
    expect(headers.get('X-Yuheng-Contract-Version')).toBe('v1')
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('keeps the separately configured secondary workspace on its own Resource', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ok: true}))
    await createWorkspaceTransport('yuheng', fetcher).request('/api/test')
    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe('https://yuheng-api.example.invalid/api/test')
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer yuheng-fixture')
    expect(init?.credentials).toBe('omit')
    expect(workspaceAuth.yaoguang.authority).not.toHaveBeenCalled()
  })

  it('maps revision conflicts without discarding server evidence', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(
      {code: 'YUHENG_ADMIN_REVISION_CONFLICT', message: 'stale draft', currentRevision: 9, traceId: 'a'.repeat(32)}, 409)))
    await expect(apiRequest('/api/test')).rejects.toMatchObject({
      category: 'CONFLICT', currentRevision: 9, traceId: 'a'.repeat(32),
    } satisfies Partial<GatewayApiError>)
  })

  it.each([[401, 'UNAUTHENTICATED'], [403, 'FORBIDDEN'], [503, 'SERVER']])(
    'preserves HTTP %i and never replays a write', async (status, category) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({code: 'SERVICE_RESPONSE'}, status))
      vi.stubGlobal('fetch', fetcher)
      const capture = workspaceAuth.yaoguang.context.capture()
      const other = workspaceAuth.yuheng.context.capture()
      await expect(apiRequest('/api/test', {method: 'DELETE'})).rejects.toMatchObject({status, category})
      expect(capture.signal.aborted).toBe(status === 401)
      expect(other.signal.aborted).toBe(false)
      expect(fetcher).toHaveBeenCalledOnce()
    },
  )

  it('discards a late response to an old-epoch write without replay', async () => {
    let complete!: (value: Response) => void
    const fetcher = vi.fn<typeof fetch>(() => new Promise(resolve => {complete = resolve}))
    vi.stubGlobal('fetch', fetcher)
    const write = apiRequest('/api/test', {method: 'PUT', body: {name: 'fixture'}})
    workspaceAuth.yaoguang.context.invalidate()
    complete(response({ok: true}))
    await expect(write).rejects.toMatchObject({name: 'AbortError'})
    expect(fetcher).toHaveBeenCalledOnce()
  })
})
