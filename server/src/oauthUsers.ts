import { prisma } from './prisma.js';

// Resolve the local user for a verified provider identity, used by both the web
// (authorization-code) and native (identity-token) OAuth flows.
//
// Match priority:
//   1. existing link on the provider's stable subject id (googleId/appleId)
//   2. existing account with the same email — link the provider to it
//   3. otherwise create a new account, pre-verified (the provider vouched)
export async function findOrCreateUser(
  provider: 'google' | 'apple',
  providerId: string,
  email: string,
) {
  const idField = provider === 'google' ? 'googleId' : 'appleId';

  const byProvider = await prisma.user.findFirst({ where: { [idField]: providerId } });
  if (byProvider) return byProvider;

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { [idField]: providerId, emailVerified: true },
    });
  }

  return prisma.user.create({ data: { email, emailVerified: true, [idField]: providerId } });
}
