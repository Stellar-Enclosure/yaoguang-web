import {usePermission} from '@stellar-enclosure/stellar-enclosure-web-shared/react-permissions'
import {resources} from '../permissions/resources'
import {LogoutOutlined, ReadOutlined} from '@ant-design/icons'
import {Badge, Space} from 'antd'
import {useQueryClient} from '@tanstack/react-query'
import {
    EnterpriseLayout,
    type EnterpriseLayoutConfig,
    type EnterpriseNavigationItem,
} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {Outlet, useNavigate} from 'react-router-dom'
import {version} from '../../package.json'
import {useAuth} from '../auth/AuthContext'
import {type Capability} from '../app/capabilities'

// 平台自己的导航树，由 capability 递归剪枝后交给 shared 左侧树。
interface GatewayNavItem {
  key: string
  icon: React.ReactNode
  label: string
  capability: Capability
  path?: string
  activePathPrefixes?: readonly string[]
  children?: readonly GatewayNavItem[]
}

interface WujieRuntimeWindow extends Window {
  $wujie?: { props?: { embedded?: boolean } }
}

const navigation: readonly GatewayNavItem[] = [
  {
    key: 'knowledge',
    icon: <ReadOutlined />,
    label: '企业知识',
    capability: 'yaoguang.menu.group1',
    children: [
      {key: '/knowledge', path: '/knowledge', activePathPrefixes: ['/knowledge'], icon: <ReadOutlined />, label: '知识库', capability: 'yaoguang.menu.knowledge'},
    ],
  },
]

export const AdminLayout = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const auth = useAuth()
  const permission = usePermission(auth.authorization?.snapshot ?? null, auth.authorization?.binding ?? null)

  const embedded = (window as WujieRuntimeWindow).$wujie?.props?.embedded === true
  const items: EnterpriseNavigationItem[] = filterNavigation(navigation, Object.fromEntries(resources.map(resource => [resource.key, permission.allows('requirement' in resource ? resource.requirement : {access: resource.access})])))

  const config: EnterpriseLayoutConfig = {
    platformName: 'Yaoguang Admin',
    navigation: items,
    actions: (
      <Space size="middle" wrap>
        <Badge status="processing" text="Knowledge API" />
      </Space>
    ),
      user: auth.authorization
      ? {
              name: auth.authorization.user.identitySub,
          menu: [
            {
              key: 'logout',
              label: '退出登录',
              icon: <LogoutOutlined />,
              onClick: () => {
                void auth.logout()
                queryClient.clear()
                navigate('/login', { replace: true })
              },
            },
          ],
        }
      : undefined,
    footer: { version },
  }
  const layoutConfig: EnterpriseLayoutConfig = embedded
    ? {...config, hideHeader: true, hideFooter: true}
    : config

  return (
    <EnterpriseLayout config={layoutConfig}>
      <Outlet />
    </EnterpriseLayout>
  )
}

const filterNavigation = (
  entries: readonly GatewayNavItem[],
  granted: Partial<Record<Capability, boolean>>,
): EnterpriseNavigationItem[] => entries.flatMap((item): EnterpriseNavigationItem[] => {
  // 未在本页显式订阅的能力一律按“无权限”处理，导航不放宽。
  if (!granted[item.capability]) return []
  const children = item.children ? filterNavigation(item.children, granted) : []
  if (item.children && children.length === 0) return []
  return [{
    key: item.key,
    label: item.label,
    path: item.path,
    icon: item.icon,
    activePathPrefixes: item.activePathPrefixes,
    children: children.length > 0 ? children : undefined,
  }]
})
