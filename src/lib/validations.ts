import { z } from 'zod'

// --- Shared enums ---

const regionEnum = z.enum(['EU', 'ROW'])
const supplierTypeEnum = z.enum(['KOOP', 'X_KWEKER', 'O_KWEKER'])
const labelEnum = z.enum(['COLORIGINZ', 'PFC', 'FFS'])
const roleEnum = z.enum(['ADMIN', 'COMMERCIE', 'FINANCE', 'ERP'])
const relationTypeEnum = z.enum(['SUPPLIER', 'CUSTOMER'])
const languageEnum = z.enum(['nl', 'en', 'es', 'it'])
const incotermEnum = z.enum(['CIF', 'FOB', 'CONSIGNMENT'])

const passwordSchema = z.string()
  .min(14, 'Password must be at least 14 characters')
  .max(128)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

// --- Requests ---

export const createRequestSchema = z.object({
  supplierName: z.string().min(1, 'Name is required').max(200),
  supplierEmail: z.string().email('Invalid email address'),
  region: regionEnum,
  selfFill: z.boolean().optional().default(false),
  relationType: relationTypeEnum.optional().default('SUPPLIER'),
  supplierType: supplierTypeEnum.optional().default('KOOP'),
  supplierLanguage: languageEnum.optional().default('nl'),
  label: labelEnum.optional(),
})

// Purchaser-submit: only fields the purchaser may edit
export const purchaserSubmitSchema = z.object({
  supplierType: supplierTypeEnum.optional(),
  companyName: z.string().max(200).nullish(),
  address: z.string().max(500).nullish(),
  postalCode: z.string().max(20).nullish(),
  city: z.string().max(100).nullish(),
  country: z.string().max(100).nullish(),
  contactName: z.string().max(200).nullish(),
  contactPhone: z.string().max(50).nullish(),
  contactEmail: z.string().email().nullish().or(z.literal('').transform(() => null)),
  chamberOfCommerceNumber: z.string().max(50).nullish(),
  vatNumber: z.string().max(50).nullish(),
  iban: z.string().max(50).nullish(),
  bankName: z.string().max(100).nullish(),
  glnNumber: z.string().max(50).nullish(),
  invoiceEmail: z.string().email().nullish().or(z.literal('').transform(() => null)),
  invoiceAddress: z.string().max(500).nullish(),
  invoicePostalCode: z.string().max(20).nullish(),
  invoiceCity: z.string().max(100).nullish(),
  invoiceCurrency: z.string().max(10).nullish(),
  directorName: z.string().max(200).nullish(),
  directorFunction: z.string().max(100).nullish(),
  directorDateOfBirth: z.string().max(20).nullish(),
  directorPassportNumber: z.string().max(50).nullish(),
  incoterm: incotermEnum.nullish().or(z.literal('').transform(() => null)),
  commissionPercentage: z.union([
    z.number(),
    z.string().transform((v) => v === '' ? null : parseFloat(v)),
  ]).nullish().pipe(z.number().nullable().optional()),
  paymentTerm: z.string().max(100).nullish(),
  accountManager: z.string().max(200).nullish(),
  auctionNumberRFH: z.string().max(50).nullish(),
  salesSheetEmail: z.string().email().nullish().or(z.literal('').transform(() => null)),
  mandateRFH: z.union([
    z.boolean(),
    z.string().transform((v) => v === 'true' ? true : v === 'false' ? false : null),
  ]).nullish().pipe(z.boolean().nullable().optional()),
  apiKeyFloriday: z.string().max(200).nullish(),
})

