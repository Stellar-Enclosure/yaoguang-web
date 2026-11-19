import {webcrypto} from 'node:crypto'
import {Buffer} from 'node:buffer'
import type {PublicOAuthRegistration} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {createWorkspaceAuth} from './authTransport'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  loading: false,
  workspace: 'yaoguang' as const,
    authorization: undefined as unknown,
  error: undefined,
  login: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('./AuthContext', () => ({ useAuth: () => auth }))

beforeEach(() => {
  auth.authorization = undefined
  auth.loading = false
  auth.login.mockReset()
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation(() => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })))
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('workspace login', () => {
  it.each([
    ['/catalog', '知识工作区'],
    [undefined, '知识工作区'],
    ['/login', '知识工作区'],
    ['//example.invalid', '知识工作区'],
    ['https://example.invalid', '知识工作区'],
  ])('redirects an authenticated user from %s to a local page', async (from, expected) => {
    auth.authorization = {user: {id: 'admin'}}
    const {LoginPage} = await import('./LoginPage')
    render(
      <MemoryRouter initialEntries={[{pathname: '/login', state: {from}}]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/knowledge" element={<div>知识工作区</div>} />
          <Route path="/catalog" element={<div>接口目录</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText(expected!)).toBeInTheDocument()
  })
  it('starts passwordless OIDC login and never renders tenant, credential or token inputs', async () => {
    const { LoginPage } = await import('./LoginPage')
    render(<MemoryRouter><LoginPage /></MemoryRouter>)

    expect(screen.queryByLabelText(/租户 ID|用户名|密码/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Access Token/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Refresh Token/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: '使用统一身份登录'}))

    await waitFor(() => expect(auth.login).toHaveBeenCalledWith('/knowledge'))
  })
})


it('requires an independent grant before either workspace issues a management request', async () => {
  const {createWorkspaceTransport} = await import('./authTransport')
  const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(Response.json({success: true, data: []})))
  const results = await Promise.all((['yaoguang', 'yuheng'] as const).map(async workspace => {
    return createWorkspaceTransport(workspace, fetcher).request('/api/v1/authorization/effective-permissions')
      .then(() => undefined, (error: {status?: number}) => error.status)
  }))
  expect({statuses: results, destinations: fetcher.mock.calls.map(([url]) => url)})
    .toEqual({statuses: [401, 401], destinations: []})
})


const webOrigin = 'https://yaoguang.example.invalid'
const base = '/console/'
const issuer = 'https://identity.example.invalid/tenants/1'
const registration = (resource: 'yaoguang' | 'yuheng'): PublicOAuthRegistration => ({
  id: resource + '-1', clientId: resource + '-1', tenantId: '1', issuer,
  resource: 'https://resources.example.invalid/' + resource,
  apiBaseUrl: 'https://' + resource + '-api.example.invalid', scopes: ['openid'],
  authorizationEndpoint: issuer + '/oauth2/authorize', tokenEndpoint: issuer + '/oauth2/token',
  jwksUri: issuer + '/.well-known/jwks.json', browserBound: false,
  redirectUri: webOrigin + base + 'auth/oidc/callback/' + resource + '-1',
  popupRedirectUri: webOrigin + base + 'auth/oidc/popup/' + resource + '-1',
})
const yaoguang = registration('yaoguang')
const yuheng = registration('yuheng')
const config = JSON.stringify({webOrigin, activeResource: yaoguang.id, workspaces: {yaoguang: [yaoguang], yuheng: [yuheng]}})
const browser = {origin: webOrigin, location: {origin: webOrigin}} as Window
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')

