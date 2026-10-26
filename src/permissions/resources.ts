import {defineResources, defineMessages} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'

export const resources = defineResources([
  {
    "key": "yaoguang.app.console",
    "type": "APP",
    "target": {
      "applicationCode": "yaoguang"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "yuheng:knowledge:read"
      ]
    },
    "i18n": {
      "pageCode": "yaoguang.web.permissions",
      "labelKey": "yaoguang.app.console"
    }
  },
  {
    "key": "yaoguang.page.login",
    "type": "PAGE",
    "target": {
      "route": "/login"
    },
    "access": "PUBLIC",
    "i18n": {
      "pageCode": "yaoguang.web.permissions",
      "labelKey": "yaoguang.page.login"
    }
  },
  {
    "key": "yaoguang.button.KnowledgeBasePage.canWrite",
    "type": "BUTTON",
    "target": {
      "component": "src/features/knowledge/KnowledgeBasePage.tsx",
      "action": "canWrite"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "yuheng:knowledge:write"
      ]
    },
    "i18n": {
      "pageCode": "yaoguang.web.permissions",
      "labelKey": "yaoguang.button.KnowledgeBasePage.canWrite"
    }
  },
  {
    "key": "yaoguang.button.KnowledgeBasePage.canAdmin",
    "type": "BUTTON",
    "target": {
      "component": "src/features/knowledge/KnowledgeBasePage.tsx",
      "action": "canAdmin"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "yuheng:knowledge:admin"
      ]
    },
    "i18n": {
      "pageCode": "yaoguang.web.permissions",
      "labelKey": "yaoguang.button.KnowledgeBasePage.canAdmin"
    }
  },
  {
    "key": "yaoguang.button.KnowledgeBasesPage.canCreate",
    "type": "BUTTON",
    "target": {
      "component": "src/features/knowledge/KnowledgeBasesPage.tsx",
      "action": "canCreate"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "yuheng:knowledge:write"
      ]
    },
    "i18n": {
      "pageCode": "yaoguang.web.permissions",
      "labelKey": "yaoguang.button.KnowledgeBasesPage.canCreate"
    }
  },
  {
    "key": "yaoguang.button.KnowledgeJobsPanel.canRetry",
    "type": "BUTTON",
    "target": {
      "component": "src/features/knowledge/KnowledgeJobsPanel.tsx",
      "action": "canRetry"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "yuheng:knowledge:write"
      ]
    },
    "i18n": {
      "pageCode": "yaoguang.web.permissions",
      "labelKey": "yaoguang.button.KnowledgeJobsPanel.canRetry"
    }
  },
  {
    "key": "yaoguang.button.WikiPage.canWrite",
    "type": "BUTTON",
    "target": {
      "component": "src/features/wiki/WikiPage.tsx",
      "action": "canWrite"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "yuheng:knowledge:write"
      ]
    },
    "i18n": {
      "pageCode": "yaoguang.web.permissions",
      "labelKey": "yaoguang.button.WikiPage.canWrite"
    }
  },
  {
    "key": "yaoguang.menu.knowledge",
    "type": "MENU",
    "target": {
      "route": "/knowledge"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "yuheng:knowledge:read"
      ]
    },
    "i18n": {
      "pageCode": "yaoguang.web.permissions",
      "labelKey": "yaoguang.menu.knowledge"
    }
  },
  {
    "key": "yaoguang.page.knowledge",
    "type": "PAGE",
    "target": {
      "route": "/knowledge"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "yuheng:knowledge:read"
      ]
    },
    "i18n": {
      "pageCode": "yaoguang.web.permissions",
      "labelKey": "yaoguang.page.knowledge"
    }
  },
  {
    "key": "yaoguang.page.knowledge.kbId",
    "type": "PAGE",
    "target": {
      "route": "/knowledge/:kbId"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "yuheng:knowledge:read"
      ]
    },
    "i18n": {
      "pageCode": "yaoguang.web.permissions",
      "labelKey": "yaoguang.page.knowledge.kbId"
    }
  },
  {
    "key": "yaoguang.page.knowledge.kbId.wiki.pageId",
    "type": "PAGE",
    "target": {
      "route": "/knowledge/:kbId/wiki/:pageId"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "yuheng:knowledge:read"
      ]
    },
    "i18n": {
      "pageCode": "yaoguang.web.permissions",
      "labelKey": "yaoguang.page.knowledge.kbId.wiki.pageId"
    }
  },
  {
    "key": "yaoguang.menu.group1",
    "type": "MENU",
    "target": {
      "component": "AdminLayout",
      "group": "1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "yuheng:knowledge:read"
      ]
    },
    "i18n": {
      "pageCode": "yaoguang.web.permissions",
      "labelKey": "yaoguang.menu.group1"
    }
  }
] as const)

export const messages = defineMessages([
  {
    "pageCode": "yaoguang.web.permissions",
    "key": "yaoguang.app.console",
    "defaultLocale": "en-US",
    "defaults": {
      "en-US": "Administration console"
    }
  },
  {
    "pageCode": "yaoguang.web.permissions",
    "key": "yaoguang.page.login",
    "defaultLocale": "en-US",
    "defaults": {
      "en-US": "Sign in"
    }
  },
  {
    "pageCode": "yaoguang.web.permissions",
    "key": "yaoguang.button.KnowledgeBasePage.canWrite",
    "defaultLocale": "en-US",
    "defaults": {
      "en-US": "canWrite"
    }
  },
  {
    "pageCode": "yaoguang.web.permissions",
    "key": "yaoguang.button.KnowledgeBasePage.canAdmin",
    "defaultLocale": "en-US",
    "defaults": {
      "en-US": "canAdmin"
    }
  },
  {
    "pageCode": "yaoguang.web.permissions",
    "key": "yaoguang.button.KnowledgeBasesPage.canCreate",
    "defaultLocale": "en-US",
    "defaults": {
      "en-US": "canCreate"
    }
  },
  {
    "pageCode": "yaoguang.web.permissions",
    "key": "yaoguang.button.KnowledgeJobsPanel.canRetry",
    "defaultLocale": "en-US",
    "defaults": {
      "en-US": "canRetry"
    }
  },
  {
    "pageCode": "yaoguang.web.permissions",
    "key": "yaoguang.button.WikiPage.canWrite",
    "defaultLocale": "en-US",
    "defaults": {
      "en-US": "canWrite"
    }
  },
  {
    "pageCode": "yaoguang.web.permissions",
    "key": "yaoguang.menu.knowledge",
    "defaultLocale": "en-US",
    "defaults": {
      "en-US": "knowledge"
    }
  },
  {
    "pageCode": "yaoguang.web.permissions",
    "key": "yaoguang.page.knowledge",
    "defaultLocale": "en-US",
    "defaults": {
      "en-US": "KnowledgeBasesPage"
    }
  },
  {
    "pageCode": "yaoguang.web.permissions",
    "key": "yaoguang.page.knowledge.kbId",
    "defaultLocale": "en-US",
    "defaults": {
      "en-US": "KnowledgeBasePage"
    }
  },
  {
    "pageCode": "yaoguang.web.permissions",
    "key": "yaoguang.page.knowledge.kbId.wiki.pageId",
    "defaultLocale": "en-US",
    "defaults": {
      "en-US": "WikiPage"
    }
  },
  {
    "pageCode": "yaoguang.web.permissions",
    "key": "yaoguang.menu.group1",
    "defaultLocale": "en-US",
    "defaults": {
      "en-US": "Navigation group 1"
    }
  }
] as const)
