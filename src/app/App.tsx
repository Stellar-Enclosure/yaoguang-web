import {FieldCatalogProvider} from '../permissions/FieldCatalog'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {
  bridgeFail,
  bridgeOk,
  EmbeddedWorkbench,
  type WorkbenchHost,
} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {allowsSnapshotRequirement} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {Button, ConfigProvider, Result} from 'antd'
import zhCN from 'antd/locale/zh_CN'
import {lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode} from 'react'
import {
  createBrowserRouter,
  createMemoryRouter,
  Link,
  Navigate,
  Outlet,
  RouterProvider,
  useNavigate,
  useParams,
} from 'react-router-dom'
import {CapabilityProvider, type Capability} from './capabilities'
import {AuthProvider, useAuth} from '../auth/AuthContext'
import {LoginPage} from '../auth/LoginPage'
import {LOGIN_CALLBACK, POPUP_CALLBACK, STANDALONE_LOGIN, workspaceOAuth} from '../auth/authTransport'
import {RequireAuth, RequireCapability} from '../auth/RouteGuards'
import {LoadingBlock} from '../components/QueryState'
import {AdminLayout} from '../layouts/AdminLayout'
import {resources} from '../permissions/resources'
import {
  buildYaoguangCatalogPages,
  canAccessYaoguangRoute,
  matchYaoguangRoute,
} from '../workbench/routes'

interface WujieWorkbenchWindow extends Window {
  $wujie?: {
    props?: {
      embedded?: boolean
      workbenchHost?: WorkbenchHost
    }
  }
}

const configuredBase: string = import.meta.env.VITE_BASE_PATH ?? '/'
if (!configuredBase.startsWith('/') || configuredBase.startsWith('//')
  || /[\\?#%]/.test(configuredBase) || Array.from(configuredBase).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) || /\/{2,}/.test(configuredBase)
  || configuredBase.split('/').some((segment) => segment === '.' || segment === '..')) {
  throw new Error('Invalid VITE_BASE_PATH')
}
const basePath = configuredBase === '/' ? '/' : configuredBase.replace(/\/?$/, '/')

const KnowledgeBasesPage = lazy(() =>
  import('../features/knowledge/KnowledgeBasesPage').then((module) => ({default: module.KnowledgeBasesPage})),
)
const KnowledgeBasePage = lazy(() =>
  import('../features/knowledge/KnowledgeBasePage').then((module) => ({default: module.KnowledgeBasePage})),
)
const WikiPage = lazy(() =>
  import('../features/wiki/WikiPage').then((module) => ({default: module.WikiPage})),
)
const KnowledgeAssistantPage = lazy(() =>
  import('../features/knowledge/KnowledgeAssistantPage').then((module) => ({default: module.KnowledgeAssistantPage})),
)
const guarded = (capability: Capability, node: ReactNode) => (
  <RequireCapability capability={capability}>{node}</RequireCapability>
)
const WorkspaceAuthBoundary = () => {
  return (
    <AuthProvider resource="yaoguang">
      <FieldCatalogProvider><CapabilityProvider><Outlet /></CapabilityProvider></FieldCatalogProvider>
    </AuthProvider>
  )
}
function OAuthCallback({popup = false}: {readonly popup?: boolean}) {
  const [url] = useState(() => window.location.href)
  const [status, setStatus] = useState<'pending' | 'done' | 'failed'>('pending')
  const navigate = useNavigate()
  useEffect(() => {
    let active = true
    void workspaceOAuth.completeCallback(url, popup).then(returnTo => {
      if (!active) return
      if (returnTo) void navigate(returnTo, {replace: true})
      else setStatus('done')
    }, () => {if (active) setStatus('failed')})
    return () => {active = false}
  }, [url, popup, navigate])
  const title = status === 'failed' ? '统一身份回调失败' : status === 'done' ? '授权完成，可以关闭此窗口' : '正在完成统一身份授权'
  return <Result status={status === 'failed' ? 'error' : 'info'} title={title}
    extra={status === 'failed' && !popup ? <Link to="/login">返回摇光</Link> : undefined} />
}

function StandaloneLogin() {
  const {registrationId = ''} = useParams()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const start = async () => {
    setFailed(false)
    setPending(true)
    try { await workspaceOAuth.loginStandalone(registrationId) }
    catch { setFailed(true) }
    finally { setPending(false) }
  }
  return <Result status={failed ? 'error' : 'info'} title={failed ? '统一身份登录失败' : '登录摇光工作区'}
    extra={<Button type="primary" loading={pending} onClick={() => void start()}>使用统一身份登录</Button>} />
}

const router = createBrowserRouter([
  {path: LOGIN_CALLBACK, caseSensitive: true, element: <OAuthCallback />},
  {path: POPUP_CALLBACK, caseSensitive: true, element: <OAuthCallback popup />},
  {path: STANDALONE_LOGIN, caseSensitive: true, element: <StandaloneLogin />},
  {element: <WorkspaceAuthBoundary />, children: [
  {path: '/login', element: <LoginPage />},
  {
    path: '/',
    element: <RequireAuth><AdminLayout /></RequireAuth>,
    errorElement: <Result status="error" title="页面加载失败" subTitle="请返回上一页或刷新。" />,
    children: [
      {index: true, element: <Navigate replace to="/knowledge" />},
      {path: 'knowledge', element: guarded('yaoguang.page.knowledge', <KnowledgeBasesPage />)},
      {path: 'knowledge/:kbId', element: guarded('yaoguang.page.knowledge.kbId', <KnowledgeBasePage />)},
      {path: 'knowledge/:kbId/wiki/:pageId', element: guarded('yaoguang.page.knowledge.kbId.wiki.pageId', <WikiPage />)},
      {path: 'assistant/knowledge', element: guarded('yaoguang.page.knowledge', <KnowledgeAssistantPage />)},
      {path: '*', element: <Result status="404" title="404" subTitle="页面不存在" />},
    ],
  },
]}], {basename: basePath})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = (error as { status?: number }).status
        return failureCount < 2 && (status === 429 || status === undefined || status >= 500)
      },
      staleTime: 5_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
})

