# yaoguang-web

[English](README.md) | [中文](README.zh-CN.md)

React knowledge-base and Wiki workspace for Stellar Enclosure's Yaoguang platform. All first-party modules start at **0.0.1**.

## Pages and capabilities

| Route | Function |
|---|---|
| `/knowledge` | Browse/create knowledge bases and open workspaces visible to the current user. |
| `/knowledge/:kbId` | Configure a knowledge base and members, upload/manage document revisions, inspect/retry jobs, request reindexing and ask questions with cited evidence. |
| `/knowledge/:kbId/wiki/:pageId` | Read/edit Wiki pages, inspect revisions and evidence/relationships, publish and unpublish according to capabilities. |

Page entry points are in [src/app/App.tsx](src/app/App.tsx), [knowledge features](src/features/knowledge/) and [Wiki features](src/features/wiki/). [Knowledge](src/api/knowledge.ts) and [Wiki](src/api/wiki.ts) clients retain the existing `/api/v1/yuheng/admin` API prefix while calling [yaoguang-service](https://github.com/Stellar-Enclosure/yaoguang-service).

The workspace uses Edge registration `edge-yaoguang`, `/api/v1/yaoguang/auth/bootstrap` and existing `yuheng:knowledge:*` capabilities. Access is checked both by capability and knowledge-base membership. The browser holds the BFF session rather than OAuth tokens. Yuheng gateway/MCP/LLM administration is owned by [yuheng-web](https://github.com/Stellar-Enclosure/yuheng-web); this repository currently implements the knowledge/Wiki portion of Yaoguang's broader roadmap.

## Build and test

Requires Node 24 and npm 11. After the SDKs are published:

```bash
npm ci
npm run build
npm test -- --run
```

For the initial release before npm publication, clone `web-sdk` next to this repository:

```bash
node ../web-sdk/scripts/verify-consumers.mjs \
  --workspace "$(cd .. && pwd)" \
  --cache "$HOME/.npm" \
  --output "$(cd ../web-sdk && pwd)/dist/npm-release" \
  --consumer yaoguang-web --phase verify --online true
```

The verifier uses actual pack checksums and official registry addresses in the committed lock, then validates offline installation. It never publishes packages.

## Knowledge workspace

Owns `/knowledge`, `/knowledge/:kbId`, and `/knowledge/:kbId/wiki/:pageId`. Authentication stays bound to `edge-yaoguang`; existing `yuheng:knowledge:*` capabilities and API paths remain. Vite development port is 18145; no server starts automatically.

## Application delivery (no package publication)

This repository is a frontend application, not a library. Its `package.json` remains `private: true`; do not publish it to npm or Maven Central. Publish only the reusable packages owned by [web-sdk](https://github.com/Stellar-Enclosure/web-sdk#publish-to-npmjs).

```bash
npm ci
npm test
npm run build
```

Deploy the resulting `dist/` directory as static application assets. Before the first SDK publication, use the Build section's local consumer verification instead of `npm ci` against the public registry. These commands do not start a server.

## Compatibility and publication

Java packages/classes, Bean names, configuration keys, OAuth/RPC identities, APIs, and database ownership are retained. Existing SQL and DDL history are copied byte for byte. Artifact/build versions and necessary build paths change. A successful build does not imply application startup or live infrastructure acceptance.

Git pushes run validation only. Central and npm publication are separate user actions. CI defaults to initial source bootstrap; after publication set `STELLAR_USE_SOURCE_BOOTSTRAP=false` to consume published artifacts directly. Private organizations may supply the Actions secret `STELLAR_ENCLOSURE_READ_TOKEN` with repository read access.

Original MIT/LGPL licenses and author attribution are preserved.
