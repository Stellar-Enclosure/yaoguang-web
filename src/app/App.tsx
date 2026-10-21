import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {ConfigProvider, Result} from 'antd'
import zhCN from 'antd/locale/zh_CN'
import {lazy, Suspense, useEffect, type ReactNode} from 'react'
import {createBrowserRouter, Navigate, Outlet, RouterProvider} from 'react-router-dom'
import {CapabilityProvider, type Capability} from './capabilities'
import {AuthProvider} from '../auth/AuthContext'
import {LoginPage} from '../auth/LoginPage'
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
  useEffect(() => () => { queryClient.clear() }, [])
  return (
    <AuthProvider resource="yaoguang">
      <CapabilityProvider><Outlet /></CapabilityProvider>
    </AuthProvider>
  )
}
const router = createBrowserRouter([{element: <WorkspaceAuthBoundary />, children: [
  {path: '/login', element: <LoginPage />},
  {
    path: '/',
    element: <RequireAuth><AdminLayout /></RequireAuth>,
    errorElement: <Result status="error" title="页面加载失败" subTitle="请返回上一页或刷新。" />,
    children: [
      {index: true, element: <Navigate replace to="/knowledge" />},
      {path: 'knowledge', element: guarded('yuheng:knowledge:read', <KnowledgeBasesPage />)},
      {path: 'knowledge/:kbId', element: guarded('yuheng:knowledge:read', <KnowledgeBasePage />)},
      {path: 'knowledge/:kbId/wiki/:pageId', element: guarded('yuheng:knowledge:read', <WikiPage />)},
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
