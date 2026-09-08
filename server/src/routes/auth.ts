import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import {
  hashPassword,
  verifyPassword,
  issueSession,
  clearSession,
  requireAuth,
  type AuthedRequest,
} from '../auth.js';
import { publicUser } from '../publicUser.js';

export const authRouter = Router();

const credentials = z.object({
  email: z.string().email().max(254).transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

// POST /api/auth/signup
authRouter.post('/signup', async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    return;
  }
  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(password) },
  });
  const token = issueSession(res, user.id);
  res.status(201).json({ user: publicUser(user), token });
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid email or password' });
    return;
  }
  const { email, password } = parsed.data;

  const DUMMY_HASH = '$2a$12$0000000000000000000000000000000000000000000000000000';
  const user = await prisma.user.findUnique({ where: { email } });
  // Always run a comparison to reduce user-enumeration timing signals. Accounts
  // created via Google/Apple have no passwordHash and can't log in with one.
  const ok = user?.passwordHash
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, DUMMY_HASH);
  if (!user || !user.passwordHash || !ok) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = issueSession(res, user.id);
  res.json({ user: publicUser(user), token });
});

// POST /api/auth/logout
authRouter.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) {
    clearSession(res);
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({ user: publicUser(user) });
});

// DELETE /api/auth/account — self-service account deletion (Apple requirement).
// Cascade removes the user's app state.
authRouter.delete('/account', requireAuth, async (req: AuthedRequest, res) => {
  await prisma.user.delete({ where: { id: req.userId! } });
  clearSession(res);
  res.json({ ok: true });
});
