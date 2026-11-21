import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react'
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
  EmbeddedWorkbench,
  type WorkbenchHost,
  type WorkbenchPort,
} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {knowledgeApi, type KnowledgeAnswer, type KnowledgeBase} from '../../api/knowledge'
import {GatewayApiError} from '../../api/client'
import {authorizationFixture} from '../../test/permissionFixtures'

const mockState = vi.hoisted(() => ({
  authorization: null as unknown,
  writableFields: true,
}))

vi.mock('../../auth/AuthContext', () => ({
  AuthProvider: ({children}: {children: React.ReactNode}) => children,
  useAuth: () => ({
    loading: false,
    authorization: mockState.authorization,
    error: undefined,
    login: vi.fn(),
    logout: vi.fn(),
    refreshAuthorization: vi.fn(),
  }),
  httpClient: {request: vi.fn()},
}))

vi.mock('../../permissions/FieldCatalog', () => ({
  FieldCatalogProvider: ({children}: {children: React.ReactNode}) => children,
  useWritableFields: () => mockState.writableFields,
  useUploadFieldsWritable: () => true,
}))

vi.mock('../../api/knowledge', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../../api/knowledge')
  return {
    ...actual,
    knowledgeApi: {
      ...(actual.knowledgeApi as Record<string, unknown>),
      knowledgeBases: vi.fn(),
      createAnswer: vi.fn(),
      documentRevision: vi.fn(),
    },
  }
})

import {CapabilityProvider} from '../../app/capabilities'
import {buildYaoguangCatalogPages, matchYaoguangRoute} from '../../workbench/routes'
import {KnowledgeAssistantPage} from './KnowledgeAssistantPage'

const kbFixture = (id: string, name: string): KnowledgeBase => ({
  id,
  name,
  description: `${name}说明`,
  ownerActorId: 'owner-1',
  myRole: 'READER',
  egressPolicy: 'LOCAL_ONLY',
  chatModel: 'chat-main',
  embeddingModel: 'embed-local',
  embeddingSpaceId: 'space-1',
  dimensions: 1024,
  revision: 1,
})

const answeredFixture = (answer = '已根据授权文档汇总结论。'): KnowledgeAnswer => ({
  outcome: 'ANSWERED',
  answer,
  model: 'chat-main',
  citations: [
    {
      documentRevisionId: 'rev-1',
      chunkId: 'chunk-1',
      sourceHash: 'hash-expected',
      documentId: 'doc-1',
      fileName: '架构手册.md',
      pageId: 'wiki-1',
      excerpt: '工作台仅挂载已授权路由。',
      score: 0.95,
    },
  ],
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok
    reject = fail
  })
  return {promise, resolve, reject}
}

