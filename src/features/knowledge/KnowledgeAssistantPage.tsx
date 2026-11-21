import {useQuery} from '@tanstack/react-query'
import {useEmbeddedWorkbench} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {Alert, Button, Card, Empty, Select, Space, Tag, Typography} from 'antd'
import {useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {knowledgeApi, type KnowledgeAnswer, type KnowledgeCitation} from '../../api/knowledge'
import {useAuth} from '../../auth/AuthContext'
import {useCapability} from '../../app/capabilities'
import {LoadingBlock, QueryFailure} from '../../components/QueryState'
import {KnowledgeAnswerPanel} from './KnowledgeAnswerPanel'

interface AssistantTurn {
  readonly id: string
  readonly question: string
  readonly answer: KnowledgeAnswer
}

interface AssistantSession {
  readonly id: string
  readonly title: string
  readonly kbId?: string
  readonly turns: readonly AssistantTurn[]
}

const createEmptySession = (index: number, kbId?: string): AssistantSession => ({
  id: `session-${index}`,
  title: `会话 ${index}`,
  kbId,
  turns: [],
})

export const KnowledgeAssistantPage = () => {
  const {embedded, requestNavigation} = useEmbeddedWorkbench()
  const navigate = useNavigate()
  const auth = useAuth()
  const canRead = useCapability('yaoguang.page.knowledge')
  const authorized = Boolean(canRead && auth.authorization)

  const bases = useQuery({
    queryKey: ['knowledge', 'assistant', 'bases'],
    queryFn: ({signal}) => knowledgeApi.knowledgeBases({page: 1, size: 50}, signal),
    enabled: authorized,
    retry: false,
  })

  const [sessions, setSessions] = useState<AssistantSession[]>([createEmptySession(1)])
  const [activeSessionId, setActiveSessionId] = useState('session-1')
  const [selectedKbId, setSelectedKbId] = useState<string>()
  const [revoked, setRevoked] = useState(false)

  if (!authorized || revoked) {
    return (
      <Alert
        type="warning"
        showIcon
        title="无权访问知识助手（缺少 yuheng:knowledge:read 能力）"
      />
    )
  }

  if (bases.isLoading) {
    return <LoadingBlock />
  }

  if (bases.isError) {
    return <QueryFailure error={bases.error} retry={() => void bases.refetch()} />
  }

  const kbItems = bases.data?.items ?? []
  const effectiveKbId = selectedKbId && kbItems.some((item) => item.id === selectedKbId)
    ? selectedKbId
    : kbItems[0]?.id

  const activeSession = sessions.find((item) => item.id === activeSessionId) ?? sessions[0]!

  const handleNewSession = () => {
    const nextIndex = sessions.length + 1
    const next = createEmptySession(nextIndex, effectiveKbId)
    setSessions((previous) => [...previous, next])
    setActiveSessionId(next.id)
  }

  const handleAnswered = (question: string, answer: KnowledgeAnswer) => {
    setSessions((previous) => previous.map((session) => (
      session.id === activeSession.id
        ? {
            ...session,
            kbId: effectiveKbId,
            turns: [...session.turns, {id: `${session.id}:${session.turns.length + 1}`, question, answer}],
          }
        : session
    )))
  }

  const handleForbidden = () => {
    setSessions([createEmptySession(1)])
    setActiveSessionId('session-1')
    setRevoked(true)
  }

  const handleOpenWikiCitation = (citation: KnowledgeCitation) => {
    if (!effectiveKbId || !citation.pageId) return
    const targetPath = `/knowledge/${effectiveKbId}/wiki/${citation.pageId}`
    if (embedded) {
      requestNavigation('push', {path: targetPath, search: ''})
      return
    }
    navigate(targetPath)
  }

  return (
    <div
      style={{
        width: '100%',
        minWidth: 0,
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'minmax(220px, 260px) minmax(0, 1fr)',
      }}
    >
      <Card
        size="small"
        title="知识会话"
        extra={<Button size="small" onClick={handleNewSession}>新建会话</Button>}
      >
        <Space direction="vertical" size="middle" style={{width: '100%'}}>
          <div>
            <Typography.Text strong>目标知识库</Typography.Text>
            <Select
              aria-label="选择知识库"
              style={{width: '100%', marginTop: 6}}
              value={effectiveKbId}
              placeholder="选择已授权知识库"
              options={kbItems.map((kb) => ({value: kb.id, label: kb.name}))}
              onChange={(nextKbId) => setSelectedKbId(nextKbId)}
            />
          </div>
          <Space direction="vertical" size={6} style={{width: '100%'}}>
            {sessions.map((session) => (
              <Button
                key={session.id}
                block
                type={session.id === activeSession.id ? 'primary' : 'default'}
                onClick={() => setActiveSessionId(session.id)}
              >
                {session.title}
              </Button>
            ))}
          </Space>
        </Space>
      </Card>

      <Space direction="vertical" size="middle" style={{width: '100%', minWidth: 0}}>
        {!effectiveKbId ? (
          <Empty description="暂无可用知识库，请先在知识库中获得成员授权。" />
        ) : (
          <>
            {activeSession.turns.length > 0 && (
              <Card size="small" title={`${activeSession.title} · 对话记录`}>
                <Space direction="vertical" size="small" style={{width: '100%'}}>
                  {activeSession.turns.map((turn) => (
                    <Card key={turn.id} size="small" type="inner" title={turn.question}>
                      <Space wrap>
                        <Tag>{turn.answer.outcome}</Tag>
                        <Tag>{`引用 ${turn.answer.citations.length} 条`}</Tag>
                      </Space>
                    </Card>
                  ))}
                </Space>
              </Card>
            )}
            <KnowledgeAnswerPanel
              kbId={effectiveKbId}
              sessionKey={activeSession.id}
              submitOnEnter
              cardTitle="授权知识问答助手"
              onAnswered={(command, answer) => handleAnswered(command.question, answer)}
              onForbidden={handleForbidden}
              onOpenWikiCitation={handleOpenWikiCitation}
            />
          </>
        )}
      </Space>
    </div>
  )
}
