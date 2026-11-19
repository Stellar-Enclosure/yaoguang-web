import {createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react'
import type {PublicOAuthIdentity} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {useQueryClient} from '@tanstack/react-query'
import {isPermissionSnapshot, snapshotContext, type PermissionSnapshot, type PermissionSnapshotContext} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import type {WorkspaceResource} from './workspaceResource'
import {subscribeAuthorizationFailure, workspaceAuth, workspaceOAuth, workspaceTransport} from './authTransport'

export const gatewayAuth = workspaceAuth.yaoguang
export const httpClient = workspaceTransport.yaoguang
export interface WorkspaceAuthorization {
  readonly identity: PublicOAuthIdentity
  readonly snapshot: PermissionSnapshot
  readonly binding: PermissionSnapshotContext
  readonly user: {readonly id: string; readonly tenantId: string; readonly identitySub: string}
}
type AuthState = {
  workspace: WorkspaceResource
  loading: boolean
  authorization?: WorkspaceAuthorization
  error?: string
  login: (returnTo?: string) => Promise<void>
  logout: (sso?: boolean) => Promise<void>
  refreshAuthorization: () => Promise<void>
}
const AuthContext = createContext<AuthState | undefined>(undefined)

type WorkspaceAuthProps = PropsWithChildren<{resource?: WorkspaceResource}>
export const AuthProvider = ({children, resource = 'yaoguang'}: WorkspaceAuthProps) =>
  <WorkspaceAuthProvider key={resource} resource={resource}>{children}</WorkspaceAuthProvider>

const WorkspaceAuthProvider = ({children, resource}: PropsWithChildren<{resource: WorkspaceResource}>) => {
  const authClient = workspaceAuth[resource]
  const [loading, setLoading] = useState(true)
  const [authorization, setAuthorization] = useState<WorkspaceAuthorization>()
  const [error, setError] = useState<string>()
  const generation = useRef(0)
  const pending = useRef<AbortController | null>(null)
  const pendingLogin = useRef<AbortController | null>(null)
  const queryClient = useQueryClient()
  const clearAuthorization = useCallback(() => {
    generation.current += 1
    pending.current?.abort()
    queryClient.clear()
    setAuthorization(undefined)
    setLoading(false)
    return generation.current
  }, [queryClient])
  const refreshAuthorization = useCallback(async () => {
    const serial = clearAuthorization()
    const controller = new AbortController()
    pending.current = controller
    setLoading(true)
    setError(undefined)
    const capture = authClient.context.capture(controller.signal)
    try {
      const identity = await authClient.identity()
      capture.assertCurrent()
      if (serial !== generation.current || !identity) return
      const envelope = await workspaceTransport[resource].request<unknown>('/api/v1/authorization/effective-permissions', {signal: capture.signal})
      capture.assertCurrent()
      const snapshot = typeof envelope === 'object' && envelope !== null && 'success' in envelope
        ? (envelope as {success: unknown; data?: unknown}).success === true ? (envelope as {data?: unknown}).data : null : envelope
      if (!isPermissionSnapshot(snapshot) || snapshot.issuer !== identity.issuer || snapshot.subject !== identity.subject
        || snapshot.catalogScope.tenantId !== identity.tenantId || snapshot.catalogScope.businessCode !== 'xingyuan'
        || snapshot.catalogScope.applicationCode !== resource
        || snapshot.catalogScope.namespaceCode !== (import.meta.env.VITE_PERMISSION_NAMESPACE ?? '')
        || snapshot.catalogScope.environment !== (import.meta.env.VITE_PERMISSION_ENVIRONMENT ?? '')
        || !(Date.parse(snapshot.snapshotExpiresAt) > Date.now())) throw new Error('当前权限快照与应用身份或部署范围不一致')
      if (serial !== generation.current) return
      setAuthorization({identity, snapshot, binding: snapshotContext(snapshot, capture.epoch),
        user: {id: identity.subject, tenantId: identity.tenantId, identitySub: identity.subject}})
    } catch (failure) {
      if (serial === generation.current) {
        setAuthorization(undefined)
        setError(failure instanceof Error ? failure.message : '权限视图不可用')
      }
      throw failure
    } finally {
      if (pending.current === controller) pending.current = null
      if (serial === generation.current) setLoading(false)
    }
  }, [authClient, resource, clearAuthorization])
  const login = useCallback(async (returnTo = resource === 'yaoguang' ? '/knowledge' : '/dashboard') => {
    if (pendingLogin.current) return
    const operation = new AbortController()
    pendingLogin.current = operation
    clearAuthorization()
    setError(undefined)
    try {
      if (await authClient.login(returnTo, operation.signal)) await refreshAuthorization()
    } catch (failure) {
      if (!operation.signal.aborted) setError(failure instanceof Error ? failure.message : '登录失败')
    } finally {
      if (pendingLogin.current === operation) pendingLogin.current = null
    }
  }, [authClient, clearAuthorization, refreshAuthorization, resource])
  const logout = useCallback(async (sso = false) => {
    const serial = clearAuthorization()
    pendingLogin.current?.abort()
    setError(undefined)
    try {
      workspaceOAuth.logout(sso)
    } catch (failure) {
      if (serial === generation.current) setError(failure instanceof Error ? failure.message : '统一身份退出失败')
    }
  }, [clearAuthorization])
  useEffect(() => {
    const unsubscribeFailure = subscribeAuthorizationFailure(resource, status => {
      clearAuthorization()
      setError(status === 403 ? '当前身份无权访问此工作区' : undefined)
    })
    const unsubscribeEpoch = authClient.context.subscribe(() => {
      clearAuthorization()
      setError(undefined)
    })
    let active = true
    queueMicrotask(() => { if (active) void refreshAuthorization().catch(() => undefined) })
    return () => {
      active = false
      unsubscribeFailure()
      unsubscribeEpoch()
      generation.current += 1
      pending.current?.abort()
      pendingLogin.current?.abort()
      authClient.context.invalidate()
      queryClient.clear()
    }
  }, [refreshAuthorization, clearAuthorization, authClient, queryClient, resource])
  useEffect(() => {
    if (!authorization) return
    const deadline = setTimeout(clearAuthorization, Math.max(1, Math.min(Date.parse(authorization.snapshot.snapshotExpiresAt) - Date.now(), 2_147_483_647)))
    return () => clearTimeout(deadline)
  }, [authorization, clearAuthorization])
  const value = useMemo(() => ({workspace: resource, loading, authorization, error, login, logout, refreshAuthorization}),
    [resource, loading, authorization, error, login, logout, refreshAuthorization])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export const useAuth = (): AuthState => {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is required')
  return value
}
