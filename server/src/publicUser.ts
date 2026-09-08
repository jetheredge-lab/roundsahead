import { entitlementActive } from './entitlement.js';

// The user shape returned to clients. Never includes the password hash or any
// provider linkage — just identity and entitlement state.
export function publicUser(u: {
  id: string;
  email: string;
  emailVerified: boolean;
  plan: string;
  entitlementExpiresAt: Date | null;
}) {
  return {
    id: u.id,
    email: u.email,
    emailVerified: u.emailVerified,
    plan: u.plan,
    entitlementExpiresAt: u.entitlementExpiresAt,
    active: entitlementActive(u),
  };
}
