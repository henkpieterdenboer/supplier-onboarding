// SupplierType enum
export const SupplierType = {
  KOOP: 'KOOP',
  X_KWEKER: 'X_KWEKER',
  O_KWEKER: 'O_KWEKER',
} as const
export type SupplierType = (typeof SupplierType)[keyof typeof SupplierType]

export const SupplierTypeLabels: Record<SupplierType, string> = {
  KOOP: 'Koop',
  X_KWEKER: 'X-kweker',
  O_KWEKER: 'O-kweker',
}

// Role enum
export const Role = {
  ADMIN: 'ADMIN',
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
  BANK_DETAILS: 'BANK_DETAILS',
  OTHER: 'OTHER',
} as const
export type FileType = (typeof FileType)[keyof typeof FileType]

export const FileTypeLabels: Record<FileType, string> = {
  KVK: 'KvK Uittreksel',
  PASSPORT: 'Paspoort',
  BANK_DETAILS: 'Screenshot bankgegevens',
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
  SUPPLIER_SAVED: 'SUPPLIER_SAVED',
  SUPPLIER_TYPE_CHANGED: 'SUPPLIER_TYPE_CHANGED',
} as const
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction]

// Role labels
export const RoleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  INKOPER: 'Inkoper',
  FINANCE: 'Finance',
  ERP: 'ERP',
}

// Label enum (merken/brands)
export const Label = {
  COLORIGINZ: 'COLORIGINZ',
  PFC: 'PFC',
} as const
export type Label = (typeof Label)[keyof typeof Label]

export const LabelLabels: Record<Label, string> = {
  COLORIGINZ: 'Coloriginz',
  PFC: 'Parfum Flower Company',
}
