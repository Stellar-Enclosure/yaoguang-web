import {ApiError, AuthRequestContext, createHttpClient, createPublicOAuthClient, PublicOAuthError, relayPublicOAuthPopupCode,
  type PublicOAuthClientOptions, type PublicOAuthRegistration, type ResourceRequestAuthority} from '@stellar-enclosure/stellar-enclosure-web-shared'
import type {WorkspaceResource} from './workspaceResource'

export const LOGIN_CALLBACK = '/auth/oidc/callback/:registrationId'
export const POPUP_CALLBACK = '/auth/oidc/popup/:registrationId'
export const STANDALONE_LOGIN = '/auth/standalone/:registrationId'

const workspaces = ['yaoguang', 'yuheng'] as const
type Registrations = Partial<Record<WorkspaceResource, readonly PublicOAuthRegistration[]>>
interface OAuthConfig {
  readonly webOrigin: string
  readonly activeResource: string
  readonly workspaces: Registrations
}
type ResourceHint = {readonly resource: string; readonly issuer: string; readonly tenantId: string}
type Runtime = Window & {
  $wujie?: {props?: {embedded?: boolean; resourceContext?: ResourceHint}}
  __POWERED_BY_WUJIE__?: boolean
}

const invalid = () => new PublicOAuthError('INVALID_CONFIGURATION')
const callbackPath = (route: string, id: string) => route.slice(1).replace(':registrationId', encodeURIComponent(id))
const sameRealm = (registration: PublicOAuthRegistration, other: {issuer: string; tenantId: string}) =>
  registration.issuer === other.issuer && registration.tenantId === other.tenantId

function readConfig(text: string | undefined, base: string): OAuthConfig | undefined {
  if (!text) return undefined
  try {
    const config = JSON.parse(text) as OAuthConfig
    const origin = new URL(config.webOrigin)
    const known = config.workspaces
    if (origin.protocol !== 'https:' || origin.origin !== config.webOrigin || !Array.isArray(known.yaoguang)
      || !known.yaoguang.some(reg => reg.id === config.activeResource)
      || Object.keys(known).some(name => name !== 'yaoguang' && name !== 'yuheng')) throw invalid()
    const resources = new Set<string>()
    const apiBases = new Set<string>()
    for (const workspace of workspaces) {
      const registrations = known[workspace]
      if (registrations === undefined) continue
      if (!Array.isArray(registrations) || registrations.length === 0) throw invalid()
      const first = registrations[0]!
      const realms = new Set<string>()
      for (const reg of registrations) {
        const realm = JSON.stringify([reg.issuer, reg.tenantId])
        if (realms.has(realm) || reg.resource !== first.resource || reg.apiBaseUrl !== first.apiBaseUrl
          || reg.redirectUri !== config.webOrigin + base + callbackPath(LOGIN_CALLBACK, reg.id)
          || (reg.popupRedirectUri !== undefined
            && reg.popupRedirectUri !== config.webOrigin + base + callbackPath(POPUP_CALLBACK, reg.id))) throw invalid()
        realms.add(realm)
      }
      const apiBase = first.apiBaseUrl.replace(/\/$/, '')
      if (resources.has(first.resource) || apiBases.has(apiBase)) throw invalid()
      resources.add(first.resource)
      apiBases.add(apiBase)
    }
    return config
  } catch { throw invalid() }
}

