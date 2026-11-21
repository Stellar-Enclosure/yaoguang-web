import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EmbeddedWorkbench,
  validatePageDescriptor,
  validateRelativeRoutePath,
  type WorkbenchHost,
} from '@stellar-enclosure/stellar-enclosure-web-shared'
import { allowsSnapshotRequirement } from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import { authorizationFixture } from '../test/permissionFixtures'

const mockState = vi.hoisted(() => ({
  authorization: null as unknown,
  knowledgeBases: vi.fn(),
}))

vi.mock('../auth/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    loading: false,
    authorization: mockState.authorization,
    error: undefined,
    login: vi.fn(),
    logout: vi.fn(),
    refreshAuthorization: vi.fn(),
  }),
  httpClient: { request: vi.fn() },
}))

vi.mock('../permissions/FieldCatalog', () => ({
  FieldCatalogProvider: ({ children }: { children: ReactNode }) => children,
  useWritableFields: () => true,
  useUploadFieldsWritable: () => true,
}))

vi.mock('../api/knowledge', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../api/knowledge')
  return {
    ...actual,
    knowledgeApi: {
      ...(actual.knowledgeApi as Record<string, unknown>),
      knowledgeBases: mockState.knowledgeBases,
    },
  }
})

import { KnowledgeBasesPage } from '../features/knowledge/KnowledgeBasesPage'
import {
  buildYaoguangCatalogPages,
  canAccessYaoguangRoute,
  matchYaoguangRoute,
  yaoguangWorkbenchRoutes,
} from './routes'

const makeChecker = (codes: string[]) => {
  const { snapshot, binding } = authorizationFixture('yaoguang', codes)
  return {
    allows: (requirement: unknown) => allowsSnapshotRequirement(snapshot, binding, requirement),
  }
}

describe('yaoguangWorkbenchRoutes', () => {
  it('registers Spec §12.1 knowledge routes and excludes login/callbacks', () => {
    expect(yaoguangWorkbenchRoutes.map((route) => route.pattern)).toEqual([
      '/knowledge',
      '/knowledge/:kbId',
      '/knowledge/:kbId/wiki/:pageId',
    ])

    for (const route of yaoguangWorkbenchRoutes) {
      expect(validateRelativeRoutePath(route.pattern)).toBe(route.pattern)
      expect(route.pattern).not.toMatch(/\/login|\/auth\//)
    }

    const descriptors = buildYaoguangCatalogPages(makeChecker(['yuheng:knowledge:read']))
    expect(descriptors).toHaveLength(1)
    expect(descriptors[0]!.pattern).toBe('/knowledge')
    expect(validatePageDescriptor(descriptors[0])).toBe(true)
  })

  it('matches parameterized kbId and wiki pageId cleanly', () => {
    const kb = matchYaoguangRoute('/knowledge/71001')
    expect(kb?.route.pattern).toBe('/knowledge/:kbId')
    expect(kb?.params).toEqual({ kbId: '71001' })

    const wiki = matchYaoguangRoute('/knowledge/71001/wiki/page-9')
    expect(wiki?.route.pattern).toBe('/knowledge/:kbId/wiki/:pageId')
    expect(wiki?.params).toEqual({ kbId: '71001', pageId: 'page-9' })
  })

  it('filters catalog by yuheng:knowledge:read without escalating access', () => {
    const empty = makeChecker([])
    expect(buildYaoguangCatalogPages(empty)).toEqual([])
    expect(canAccessYaoguangRoute(empty, yaoguangWorkbenchRoutes[0]!)).toBe(false)
  })
})

describe('yaoguang embedded KnowledgeBasesPage', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })))
    mockState.authorization = authorizationFixture('yaoguang', ['yuheng:knowledge:read'])
    mockState.knowledgeBases.mockReset().mockResolvedValue({
      items: [{
        id: 'kb-1',
        name: '平台研发知识库',
        myRole: 'OWNER',
        egressPolicy: 'LOCAL_ONLY',
        chatModel: 'chat-main',
        embeddingModel: 'embed-local',
      }],
      total: 1,
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders KnowledgeBasesPage inside WorkspaceList regions when embedded', async () => {
    const host: WorkbenchHost = {
      attach: () => ({ ok: true }),
      reportCatalog: () => ({ ok: true }),
      requestNavigation: () => ({ ok: true }),
    }
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          { initialEntries: ['/knowledge'] },
          createElement(EmbeddedWorkbench, {
            host,
            status: 'ready',
            pages: [],
            onPresent: async () => ({ ok: true as const }),
            children: createElement(
              Routes,
              null,
              createElement(Route, { path: '/knowledge', element: createElement(KnowledgeBasesPage) }),
            ),
          }),
        ),
      ),
    )

    expect(await screen.findByText('平台研发知识库')).toBeInTheDocument()
    await waitFor(() => expect(container.querySelector('[data-region="table"]')).toBeInTheDocument())
    expect(container.querySelector('[data-region="query"]')).toBeInTheDocument()
  })
})
