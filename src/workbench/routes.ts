import {
  type AppPageDescriptor,
} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {
  allowsSnapshotRequirement,
  type PermissionRequirement,
  type PermissionSnapshot,
  type PermissionSnapshotBinding,
} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import { resources } from '../permissions/resources'

type ResourceEntry = (typeof resources)[number]

export interface YaoguangPermissionChecker {
  readonly allows: (requirement: unknown) => boolean
}

export interface YaoguangWorkbenchRouteDescriptor {
  readonly id: string
  readonly resourceKey: string
  readonly pattern: string
  readonly title: string
  readonly group: string
  readonly groupLabel: string
  readonly navVisible: boolean
  readonly identityParams: readonly string[]
  readonly queryKeys: readonly string[]
  readonly requirement: PermissionRequirement
}

export interface YaoguangRouteMatch {
  readonly route: YaoguangWorkbenchRouteDescriptor
  readonly params: Record<string, string>
}

export type YaoguangAuthorizationSource =
  | YaoguangPermissionChecker
  | { readonly snapshot: PermissionSnapshot | null; readonly binding: PermissionSnapshotBinding | null }

const findResource = (key: string): ResourceEntry => {
  const entry = resources.find((candidate) => candidate.key === key)
  if (!entry) {
    throw new Error(`Missing permission resource for workbench route: ${key}`)
  }
  return entry
}

const routeMeta = [
  {
    key: 'yaoguang.page.knowledge',
    pattern: '/knowledge',
    title: '企业知识',
    group: 'knowledge',
    groupLabel: '企业知识',
    navVisible: true,
    identityParams: [] as readonly string[],
    queryKeys: [] as readonly string[],
  },
  {
    key: 'yaoguang.page.knowledge.kbId',
    pattern: '/knowledge/:kbId',
    title: '知识库工作区',
    group: 'knowledge',
    groupLabel: '企业知识',
    navVisible: false,
    identityParams: ['kbId'] as readonly string[],
    queryKeys: ['tab'] as readonly string[],
  },
  {
    key: 'yaoguang.page.knowledge.kbId.wiki.pageId',
    pattern: '/knowledge/:kbId/wiki/:pageId',
    title: 'Wiki 页面',
    group: 'knowledge',
    groupLabel: '企业知识',
    navVisible: false,
    identityParams: ['kbId', 'pageId'] as readonly string[],
    queryKeys: ['revision'] as readonly string[],
  },
] as const

export const yaoguangWorkbenchRoutes: readonly YaoguangWorkbenchRouteDescriptor[] = routeMeta.map((meta) => {
  const entry = findResource(meta.key)
  const requirement: PermissionRequirement = 'requirement' in entry
    ? entry.requirement
    : { mode: 'ALL', codes: [] }
  return {
    id: meta.key,
    resourceKey: meta.key,
    pattern: meta.pattern,
    title: meta.title,
    group: meta.group,
    groupLabel: meta.groupLabel,
    navVisible: meta.navVisible,
    identityParams: meta.identityParams,
    queryKeys: meta.queryKeys,
    requirement,
  }
})

export const canAccessYaoguangRoute = (
  checker: YaoguangAuthorizationSource,
  route: YaoguangWorkbenchRouteDescriptor,
): boolean => {
  if ('allows' in checker) {
    return checker.allows(route.requirement)
  }
  return allowsSnapshotRequirement(checker.snapshot, checker.binding, route.requirement)
}

export const buildYaoguangCatalogPages = (checker: YaoguangAuthorizationSource): AppPageDescriptor[] =>
  yaoguangWorkbenchRoutes
    .filter((route) => route.navVisible && canAccessYaoguangRoute(checker, route))
    .map((route) => ({
      pageId: route.id,
      pattern: route.pattern,
      label: route.title,
      groupKey: route.group,
      groupLabel: route.groupLabel,
      identityParams: route.identityParams,
      queryKeys: route.queryKeys,
    }))

export const matchYaoguangRoute = (path: string): YaoguangRouteMatch | null => {
  const normalized = path.split('?')[0] ?? path
  for (const route of yaoguangWorkbenchRoutes) {
    const routeSegments = route.pattern.split('/').filter(Boolean)
    const pathSegments = normalized.split('/').filter(Boolean)
    if (routeSegments.length !== pathSegments.length) continue
    const params: Record<string, string> = {}
    let matched = true
    for (let index = 0; index < routeSegments.length; index += 1) {
      const routeSegment = routeSegments[index]!
      const pathSegment = pathSegments[index]!
      if (routeSegment.startsWith(':')) {
        params[routeSegment.slice(1)] = decodeURIComponent(pathSegment)
      } else if (routeSegment !== pathSegment) {
        matched = false
        break
      }
    }
    if (matched) {
      return { route, params }
    }
  }
  return null
}