export function createWorkspaceAuth(text: string | undefined, base: string, browser: Runtime,
  options: Omit<PublicOAuthClientOptions, 'registrations' | 'activeResource'> = {}) {
  const config = readConfig(text, base)
  const registrations = workspaces.flatMap(workspace => config?.workspaces[workspace] ?? [])
  const client = config && createPublicOAuthClient({...options, registrations, activeResource: config.activeResource,
    browserWindow: options.browserWindow ?? browser})
  let realm = registrations.find(reg => reg.id === config?.activeResource)
  let callback: {url: string; popup: boolean; result: Promise<string | undefined>} | undefined
  const embedded = () => browser.__POWERED_BY_WUJIE__ === true || browser.$wujie?.props?.embedded === true
  const selection = (workspace: WorkspaceResource) => {
    if (!config) return undefined
    const hint = browser.$wujie?.props?.resourceContext
    const selected = embedded()
      ? config.workspaces.yaoguang?.find(reg => hint && reg.resource === hint.resource && sameRealm(reg, hint))
      : browser.location.origin === config.webOrigin ? realm : undefined
    return selected && config.workspaces[workspace]?.find(reg => sameRealm(reg, selected))
  }
  const takeGrant = (workspace: WorkspaceResource) => {
    const context = new AuthRequestContext()
    for (const reg of config?.workspaces[workspace] ?? []) {
      client?.authority(reg.id).context.subscribe(() => context.invalidate())
    }
    return {
      context,
      identity: async () => {
        const reg = selection(workspace)
        return reg && client?.identity(reg.id)
      },
      authority: (): ResourceRequestAuthority => {
        const reg = selection(workspace)
        if (!reg || !client?.identity(reg.id)) {
          throw new ApiError('需要当前工作区的资源授权', 401, 'AUTHENTICATION_REQUIRED', {retryable: false})
        }
        return {...client.authority(reg.id), context}
      },
      standaloneUrl: () => {
        const reg = selection(workspace)
        return embedded() && config && reg
          ? config.webOrigin + base + callbackPath(STANDALONE_LOGIN, reg.id) : undefined
      },
      login: async (returnTo: string, signal?: AbortSignal): Promise<boolean> => {
        const reg = selection(workspace)
        if (!client || !reg) throw invalid()
        if (embedded() && browser.origin !== config?.webOrigin) throw new PublicOAuthError('POPUP_UNAVAILABLE')
        client.selectResource(reg.id)
        realm = reg
        if (embedded()) {
          await client.authorizeInPopup(reg.id, signal)
          return true
        }
        await client.login(returnTo)
        return false
      },
    }
  }
  const authorization = {yaoguang: takeGrant('yaoguang'), yuheng: takeGrant('yuheng')}
  return {
    authorization,
    loginStandalone: async (id: string) => {
      const reg = registrations.find(entry => entry.id === id)
      if (!client || !reg || embedded() || browser.location.origin !== config?.webOrigin) throw invalid()
      realm = reg
      client.selectResource(id)
      // The Yaoguang application serves the knowledge workspace. After authorizing a
      // secondary Resource, the console still returns to its own interface.
      await client.login('/knowledge')
    },
    completeCallback: (url: string, popup: boolean): Promise<string | undefined> => {
      if (callback?.url === url && callback.popup === popup) return callback.result
      const result = (async () => {
        if (!client || embedded() || browser.location.origin !== config?.webOrigin) throw invalid()
        if (popup) {
          const address = new URL(url)
          const reply = registrations.find(reg => reg.popupRedirectUri === address.origin + address.pathname)?.popupRedirectUri
          if (!reply) throw invalid()
          relayPublicOAuthPopupCode(reply, browser)
          return undefined
        }
        const completed = await client.completeRedirect(url)
        realm = registrations.find(reg => sameRealm(reg, completed.identity) && reg.clientId === completed.identity.clientId
          && reg.resource === completed.identity.resource)
        return completed.returnTo
      })()
      callback = {url, popup, result}
      const release = () => { if (callback?.result === result) callback = undefined }
      void result.then(release, release)
      return result
    },
    logout: (sso = false) => {
      callback = undefined
      if (client) client.logout({sso})
      else for (const workspace of workspaces) authorization[workspace].context.invalidate()
    },
  }
}

const fetchCurrent: typeof fetch = (...args) => globalThis.fetch(...args)
export const workspaceOAuth = createWorkspaceAuth(import.meta.env.VITE_YAOGUANG_OAUTH_CONFIG, import.meta.env.BASE_URL, window, {
  fetch: fetchCurrent,
  replaceLocation: url => window.history.replaceState(window.history.state, '', url),
})
export const workspaceAuth = workspaceOAuth.authorization

const invalidation = new Map<WorkspaceResource, Set<(status: 401 | 403) => void>>()
export const subscribeAuthorizationFailure = (resource: WorkspaceResource, listener: (status: 401 | 403) => void) => {
  const listeners = invalidation.get(resource) ?? new Set()
  invalidation.set(resource, listeners)
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export const createWorkspaceTransport = (resource: WorkspaceResource, fetcher = fetchCurrent) => ({
  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const authority = workspaceAuth[resource].authority()
    const transport = createHttpClient({baseUrl: authority.apiBaseUrl, authority, fetch: fetcher,
      onAuthError: status => invalidation.get(resource)?.forEach(listener => listener(status))})
    return transport.request<T>(path, init)
  },
})
export const workspaceTransport = {yuheng: createWorkspaceTransport('yuheng'), yaoguang: createWorkspaceTransport('yaoguang')}
