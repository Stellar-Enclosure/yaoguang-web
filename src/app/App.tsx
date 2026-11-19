import {FieldCatalogProvider} from '../permissions/FieldCatalog'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {Button, ConfigProvider, Result} from 'antd'
import zhCN from 'antd/locale/zh_CN'
import {lazy, Suspense, useEffect, useState, type ReactNode} from 'react'
import {createBrowserRouter, Link, Navigate, Outlet, RouterProvider, useNavigate, useParams} from 'react-router-dom'
import {CapabilityProvider, type Capability} from './capabilities'
import {AuthProvider} from '../auth/AuthContext'
import {LoginPage} from '../auth/LoginPage'
import {LOGIN_CALLBACK, POPUP_CALLBACK, STANDALONE_LOGIN, workspaceOAuth} from '../auth/authTransport'
import {RequireAuth, RequireCapability} from '../auth/RouteGuards'
import {LoadingBlock} from '../components/QueryState'
import {AdminLayout} from '../layouts/AdminLayout'

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

export const App = () => (
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
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>
  </ConfigProvider>
)
