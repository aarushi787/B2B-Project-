// Account roles. A "buyer" or "seller" is a role a company plays in a single deal (deals.buyerId /
// sellerIds), NOT a type of account. The only account-level distinction is platform admin vs user.
//
// The users.role DB enum still contains the legacy values ('buyer','seller','admin'); non-admin accounts
// are stored as 'buyer' (the column default, now just a neutral placeholder) so no schema migration is needed.
export type AccountRole = 'user' | 'admin';

export function normalizeAccountRole(dbRole?: string | null): AccountRole {
  return String(dbRole ?? '').toLowerCase() === 'admin' ? 'admin' : 'user';
}

export function toDbRole(role?: string | null): 'admin' | 'buyer' {
  return normalizeAccountRole(role) === 'admin' ? 'admin' : 'buyer';
}