export const financeSubmitSchema = z.object({
  creditorNumber: z.string().max(50).nullish(), // Supplier only (required validated in API based on relationType)
  debtorNumber: z.string().max(50).nullish(),   // Customer only (required validated in API based on relationType)
  postingMatrixFilled: z.boolean().nullish(),
  allChecksCompleted: z.boolean().nullish(),
  // Optional supplier data that Finance can edit
  companyName: z.string().max(200).nullish(),
  address: z.string().max(500).nullish(),
  postalCode: z.string().max(20).nullish(),
  city: z.string().max(100).nullish(),
  country: z.string().max(100).nullish(),
  contactName: z.string().max(200).nullish(),
  contactPhone: z.string().max(50).nullish(),
  contactEmail: z.string().email().nullish().or(z.literal('').transform(() => null)),
  chamberOfCommerceNumber: z.string().max(50).nullish(),
  vatNumber: z.string().max(50).nullish(),
  iban: z.string().max(50).nullish(),
  bankName: z.string().max(100).nullish(),
  glnNumber: z.string().max(50).nullish(),
  invoiceEmail: z.string().email().nullish().or(z.literal('').transform(() => null)),
  invoiceAddress: z.string().max(500).nullish(),
  invoicePostalCode: z.string().max(20).nullish(),
  invoiceCity: z.string().max(100).nullish(),
  invoiceCurrency: z.string().max(10).nullish(),
  directorName: z.string().max(200).nullish(),
  directorFunction: z.string().max(100).nullish(),
  directorDateOfBirth: z.string().max(20).nullish(),
  directorPassportNumber: z.string().max(50).nullish(),
  incoterm: incotermEnum.nullish().or(z.literal('').transform(() => null)),
  commissionPercentage: z.union([
    z.number(),
    z.string().transform((v) => v === '' ? null : parseFloat(v)),
  ]).nullish().pipe(z.number().nullable().optional()),
  paymentTerm: z.string().max(100).nullish(),
  accountManager: z.string().max(200).nullish(),
  auctionNumberRFH: z.string().max(50).nullish(),
  salesSheetEmail: z.string().email().nullish().or(z.literal('').transform(() => null)),
  mandateRFH: z.union([
    z.boolean(),
    z.string().transform((v) => v === 'true' ? true : v === 'false' ? false : null),
  ]).nullish().pipe(z.boolean().nullable().optional()),
  apiKeyFloriday: z.string().max(200).nullish(),
})

export const financeSaveSchema = z.object({
  creditorNumber: z.string().max(50).nullish(),
  debtorNumber: z.string().max(50).nullish(),
  postingMatrixFilled: z.boolean().nullish(),
  allChecksCompleted: z.boolean().nullish(),
  companyName: z.string().max(200).nullish(),
  address: z.string().max(500).nullish(),
  postalCode: z.string().max(20).nullish(),
  city: z.string().max(100).nullish(),
  country: z.string().max(100).nullish(),
  contactName: z.string().max(200).nullish(),
  contactPhone: z.string().max(50).nullish(),
  contactEmail: z.string().email().nullish().or(z.literal('').transform(() => null)),
  chamberOfCommerceNumber: z.string().max(50).nullish(),
  vatNumber: z.string().max(50).nullish(),
  iban: z.string().max(50).nullish(),
  bankName: z.string().max(100).nullish(),
  glnNumber: z.string().max(50).nullish(),
  invoiceEmail: z.string().email().nullish().or(z.literal('').transform(() => null)),
  invoiceAddress: z.string().max(500).nullish(),
  invoicePostalCode: z.string().max(20).nullish(),
  invoiceCity: z.string().max(100).nullish(),
  invoiceCurrency: z.string().max(10).nullish(),
  directorName: z.string().max(200).nullish(),
  directorFunction: z.string().max(100).nullish(),
  directorDateOfBirth: z.string().max(20).nullish(),
  directorPassportNumber: z.string().max(50).nullish(),
  incoterm: incotermEnum.nullish().or(z.literal('').transform(() => null)),
  commissionPercentage: z.union([
    z.number(),
    z.string().transform((v) => v === '' ? null : parseFloat(v)),
  ]).nullish().pipe(z.number().nullable().optional()),
  paymentTerm: z.string().max(100).nullish(),
  accountManager: z.string().max(200).nullish(),
  auctionNumberRFH: z.string().max(50).nullish(),
  salesSheetEmail: z.string().email().nullish().or(z.literal('').transform(() => null)),
  mandateRFH: z.union([
    z.boolean(),
    z.string().transform((v) => v === 'true' ? true : v === 'false' ? false : null),
  ]).nullish().pipe(z.boolean().nullable().optional()),
  apiKeyFloriday: z.string().max(200).nullish(),
})

