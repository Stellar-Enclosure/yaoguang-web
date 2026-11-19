import type {PublicOAuthIdentity} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {snapshotContext, type PermissionSnapshot} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import type {WorkspaceResource} from '../auth/workspaceResource'
export const identityFixture = (resource: WorkspaceResource = 'yaoguang'): PublicOAuthIdentity => ({
  issuer: 'https://identity.example/tenants/1', tenantId: '1', subject: 'user-a',
  clientId: resource + '-1', accessExpiresAt: Date.now() + 60_000, resource: 'https://resource.example/' + resource,
})
export const snapshotFixture = (resource: WorkspaceResource = 'yaoguang', permissionCodes: string[] = ['yuheng:knowledge:read']): PermissionSnapshot => ({
  issuer: identityFixture(resource).issuer, subject: 'user-a', catalogScope: {catalogScopeId: '1', tenantId: '1',
    businessCode: 'xingyuan', applicationCode: resource, namespaceCode: 'default', environment: 'dev'},
  catalogVersion: '1', authVersion: '1', policyVersion: '1', activeRoleContext: {applicationCode: resource, rootRoleIds: ['1'], effectiveRoleIds: ['1']},
  permissionCodes, snapshotExpiresAt: new Date(Date.now() + 60_000).toISOString(),
})
export const authorizationFixture = (resource: WorkspaceResource = 'yaoguang', permissionCodes?: string[]) => {
  const snapshot = snapshotFixture(resource, permissionCodes)
  return {identity: identityFixture(resource), snapshot, binding: snapshotContext(snapshot, 0), user: {id: 'user-a', tenantId: '1', identitySub: 'user-a'}}
}
