# Yaoguang 知识库与 Wiki 工作区

[English](README.md) | [Yaoguang 服务端](https://github.com/Stellar-Enclosure/yaoguang-service)

Yaoguang Web 是独立的 React 知识工作区，由 `yaoguang-service` 提供知识库、文档、检索问答和 Wiki API。玉衡的网关分组、接口目录、MCP 与 LLM 配置由独立 [yuheng-web](https://github.com/Stellar-Enclosure/yuheng-web) 维护。

## 功能页面

| 路由 | 当前功能 |
|---|---|
| `/knowledge` | 查询/创建当前用户可见的知识库 |
| `/knowledge/:kbId` | 知识库模型与出站策略配置、成员维护、文档上传/版本/重建、任务状态/重试、带引用的检索问答 |
| `/knowledge/:kbId/wiki/:pageId` | Wiki 阅读、草稿编辑、修订/证据与关联图、发布和下线 |

路由以 [src/app/App.tsx](src/app/App.tsx) 为准。业务页面位于 [knowledge](src/features/knowledge/) 与 [wiki](src/features/wiki/)，类型化客户端位于 [knowledge.ts](src/api/knowledge.ts) 与 [wiki.ts](src/api/wiki.ts)。问答支持 `VECTOR`、`KEYWORD`、`HYBRID` 检索和 `DOCUMENTS`、`WIKI`、`BOTH` 取证范围；知识库成员角色为 `READER`、`EDITOR`、`OWNER`。

## 认证与 API 边界

控制台通过共享 SDK 的 `createGatewayAuthClient` 使用 Edge BFF 会话。默认 OIDC registration 是 `edge-yaoguang`，由 `VITE_YAOGUANG_OAUTH_REGISTRATION_ID` 覆盖。Edge 在服务端保管 OAuth Token，浏览器使用 HttpOnly Cookie 和受 CSRF 保护的退出接口，不保存 AT/RT。

授权上下文来自 `GET /api/v1/yaoguang/auth/bootstrap`。页面要求 `yuheng:knowledge:read`；写入、发布、下线等操作继续受服务端 capability 与知识库成员权限约束。业务 API 仍使用 `/api/v1/yuheng/admin` 前缀与 `yuheng:knowledge:*` 权限名，这是拆仓后保留的兼容合同；不表示浏览器应调用 Yuheng Admin。

## 开发与验证

Node 24/npm 11、SDK 依赖初始化与打包说明见 [仓库构建入口](README.md#build-and-test)。依赖可用后执行：

```bash
npm run typecheck
npm test -- --run
npm run lint
npm run build
```

操作者显式执行 `npm run dev` 时，Vite 绑定 `127.0.0.1:18145`，启用 `strictPort`。`/oauth2`、`/bff`、`/login/oauth2` 代理由 `YUHENG_AUTH_PROXY` 指定，`/api` 由 `YUHENG_ADMIN_PROXY` 指定；默认均为 `http://127.0.0.1:18180`，应接入能正确路由到 Yaoguang 的 Edge 入口。

`npm run e2e` 是单独的浏览器验证入口，可能启动预览/开发服务；普通构建和单元测试不执行它。Mock API 或隔离组件测试不证明真实 OAuth、文档索引、模型调用或数据库可用。

## 部署与配置

通过 `VITE_BASE_PATH` 可以独立部署或挂载到 Portal 的 `/apps/yaoguang/`。Portal 业务入口是 `/xingyuan/yaoguang/knowledge`；构建产物为 `dist/`。

当前实现保留以下 `YUHENG_*` 配置名，部署时仍应使用这些名称：

| 配置 | 用途 |
|---|---|
| `VITE_YUHENG_ORIGIN` | 构建时 API/BFF Origin，留空使用当前 Origin |
| `VITE_YAOGUANG_OAUTH_REGISTRATION_ID` | 知识工作区登录 registration，默认 `edge-yaoguang` |
| `YUHENG_AUTH_PROXY`、`YUHENG_ADMIN_PROXY` | Vite 开发代理的认证与 API 上游 |
| `YUHENG_ADMIN_API_BASE_URL` | `static-server.mjs` 的 `/api` 上游；源码默认 `http://yuheng-admin:18080`，Yaoguang 部署必须显式配置到合适的 API 入口 |
| `YUHENG_ADMIN_API_DEVELOPMENT_PLAINTEXT` | 使用 HTTP 上游时必须显式为 `true` |
| `YUHENG_ADMIN_API_TLS_CA_PATH`、`YUHENG_ADMIN_API_TLS_CERTIFICATE_PATH`、`YUHENG_ADMIN_API_TLS_PRIVATE_KEY_PATH` | HTTPS 上游的 CA 与客户端证书/私钥文件 |
| `PORT` | static-server 端口，默认 `8080` |

static-server 只提供静态站点、`/healthz` 与 `/api` 反向代理。生产入口还需由部署环境正确转发 OIDC/BFF 路径并保持 Cookie、Origin 和 Resource 绑定。不要把凭据提交到 `.env` 文件。

## 独立仓库发布

[交付说明](README.md#application-delivery-no-package-publication)保留完整的初始化、校验与构建入口。本仓库是 `private: true` 的前端应用，不发布到 npm 或 Maven Central；SDK 发布由 web-sdk 独立负责。