export const erpSubmitSchema = z.object({
  kbtCode: z.string().min(1, 'KBT code is required').max(50),
})

export const changeTypeSchema = z.object({
  supplierType: supplierTypeEnum,
})

export const changeRegionSchema = z.object({
  region: regionEnum,
})

// --- Supplier form ---

export const supplierFormSchema = z.object({
  action: z.enum(['save', 'submit']).optional().default('submit'),
  companyName: z.string().max(200).nullish(),
  address: z.string().max(500).nullish(),
  postalCode: z.string().max(20).nullish(),
  city: z.string().max(100).nullish(),
  country: z.string().max(100).nullish(),
  contactName: z.string().max(200).nullish(),
  contactPhone: z.string().max(50).nullish(),
  contactEmail: z.string().email().nullish().or(z.literal('').transform(() => null)),
  chamberOfCommerceNumber: z.string().max(50).nullish(),
  vatNumber: z.string().max(50).nullish(),
  iban: z.string().max(50).nullish(),
  bankName: z.string().max(100).nullish(),
  glnNumber: z.string().max(50).nullish(),
  invoiceEmail: z.string().email().nullish().or(z.literal('').transform(() => null)),
  invoiceAddress: z.string().max(500).nullish(),
  invoicePostalCode: z.string().max(20).nullish(),
  invoiceCity: z.string().max(100).nullish(),
  invoiceCurrency: z.string().max(10).nullish(),
  directorName: z.string().max(200).nullish(),
  directorFunction: z.string().max(100).nullish(),
  directorDateOfBirth: z.string().max(20).nullish(),
  directorPassportNumber: z.string().max(50).nullish(),
  auctionNumberRFH: z.string().max(50).nullish(),
  salesSheetEmail: z.string().email().nullish().or(z.literal('').transform(() => null)),
  mandateRFH: z.union([
    z.boolean(),
    z.string().transform((v) => v === 'true' ? true : v === 'false' ? false : null),
  ]).nullish().pipe(z.boolean().nullable().optional()),
  apiKeyFloriday: z.string().max(200).nullish(),
})

// --- Admin users ---

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  middleName: z.string().max(50).nullish(),
  lastName: z.string().min(1, 'Last name is required').max(100),
  roles: z.array(roleEnum).min(1, 'At least one role is required'),
  labels: z.array(labelEnum).optional().default(['COLORIGINZ']),
  relationTypes: z.array(relationTypeEnum).optional().default(['SUPPLIER']),
  receiveEmails: z.boolean().optional().default(true),
  preferredLanguage: languageEnum.optional().default('nl'),
})

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  middleName: z.string().max(50).nullish(),
  lastName: z.string().min(1).max(100).optional(),
  roles: z.array(roleEnum).min(1).optional(),
  labels: z.array(labelEnum).optional(),
  relationTypes: z.array(relationTypeEnum).optional(),
  receiveEmails: z.boolean().optional(),
  preferredLanguage: languageEnum.optional(),
})

// --- Profile ---

export const updateProfileSchema = z.object({
  preferredLanguage: languageEnum.optional(),
  receiveEmails: z.boolean().optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
})

// --- Auth ---

export const activateSchema = z.object({
  token: z.string().uuid('Invalid token'),
  password: passwordSchema,
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const resetPasswordSchema = z.object({
  token: z.string().uuid('Invalid token'),
  password: passwordSchema,
})