describe('KnowledgeAssistantPage', () => {
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
    mockState.writableFields = true
    mockState.authorization = authorizationFixture('yaoguang', ['yuheng:knowledge:read'])
    vi.mocked(knowledgeApi.knowledgeBases).mockResolvedValue({
      items: [kbFixture('kb-1', '研发知识库'), kbFixture('kb-2', '财务知识库')],
      page: 1,
      size: 50,
      total: 2,
    })
    vi.mocked(knowledgeApi.documentRevision).mockResolvedValue({
      id: 'rev-1',
      documentId: 'doc-1',
      kbId: 'kb-1',
      fileName: '架构手册.md',
      mediaType: 'text/markdown',
      byteCount: 24,
      status: 'READY',
      hash: 'hash-changed',
      text: '修订后的原文内容',
      createdAt: '2026-11-20T00:00:00Z',
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('denies access cleanly without yuheng:knowledge:read', async () => {
    mockState.authorization = authorizationFixture('yaoguang', [])
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}})

    render(
      <QueryClientProvider client={queryClient}>
        <CapabilityProvider>
          <MemoryRouter initialEntries={['/assistant/knowledge']}>
            <Routes>
              <Route path="/assistant/knowledge" element={<KnowledgeAssistantPage />} />
            </Routes>
          </MemoryRouter>
        </CapabilityProvider>
      </QueryClientProvider>,
    )

    expect(await screen.findByText(/无权|缺少.*读取/)).toBeInTheDocument()
    expect(knowledgeApi.knowledgeBases).not.toHaveBeenCalled()
  })

  it('respects IME composition vs Enter submit, verifies sourceHash, and navigates to Wiki citation', async () => {
    vi.mocked(knowledgeApi.createAnswer).mockResolvedValueOnce(answeredFixture())
    const navCalls: unknown[] = []
    const capturedPorts: WorkbenchPort[] = []
    const host: WorkbenchHost = {
      attach: (port) => {
        capturedPorts.push(port)
        return {ok: true}
      },
      reportCatalog: () => ({ok: true}),
      requestNavigation: (req) => {
        navCalls.push(req)
        return {ok: true}
      },
    }
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}})

    const LocationEcho = () => {
      const loc = useLocation()
      return <span data-testid="loc">{loc.pathname}</span>
    }

    render(
      <QueryClientProvider client={queryClient}>
        <CapabilityProvider>
          <MemoryRouter initialEntries={['/assistant/knowledge']}>
            <EmbeddedWorkbench host={host} status="ready" pages={[]} onPresent={async () => ({ok: true as const})}>
              <Routes>
                <Route path="/assistant/knowledge" element={<><KnowledgeAssistantPage /><LocationEcho /></>} />
                <Route path="/knowledge/:kbId/wiki/:pageId" element={<div>Wiki 目标页</div>} />
              </Routes>
            </EmbeddedWorkbench>
          </MemoryRouter>
        </CapabilityProvider>
      </QueryClientProvider>,
    )

    await waitFor(() => expect(capturedPorts).toHaveLength(1))
    await capturedPorts[0]!.present({
      mode: 'show',
      navigationId: 1,
      tabKey: '["yaoguang","yaoguang.assistant.knowledge"]',
      target: {path: '/assistant/knowledge', search: ''},
      signal: new AbortController().signal,
    })

    expect(await screen.findByText('研发知识库')).toBeInTheDocument()
    const input = await screen.findByLabelText('问题')
    fireEvent.change(input, {target: {value: '工作台有哪些限制？'}})

    // IME composing Enter must NOT submit
    fireEvent.keyDown(input, {key: 'Enter', code: 'Enter', isComposing: true, keyCode: 229})
    expect(knowledgeApi.createAnswer).not.toHaveBeenCalled()

    // Non-composing Enter submits
    fireEvent.keyDown(input, {key: 'Enter', code: 'Enter', isComposing: false})
    expect(await screen.findByText('已根据授权文档汇总结论。')).toBeInTheDocument()
    expect(knowledgeApi.createAnswer).toHaveBeenCalledWith(
      'kb-1',
      expect.objectContaining({question: '工作台有哪些限制？', sourceMode: 'BOTH', topK: 8, searchMode: 'VECTOR'}),
    )

    // Verify sourceHash mismatch warning
    fireEvent.click(screen.getByRole('button', {name: '查看原文版本'}))
    expect(await screen.findByText('来源已变化')).toBeInTheDocument()
    expect(screen.getByText('修订后的原文内容')).toBeInTheDocument()

    // Click Wiki citation -> navigates or requests navigation to /knowledge/kb-1/wiki/wiki-1
    fireEvent.click(screen.getByRole('button', {name: /打开 Wiki/}))
    await waitFor(() =>
      expect(navCalls).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            target: {path: '/knowledge/kb-1/wiki/wiki-1', search: ''},
          }),
        ]),
      ),
    )
  })

  it('isolates multi-session transcripts and drops late responses after switching sessions or leaving', async () => {
    const first = deferred<KnowledgeAnswer>()
    vi.mocked(knowledgeApi.createAnswer).mockImplementationOnce(() => first.promise)
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}})

    render(
      <QueryClientProvider client={queryClient}>
        <CapabilityProvider>
          <MemoryRouter initialEntries={['/assistant/knowledge']}>
            <Routes>
              <Route path="/assistant/knowledge" element={<KnowledgeAssistantPage />} />
            </Routes>
          </MemoryRouter>
        </CapabilityProvider>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('研发知识库')).toBeInTheDocument()
    fireEvent.change(await screen.findByLabelText('问题'), {target: {value: '会话一的问题'}})
    fireEvent.click(screen.getByRole('button', {name: '提交问题'}))
    await waitFor(() => expect(knowledgeApi.createAnswer).toHaveBeenCalledTimes(1))

    // Switch to a new session while request is still in-flight
    fireEvent.click(screen.getByRole('button', {name: '新建会话'}))
    first.resolve(answeredFixture('会话一的迟到回答'))
    await Promise.resolve()

    expect(screen.queryByText('会话一的迟到回答')).not.toBeInTheDocument()
  })

  it('clears cached assistant answers when backend returns 403', async () => {
    vi.mocked(knowledgeApi.createAnswer)
      .mockResolvedValueOnce(answeredFixture('首次回答'))
      .mockRejectedValueOnce(new GatewayApiError(403, 'FORBIDDEN', 'denied'))
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}})

    render(
      <QueryClientProvider client={queryClient}>
        <CapabilityProvider>
          <MemoryRouter initialEntries={['/assistant/knowledge']}>
            <Routes>
              <Route path="/assistant/knowledge" element={<KnowledgeAssistantPage />} />
            </Routes>
          </MemoryRouter>
        </CapabilityProvider>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('研发知识库')).toBeInTheDocument()
    fireEvent.change(await screen.findByLabelText('问题'), {target: {value: '第一个问题'}})
    fireEvent.click(screen.getByRole('button', {name: '提交问题'}))
    expect(await screen.findByText('首次回答')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('问题'), {target: {value: '失权后的问题'}})
    fireEvent.click(screen.getByRole('button', {name: '提交问题'}))
    await waitFor(() => expect(screen.queryByText('首次回答')).not.toBeInTheDocument())
  })

  it('registers /assistant/knowledge internally without advertising it as a regular business tab', () => {
    expect(matchYaoguangRoute('/assistant/knowledge')?.route.id).toBe('yaoguang.assistant.knowledge')
    const catalog = buildYaoguangCatalogPages({allows: () => true})
    expect(catalog.map((page) => page.pattern)).toEqual(['/knowledge'])
    expect(catalog.map((page) => page.pattern)).not.toContain('/assistant/knowledge')
  })
})
