import {useWritableFields} from '../../permissions/FieldCatalog'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {useEmbeddedWorkbench} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd'
import {useEffect, useRef, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {
  knowledgeApi,
  knowledgeSearchModeValues,
  knowledgeSourceModeValues,
  type KnowledgeAnswer,
  type KnowledgeAnswerCommand,
  type KnowledgeCitation,
} from '../../api/knowledge'
import {GatewayApiError} from '../../api/client'
import {QueryFailure} from '../../components/QueryState'

export type AskForm = KnowledgeAnswerCommand

export interface KnowledgeAnswerPanelProps {
  readonly kbId: string
  readonly sessionKey?: string
  readonly submitOnEnter?: boolean
  readonly cardTitle?: string
  readonly onAnswered?: (command: AskForm, answer: KnowledgeAnswer) => void
  readonly onForbidden?: () => void
  readonly onOpenWikiCitation?: (citation: KnowledgeCitation) => void
}

const isForbidden = (error: unknown): boolean =>
  error instanceof GatewayApiError && error.status === 403

const KnowledgeAnswerPanelInner = ({
  kbId,
  submitOnEnter = false,
  cardTitle = '基于授权资料与 Wiki 提问',
  onAnswered,
  onForbidden,
  onOpenWikiCitation,
}: KnowledgeAnswerPanelProps) => {
  const {embedded, requestNavigation} = useEmbeddedWorkbench()
  const navigate = useNavigate()
  const answerFields = useWritableFields('KnowledgeAnswerCommandDTO')
  const queryClient = useQueryClient()
  const [form] = Form.useForm<AskForm>()
  const [result, setResult] = useState<KnowledgeAnswer>()
  const [selected, setSelected] = useState<KnowledgeCitation>()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const ask = useMutation({
    mutationFn: (command: AskForm) => knowledgeApi.createAnswer(kbId, command),
    retry: false,
    onSuccess: (answer, command) => {
      if (!mountedRef.current) return
      setSelected(undefined)
      setResult(answer)
      onAnswered?.(command, answer)
    },
    onError: (error) => {
      if (isForbidden(error)) {
        if (mountedRef.current) {
          setResult(undefined)
          setSelected(undefined)
        }
        queryClient.removeQueries({queryKey: ['knowledge', kbId]})
        onForbidden?.()
      }
    },
  })
  const revision = useQuery({
    queryKey: ['knowledge', kbId, 'document-revision', selected?.documentId, selected?.documentRevisionId],
    queryFn: ({signal}) => knowledgeApi.documentRevision(
      kbId,
      selected!.documentId,
      selected!.documentRevisionId,
      signal,
    ),
    enabled: Boolean(selected),
    retry: false,
  })
  const sourceChanged = Boolean(
    revision.data && selected && revision.data.hash !== selected.sourceHash,
  )

  const openWiki = (citation: KnowledgeCitation) => {
    if (!citation.pageId) return
    if (onOpenWikiCitation) {
      onOpenWikiCitation(citation)
      return
    }
    const targetPath = `/knowledge/${kbId}/wiki/${citation.pageId}`
    if (embedded) {
      requestNavigation('push', {path: targetPath, search: ''})
      return
    }
    navigate(targetPath)
  }

  return (
    <Space direction="vertical" size="middle" style={{width: '100%'}}>
      <Card title={cardTitle}>
        <Form<AskForm>
          disabled={!answerFields}
          form={form}
          layout="vertical"
          initialValues={{sourceMode: 'BOTH', topK: 8, searchMode: 'VECTOR'}}
          onFinish={(values) => ask.mutate(values)}
        >
          <Form.Item
            name="question"
            label="问题"
            extra="问题只作为用户输入，不作为系统指令。"
            rules={[{required: true, message: '请输入问题'}, {max: 8000}]}
          >
            <Input.TextArea
              rows={3}
              maxLength={8000}
              aria-label="问题"
              onKeyDown={(event) => {
                if (!submitOnEnter) return
                const native = event.nativeEvent as KeyboardEvent
                if (native.isComposing || event.keyCode === 229) return
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  form.submit()
                }
              }}
            />
          </Form.Item>
          <Space wrap align="start">
            <Form.Item name="sourceMode" label="证据范围">
              <Select
                aria-label="证据范围"
                style={{minWidth: 160}}
                options={knowledgeSourceModeValues.map((value) => ({value, label: value}))}
              />
            </Form.Item>
            <Form.Item name="topK" label="引用数量">
              <InputNumber aria-label="引用数量" min={1} max={20} />
            </Form.Item>
            <Form.Item name="searchMode" label="检索方式">
              <Select
                aria-label="检索方式"
                style={{minWidth: 140}}
                options={knowledgeSearchModeValues.map((value) => ({value, label: value}))}
              />
            </Form.Item>
          </Space>
          <Button type="primary" htmlType="submit" loading={ask.isPending} disabled={!answerFields || ask.isPending}>
            提交问题
          </Button>
        </Form>
        {ask.isError && <QueryFailure error={ask.error} />}
      </Card>
      {result && (
        <Card
          title={result.outcome === 'ANSWERED' ? '回答' : '未找到可引用资料'}
          extra={<Tag>{`模型：${result.model}`}</Tag>}
        >
          {result.outcome === 'ANSWERED' ? (
            <Typography.Paragraph style={{whiteSpace: 'pre-wrap'}}>
              {result.answer}
            </Typography.Paragraph>
          ) : (
            <Alert
              type="info"
              showIcon
              title="未找到可引用资料"
              description="空结果不是故障：本轮不生成任何引用，也不编造回答。"
            />
          )}
          <Divider titlePlacement="left" plain>
            引用（{result.citations.length}）
          </Divider>
          <List<KnowledgeCitation>
            dataSource={result.citations}
            locale={{emptyText: '无引用'}}
            renderItem={(item) => (
              <List.Item key={`${item.documentRevisionId}:${item.chunkId}`}>
                <Space direction="vertical" size={4}>
                  <Space wrap>
                    <Typography.Text strong>{item.fileName}</Typography.Text>
                    <Tag>{`版本 ${item.documentRevisionId}`}</Tag>
                    <Tag>{`分块 ${item.chunkId}`}</Tag>
                    <Tag>{`分数 ${item.score}`}</Tag>
                  </Space>
                  <Typography.Paragraph style={{whiteSpace: 'pre-wrap'}}>
                    {item.excerpt}
                  </Typography.Paragraph>
                  <Space wrap>
                    <Button
                      size="small"
                      onClick={() => setSelected(item)}
                    >
                      查看原文版本
                    </Button>
                    {item.pageId && (
                      <Button
                        size="small"
                        type="link"
                        onClick={() => openWiki(item)}
                      >
                        {`打开 Wiki ${item.pageId}`}
                      </Button>
                    )}
                    {item.pageId && <Tag>{`Wiki ${item.pageId}`}</Tag>}
                  </Space>
                </Space>
              </List.Item>
            )}
          />
        </Card>
      )}
      {selected && (
        <Card title="引用原文">
          {revision.isLoading && <Typography.Text>正在读取授权原文…</Typography.Text>}
          {revision.isError && <QueryFailure error={revision.error} />}
          {sourceChanged && (
            <Alert
              type="warning"
              showIcon
              title="来源已变化"
              description="冻结 hash 与该版本的当前 hash 不一致，回答的引用可能已过期。"
            />
          )}
          {revision.data && (
            <Typography.Paragraph style={{whiteSpace: 'pre-wrap'}}>
              {revision.data.text}
            </Typography.Paragraph>
          )}
        </Card>
      )}
    </Space>
  )
}

// 正文一律按纯文本渲染（不用 dangerouslySetInnerHTML）；引用可追溯到冻结版本与 hash。
export const KnowledgeAnswerPanel = (props: KnowledgeAnswerPanelProps) => (
  <KnowledgeAnswerPanelInner key={`${props.kbId}:${props.sessionKey ?? 'default'}`} {...props} />
)
