import {Alert, Button, Card, Typography} from 'antd'
import {Navigate, useLocation} from 'react-router-dom'
import {useState} from 'react'
import {useAuth} from './AuthContext'
import {workspaceAuth} from './authTransport'
import {workspaceResource} from './workspaceResource'

export const LoginPage = () => {
  const auth = useAuth()
  const location = useLocation()
  const [pending, setPending] = useState(false)
  const from: unknown = location.state?.from
  const destination = typeof from === 'string' && /^\/[A-Za-z0-9/._~-]*$/.test(from)
    && !from.startsWith('//') && !from.split('/').some(segment => segment === '.' || segment === '..')
    && from !== '/login' && workspaceResource(from) === auth.workspace
    ? from : auth.workspace === 'yaoguang' ? '/knowledge' : '/dashboard'
  if (auth.authorization && !auth.loading) return <Navigate replace to={destination} />
  const login = async () => {
    setPending(true)
    try { await auth.login(destination) } finally { setPending(false) }
  }
  const standaloneUrl = workspaceAuth[auth.workspace].standaloneUrl()
  return (
    <main className="login-shell">
      <Card className="login-card">
        <Typography.Title level={2}>{auth.workspace === 'yaoguang' ? '知识库与 Wiki' : 'Yuheng Admin'}</Typography.Title>
        <Typography.Paragraph type="secondary">
          使用统一身份登录当前工作区。
        </Typography.Paragraph>
        {auth.error && <Alert type="warning" showIcon title={auth.error} />}
        <Button block type="primary" loading={auth.loading || pending} onClick={() => void login()}>
          使用统一身份登录
        </Button>
        {auth.error && <Button type="link" onClick={() => void auth.refreshAuthorization().catch(() => undefined)}>重新检查权限</Button>}
        {standaloneUrl && <Button type="link" href={standaloneUrl} target="_blank" rel="noopener">打开独立授权入口</Button>}
      </Card>
    </main>
  )
}