it('binds signed workspace grants to independent Resources and clears both on logout', async () => {
  sessionStorage.clear()
  const fetcher = vi.fn<typeof fetch>()
  const navigate = vi.fn<(url: string) => void>()
  const auth = createWorkspaceAuth(config, base, browser, {crypto: webcrypto as unknown as Crypto, sessionStorage,
    fetch: fetcher, navigate, replaceLocation: vi.fn()})
  const algorithm = 'RSASSA-PKCS1-v1_5'
  const keyPair = await webcrypto.subtle.generateKey({name: algorithm, modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]),
    hash: 'SHA-256'}, true, ['sign','verify'])
  const jwk = {...await webcrypto.subtle.exportKey('jwk', keyPair.publicKey), alg: 'RS256', kid: 'fixture-key'}
  const issue = async (workspace: 'yaoguang' | 'yuheng', reg: PublicOAuthRegistration, audience = reg.resource, responseIssuer = issuer) => {
    await auth.authorization[workspace].login('/knowledge')
    const login = new URL(navigate.mock.lastCall![0])
    expect(login.origin + login.pathname).toBe(reg.authorizationEndpoint)
    expect(login.searchParams.get('resource')).toBe(reg.resource)
    expect(login.searchParams.get('code_challenge_method')).toBe('S256')
    expect(login.searchParams.has('client_secret')).toBe(false)
    const now = Math.floor(Date.now() / 1000)
    const sign = async (type: string, claims: object) => {
      const unsigned = encode({typ: type, alg: 'RS256', kid: 'fixture-key'}) + '.'
        + encode({iss: responseIssuer, sub: 'fixture', iat: now, exp: now + 300, ...claims})
      const signature = await webcrypto.subtle.sign(algorithm, keyPair.privateKey, new TextEncoder().encode(unsigned))
      return unsigned + '.' + Buffer.from(signature).toString('base64url')
    }
    const id_token = await sign('JWT', {aud: [reg.clientId], nonce: login.searchParams.get('nonce')})
    const access_token = await sign('at+jwt', {aud: [audience], tenant_id: reg.tenantId, client_id: reg.clientId,
      principal_type: 'USER', scope_context: 'TENANT', scope: reg.scopes.join(' ')})
    fetcher.mockResolvedValueOnce(Response.json({id_token, access_token, expires_in: 300, token_type: 'Bearer'}))
      .mockResolvedValueOnce(Response.json({keys: [jwk]}))
    const callback = new URL(reg.redirectUri)
    callback.search = new URLSearchParams({state: login.searchParams.get('state')!, code: 'fixture-code', iss: issuer}).toString()
    return {callback, access_token}
  }
  const wrong = await issue('yaoguang', yaoguang, yuheng.resource)
  await expect(auth.completeCallback(wrong.callback.href, false)).rejects.toMatchObject({code: 'INVALID_TOKEN'})
  const incorrectIssuer = await issue('yaoguang', yaoguang, yaoguang.resource, 'https://other.example.invalid/tenants/1')
  await expect(auth.completeCallback(incorrectIssuer.callback.href, false)).rejects.toMatchObject({code: 'INVALID_TOKEN'})
  const first = await issue('yaoguang', yaoguang)
  await expect(auth.completeCallback(first.callback.href, false)).resolves.toBe('/knowledge')
  await expect(auth.completeCallback(first.callback.href, false)).rejects.toMatchObject({code: 'INVALID_CALLBACK'})
  await expect(auth.authorization.yuheng.identity()).resolves.toBeUndefined()
  const yaoguangGrant = auth.authorization.yaoguang.authority()
  expect(yaoguangGrant.authorizationHeader()).toBe('Bearer ' + first.access_token)
  expect(yaoguangGrant.apiBaseUrl).toBe(yaoguang.apiBaseUrl)

  const second = await issue('yuheng', yuheng)
  await expect(auth.completeCallback(second.callback.href, false)).resolves.toBe('/knowledge')
  const yuhengGrant = auth.authorization.yuheng.authority()
  expect(yuhengGrant.authorizationHeader()).toBe('Bearer ' + second.access_token)
  expect(yuhengGrant.apiBaseUrl).toBe(yuheng.apiBaseUrl)
  expect(yaoguangGrant.authorizationHeader()).toBe('Bearer ' + first.access_token)

  const requests = fetcher.mock.calls.length
  const navigations = navigate.mock.calls.length
  const pending = yaoguangGrant.context.capture()
  auth.logout()
  expect(pending.signal.aborted).toBe(true)
  await expect(auth.authorization.yaoguang.identity()).resolves.toBeUndefined()
  await expect(auth.authorization.yuheng.identity()).resolves.toBeUndefined()
  expect(navigate).toHaveBeenCalledTimes(navigations)
  auth.logout(true)
  expect(navigate.mock.lastCall![0]).toBe(issuer + '/logout')
  expect(fetcher).toHaveBeenCalledTimes(requests)
})

it('uses the Portal hint only for an approved child and offers exact top-level authorization', async () => {
  const runtime = {...browser, origin: 'https://portal.example.invalid', __POWERED_BY_WUJIE__: true,
    $wujie: {props: {resourceContext: {resource: yaoguang.resource, issuer, tenantId: '1'}}}}
  const auth = createWorkspaceAuth(config, base, runtime, {crypto: webcrypto as unknown as Crypto})
  expect(auth.authorization.yaoguang.standaloneUrl()).toBe(webOrigin + base + 'auth/standalone/yaoguang-1')
  await expect(auth.authorization.yaoguang.login('/knowledge')).rejects.toMatchObject({code: 'POPUP_UNAVAILABLE'})
  runtime.$wujie.props.resourceContext.resource = yuheng.resource
  expect(auth.authorization.yuheng.standaloneUrl()).toBeUndefined()
  await expect(auth.authorization.yuheng.login('/knowledge')).rejects.toMatchObject({code: 'INVALID_CONFIGURATION'})
})
