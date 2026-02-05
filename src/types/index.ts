// Role enum
export const Role = {
  INKOPER: 'INKOPER',
  FINANCE: 'FINANCE',
  ERP: 'ERP',
} as const
export type Role = (typeof Role)[keyof typeof Role]

// Status enum
export const Status = {
  INVITATION_SENT: 'INVITATION_SENT',       // Wachten op leverancier
  AWAITING_PURCHASER: 'AWAITING_PURCHASER', // Wachten op inkoper
  AWAITING_FINANCE: 'AWAITING_FINANCE',     // Wachten op finance
  AWAITING_ERP: 'AWAITING_ERP',             // Wachten op ERP
  COMPLETED: 'COMPLETED',                   // Compleet
  CANCELLED: 'CANCELLED',                   // Afgebroken
} as const
export type Status = (typeof Status)[keyof typeof Status]

// Status labels in Dutch
export const StatusLabels: Record<Status, string> = {
  INVITATION_SENT: 'Wachten op leverancier',
  AWAITING_PURCHASER: 'Wachten op inkoper',
  AWAITING_FINANCE: 'Wachten op finance',
  AWAITING_ERP: 'Wachten op ERP',
  COMPLETED: 'Compleet',
  CANCELLED: 'Afgebroken',
}

// Region enum
export const Region = {
  EU: 'EU',
  ROW: 'ROW',
} as const
export type Region = (typeof Region)[keyof typeof Region]

export const RegionLabels: Record<Region, string> = {
  EU: 'EU',
  ROW: 'Rest of World',
}

// Incoterm enum
export const Incoterm = {
  CIF: 'CIF',
  FOB: 'FOB',
} as const
export type Incoterm = (typeof Incoterm)[keyof typeof Incoterm]

// FileType enum
export const FileType = {
  KVK: 'KVK',
  PASSPORT: 'PASSPORT',
  OTHER: 'OTHER',
} as const
export type FileType = (typeof FileType)[keyof typeof FileType]

export const FileTypeLabels: Record<FileType, string> = {
  KVK: 'KvK Uittreksel',
  PASSPORT: 'Paspoort',
  OTHER: 'Overig',
}

// Audit log actions
export const AuditAction = {
  REQUEST_CREATED: 'REQUEST_CREATED',
  INVITATION_SENT: 'INVITATION_SENT',
  INVITATION_RESENT: 'INVITATION_RESENT',
  SUPPLIER_SUBMITTED: 'SUPPLIER_SUBMITTED',
  PURCHASER_SUBMITTED: 'PURCHASER_SUBMITTED',
  FINANCE_SUBMITTED: 'FINANCE_SUBMITTED',
  ERP_SUBMITTED: 'ERP_SUBMITTED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  REQUEST_CANCELLED: 'REQUEST_CANCELLED',
  REQUEST_REOPENED: 'REQUEST_REOPENED',
  FILE_UPLOADED: 'FILE_UPLOADED',
  FILE_DELETED: 'FILE_DELETED',
  REMINDER_SENT: 'REMINDER_SENT',
} as const
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction]

// Role labels
export const RoleLabels: Record<Role, string> = {
  INKOPER: 'Inkoper',
  FINANCE: 'Finance',
  ERP: 'ERP',
}
