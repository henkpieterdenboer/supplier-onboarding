import { Status } from '@/types'
import type { RelationType } from '@/types'

// Workflow steps per relation type
// Currently identical, but designed to diverge (e.g. AWAITING_SUSTAINABILITY for suppliers)
export function getWorkflowSteps(relationType: RelationType): string[] {
  if (relationType === 'CUSTOMER') {
    return [
      Status.INVITATION_SENT,
      Status.AWAITING_PURCHASER, // "AWAITING_SALES" logically, but reuse same status
      Status.AWAITING_ERP,
      Status.AWAITING_FINANCE,
      Status.COMPLETED,
    ]
  }
  // SUPPLIER (default)
  return [
    Status.INVITATION_SENT,
    Status.AWAITING_PURCHASER,
    Status.AWAITING_ERP,
    Status.AWAITING_FINANCE,
    Status.COMPLETED,
  ]
}

// Get the next status in the workflow after the given status
export function getNextStatus(relationType: RelationType, currentStatus: string): string | null {
  const steps = getWorkflowSteps(relationType)
  const currentIndex = steps.indexOf(currentStatus)
  if (currentIndex === -1 || currentIndex >= steps.length - 1) return null
  return steps[currentIndex + 1]
}

// Get the role responsible for reviewing at a given status
export function getReviewerRole(relationType: RelationType, status: string): string | null {
  if (status === Status.AWAITING_PURCHASER) {
    return relationType === 'CUSTOMER' ? 'VERKOPER' : 'INKOPER'
  }
  if (status === Status.AWAITING_ERP) return 'ERP'
  if (status === Status.AWAITING_FINANCE) return 'FINANCE'
  return null
}

// Get the role that can create requests for this relation type
export function getCreatorRole(relationType: RelationType): string {
  return relationType === 'CUSTOMER' ? 'VERKOPER' : 'INKOPER'
}
