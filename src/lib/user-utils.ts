export function formatUserName(user: { firstName: string; middleName?: string | null; lastName: string }): string {
  return [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')
}
