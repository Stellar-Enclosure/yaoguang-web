import {definePermissionReferences} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'

export const permissions = definePermissionReferences([
  "yuheng:knowledge:admin",
  "yuheng:knowledge:read",
  "yuheng:knowledge:write"
] as const)
