import {defineResourceReferences} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'

export const fieldReferences = defineResourceReferences([
  {
    "key": "yaoguang.field.KnowledgeAnswerCommandDTO.question",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeAnswerCommandDTO.searchMode",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeAnswerCommandDTO.sourceMode",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeAnswerCommandDTO.topK",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeBaseCommandDTO.chatModel",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeBaseCommandDTO.description",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeBaseCommandDTO.egressPolicy",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeBaseCommandDTO.embeddingModel",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeBaseCommandDTO.expectedRevision",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeBaseCommandDTO.name",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeBaseCreateCommandDTO.chatModel",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeBaseCreateCommandDTO.description",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeBaseCreateCommandDTO.egressPolicy",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeBaseCreateCommandDTO.embeddingModel",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeBaseCreateCommandDTO.name",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeMemberWriteDTO.actorId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeMemberWriteDTO.role",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeMembersReplaceCommandDTO.expectedRevision",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeMembersReplaceCommandDTO.members",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeReindexCommandDTO.expectedRevision",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeReindexCommandDTO.sourceRevisionId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeRetryCommandDTO.expectedRevision",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeUploadCommandDTO.content",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeUploadCommandDTO.documentId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeUploadCommandDTO.expectedRevision",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeUploadCommandDTO.fileName",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.KnowledgeUploadCommandDTO.mediaType",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.WikiDraftWriteCommandDTO.expectedRevision",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.WikiDraftWriteCommandDTO.links",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.WikiDraftWriteCommandDTO.markdown",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.WikiDraftWriteCommandDTO.sources",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.WikiDraftWriteCommandDTO.tags",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.WikiDraftWriteCommandDTO.title",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.WikiGenerationCommandDTO.expectedRevision",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.WikiGenerationCommandDTO.pageId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.WikiGenerationCommandDTO.sourceRevisionIds",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.WikiPublicationCommandDTO.draftRevisionId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.WikiPublicationCommandDTO.expectedRevision",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.WikiSourceWriteDTO.chunkId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.WikiSourceWriteDTO.documentRevisionId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "yaoguang.field.WikiSourceWriteDTO.sourceHash",
    "usage": "FORM_FIELD"
  }
] as const)

export const inputFields = {
  "KnowledgeAnswerCommandDTO": [
    "yaoguang.field.KnowledgeAnswerCommandDTO.question",
    "yaoguang.field.KnowledgeAnswerCommandDTO.searchMode",
    "yaoguang.field.KnowledgeAnswerCommandDTO.sourceMode",
    "yaoguang.field.KnowledgeAnswerCommandDTO.topK"
  ],
  "KnowledgeBaseCommandDTO": [
    "yaoguang.field.KnowledgeBaseCommandDTO.chatModel",
    "yaoguang.field.KnowledgeBaseCommandDTO.description",
    "yaoguang.field.KnowledgeBaseCommandDTO.egressPolicy",
    "yaoguang.field.KnowledgeBaseCommandDTO.embeddingModel",
    "yaoguang.field.KnowledgeBaseCommandDTO.expectedRevision",
    "yaoguang.field.KnowledgeBaseCommandDTO.name"
  ],
  "KnowledgeBaseCreateCommandDTO": [
    "yaoguang.field.KnowledgeBaseCreateCommandDTO.chatModel",
    "yaoguang.field.KnowledgeBaseCreateCommandDTO.description",
    "yaoguang.field.KnowledgeBaseCreateCommandDTO.egressPolicy",
    "yaoguang.field.KnowledgeBaseCreateCommandDTO.embeddingModel",
    "yaoguang.field.KnowledgeBaseCreateCommandDTO.name"
  ],
  "KnowledgeMemberWriteDTO": [
    "yaoguang.field.KnowledgeMemberWriteDTO.actorId",
    "yaoguang.field.KnowledgeMemberWriteDTO.role"
  ],
  "KnowledgeMembersReplaceCommandDTO": [
    "yaoguang.field.KnowledgeMembersReplaceCommandDTO.expectedRevision",
    "yaoguang.field.KnowledgeMembersReplaceCommandDTO.members"
  ],
  "KnowledgeReindexCommandDTO": [
    "yaoguang.field.KnowledgeReindexCommandDTO.expectedRevision",
    "yaoguang.field.KnowledgeReindexCommandDTO.sourceRevisionId"
  ],
  "KnowledgeRetryCommandDTO": [
    "yaoguang.field.KnowledgeRetryCommandDTO.expectedRevision"
  ],
  "KnowledgeUploadCommandDTO": [
    "yaoguang.field.KnowledgeUploadCommandDTO.content",
    "yaoguang.field.KnowledgeUploadCommandDTO.documentId",
    "yaoguang.field.KnowledgeUploadCommandDTO.expectedRevision",
    "yaoguang.field.KnowledgeUploadCommandDTO.fileName",
    "yaoguang.field.KnowledgeUploadCommandDTO.mediaType"
  ],
  "WikiDraftWriteCommandDTO": [
    "yaoguang.field.WikiDraftWriteCommandDTO.expectedRevision",
    "yaoguang.field.WikiDraftWriteCommandDTO.links",
    "yaoguang.field.WikiDraftWriteCommandDTO.markdown",
    "yaoguang.field.WikiDraftWriteCommandDTO.sources",
    "yaoguang.field.WikiDraftWriteCommandDTO.tags",
    "yaoguang.field.WikiDraftWriteCommandDTO.title"
  ],
  "WikiGenerationCommandDTO": [
    "yaoguang.field.WikiGenerationCommandDTO.expectedRevision",
    "yaoguang.field.WikiGenerationCommandDTO.pageId",
    "yaoguang.field.WikiGenerationCommandDTO.sourceRevisionIds"
  ],
  "WikiPublicationCommandDTO": [
    "yaoguang.field.WikiPublicationCommandDTO.draftRevisionId",
    "yaoguang.field.WikiPublicationCommandDTO.expectedRevision"
  ],
  "WikiSourceWriteDTO": [
    "yaoguang.field.WikiSourceWriteDTO.chunkId",
    "yaoguang.field.WikiSourceWriteDTO.documentRevisionId",
    "yaoguang.field.WikiSourceWriteDTO.sourceHash"
  ]
} as const