const appConsoleRequirement =
  resources.find((entry) => entry.key === 'yaoguang.app.console')?.requirement
  ?? {mode: 'ALL' as const, codes: ['yuheng:knowledge:read']}

const YaoguangWorkbenchBridge = ({workbenchHost}: {readonly workbenchHost: WorkbenchHost}) => {
  const auth = useAuth()
  const navigate = useNavigate()

  const pages = useMemo(() => {
    if (!auth.authorization) return []
    const {snapshot, binding} = auth.authorization
    return buildYaoguangCatalogPages({
      allows: (requirement: unknown) => allowsSnapshotRequirement(snapshot, binding, requirement),
    })
  }, [auth.authorization])

  const status = useMemo(() => {
    if (auth.loading) return 'authorizing' as const
    if (auth.error) return 'failed' as const
    if (!auth.authorization) return 'denied' as const
    const {snapshot, binding} = auth.authorization
    return allowsSnapshotRequirement(snapshot, binding, appConsoleRequirement)
      ? ('ready' as const)
      : ('denied' as const)
  }, [auth.authorization, auth.error, auth.loading])

  const handlePresent = useCallback(async (presentation: Parameters<
    NonNullable<Parameters<typeof EmbeddedWorkbench>[0]['onPresent']>
  >[0]) => {
    if (presentation.mode !== 'show') {
      return bridgeOk()
    }
    const matched = matchYaoguangRoute(presentation.target.path)
    if (!matched) {
      return bridgeFail('NOT_FOUND')
    }
    if (!auth.authorization || !canAccessYaoguangRoute(auth.authorization, matched.route)) {
      return bridgeFail('DENIED')
    }
    await navigate(`${presentation.target.path}${presentation.target.search ?? ''}`, {replace: true})
    return bridgeOk()
  }, [auth.authorization, navigate])

  return (
    <EmbeddedWorkbench
      host={workbenchHost}
      status={status}
      pages={pages}
      onPresent={handlePresent}
    >
      <AdminLayout workbenchEmbedded />
    </EmbeddedWorkbench>
  )
}

const YaoguangWorkbenchRouter = ({workbenchHost}: {readonly workbenchHost: WorkbenchHost}) => {
  const [workbenchRouter] = useState(() => createMemoryRouter([
    {
      element: <WorkspaceAuthBoundary />,
      children: [
        {
          path: '/',
          element: <YaoguangWorkbenchBridge workbenchHost={workbenchHost} />,
          errorElement: <Result status="error" title="页面加载失败" subTitle="请返回上一页或刷新。" />,
          children: [
            {path: '__workbench/idle', element: null},
            {path: 'knowledge', element: guarded('yaoguang.page.knowledge', <KnowledgeBasesPage />)},
            {path: 'knowledge/:kbId', element: guarded('yaoguang.page.knowledge.kbId', <KnowledgeBasePage />)},
            {path: 'knowledge/:kbId/wiki/:pageId', element: guarded('yaoguang.page.knowledge.kbId.wiki.pageId', <WikiPage />)},
            {path: 'assistant/knowledge', element: guarded('yaoguang.page.knowledge', <KnowledgeAssistantPage />)},
            {path: '*', element: <Result status="404" title="404" subTitle="页面不存在" />},
          ],
        },
      ],
    },
  ], {initialEntries: ['/__workbench/idle']}))

  return <RouterProvider router={workbenchRouter} />
}

export const App = ({workbenchHost}: {readonly workbenchHost?: WorkbenchHost} = {}) => {
  const resolvedWorkbenchHost = workbenchHost ?? (window as WujieWorkbenchWindow).$wujie?.props?.workbenchHost

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#3157d5',
          borderRadius: 8,
          colorBgLayout: '#f4f6fa',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<LoadingBlock />}>
          {resolvedWorkbenchHost
            ? <YaoguangWorkbenchRouter workbenchHost={resolvedWorkbenchHost} />
            : <RouterProvider router={router} />}
        </Suspense>
      </QueryClientProvider>
    </ConfigProvider>
  )
}
