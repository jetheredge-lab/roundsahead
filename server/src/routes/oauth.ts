import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { readFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { issueSession, signToken } from '../auth.js';
import { findOrCreateUser } from '../oauthUsers.js';
import { publicUser } from '../publicUser.js';
import { log } from '../log.js';
import {
  verifyGoogleIdToken,
  verifyAppleIdentityToken,
  googleNativeAudiences,
  appleNativeAudiences,
  OAuthVerifyError,
} from '../oauthVerify.js';

// ── Configuration (from env) ────────────────────────────────────────
const APP_BASE_URL = (process.env.APP_BASE_URL ?? '').replace(/\/$/, '');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';

const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID ?? '';
const APPLE_SERVICES_ID = process.env.APPLE_SERVICES_ID ?? '';
const APPLE_KEY_ID = process.env.APPLE_KEY_ID ?? '';
const APPLE_PRIVATE_KEY_PATH = process.env.APPLE_PRIVATE_KEY_PATH ?? '';

const googleEnabled = Boolean(APP_BASE_URL && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
const appleEnabled = Boolean(
  APP_BASE_URL && APPLE_TEAM_ID && APPLE_SERVICES_ID && APPLE_KEY_ID && APPLE_PRIVATE_KEY_PATH && existsSync(APPLE_PRIVATE_KEY_PATH),
);

log.info('oauth config', { google: googleEnabled, apple: appleEnabled });

const STATE_COOKIE = 'ra_oauth_state';

// The state cookie must survive Apple's cross-site form_post callback, so it is
// SameSite=None; Secure (requires HTTPS — which production is).
function setStateCookie(res: import('express').Response, value: string) {
  res.cookie(STATE_COOKIE, value, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 10 * 60 * 1000,
    path: '/',
  });
}

function decodeJwtPayload(token: string): Record<string, any> {
  const parts = token.split('.');
  if (parts.length < 2) return {};
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
}

let cachedAppleKey: string | null = null;
function appleClientSecret(): string {
  if (!cachedAppleKey) cachedAppleKey = readFileSync(APPLE_PRIVATE_KEY_PATH, 'utf8');
  return jwt.sign({}, cachedAppleKey, {
    algorithm: 'ES256',
    keyid: APPLE_KEY_ID,
    issuer: APPLE_TEAM_ID,
    subject: APPLE_SERVICES_ID,
    audience: 'https://appleid.apple.com',
    expiresIn: '5m',
  });
}

const appRedirect = (path = '/app/') => `${APP_BASE_URL || ''}${path}`;

export const oauthRouter = Router();

// Which providers the client should offer buttons for. `google`/`apple` are the
// web (authorization-code) flows; `*Native` are the on-device identity-token
// flows the mobile app uses.
oauthRouter.get('/providers', (_req, res) => {
  res.json({
    google: googleEnabled,
    apple: appleEnabled,
    googleNative: googleNativeAudiences().length > 0,
    appleNative: appleNativeAudiences().length > 0,
  });
});

// ── Native token exchange (mobile) ──────────────────────────────────
// The device performs the provider sign-in itself and posts us the resulting
// identity token. We verify it (signature + issuer + audience) and mint our own
// session token. No cookie — native clients authenticate with the Bearer token.
//
// These are credential-equivalent endpoints, so they get their own throttle
// (the web redirect routes above deliberately are not rate-limited).
const nativeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

oauthRouter.post('/google/native', nativeLimiter, async (req, res) => {
  const idToken = (req.body as { idToken?: string })?.idToken;
  try {
    const identity = await verifyGoogleIdToken(String(idToken ?? ''));
    const user = await findOrCreateUser('google', identity.sub, identity.email);
    res.json({ user: publicUser(user), token: signToken(user.id) });
  } catch (e) {
    if (e instanceof OAuthVerifyError) {
      res.status(401).json({ error: e.message });
      return;
    }
    log.error('oauth google native exchange failed', { error: String((e as Error)?.message ?? e) });
    res.status(500).json({ error: 'Sign-in failed' });
  }
});

oauthRouter.post('/apple/native', nativeLimiter, async (req, res) => {
  const identityToken = (req.body as { identityToken?: string })?.identityToken;
  try {
    const identity = await verifyAppleIdentityToken(String(identityToken ?? ''));
    const user = await findOrCreateUser('apple', identity.sub, identity.email);
    res.json({ user: publicUser(user), token: signToken(user.id) });
  } catch (e) {
    if (e instanceof OAuthVerifyError) {
      res.status(401).json({ error: e.message });
      return;
    }
    log.error('oauth apple native exchange failed', { error: String((e as Error)?.message ?? e) });
    res.status(500).json({ error: 'Sign-in failed' });
  }
});

// ── Google (OIDC authorization code) ────────────────────────────────
oauthRouter.get('/google', (_req, res) => {
  if (!googleEnabled) {
    res.status(404).json({ error: 'Google sign-in not configured' });
    return;
  }
  const state = randomBytes(16).toString('hex');
  setStateCookie(res, state);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${APP_BASE_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

oauthRouter.get('/google/callback', async (req, res) => {
  try {
    if (!req.query.code || req.query.state !== req.cookies?.[STATE_COOKIE]) {
      res.redirect(appRedirect('/app/?auth_error=google'));
      return;
    }
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(req.query.code),
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${APP_BASE_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokenJson = (await tokenRes.json()) as { id_token?: string };
    if (!tokenJson.id_token) {
      res.redirect(appRedirect('/app/?auth_error=google'));
      return;
    }
    const claims = decodeJwtPayload(tokenJson.id_token);
    const email = claims.email as string | undefined;
    const sub = claims.sub as string | undefined;
    if (!email || !sub) {
      res.redirect(appRedirect('/app/?auth_error=google'));
      return;
    }
    const user = await findOrCreateUser('google', sub, email.toLowerCase());
    res.clearCookie(STATE_COOKIE, { path: '/' });
    issueSession(res, user.id);
    res.redirect(appRedirect('/app/'));
  } catch (e) {
    log.error('oauth google callback failed', { error: String((e as Error)?.message ?? e) });
    res.redirect(appRedirect('/app/?auth_error=google'));
  }
});

// ── Apple (Sign in with Apple, form_post) ───────────────────────────
oauthRouter.get('/apple', (_req, res) => {
  if (!appleEnabled) {
    res.status(404).json({ error: 'Apple sign-in not configured' });
    return;
  }
  const state = randomBytes(16).toString('hex');
  setStateCookie(res, state);
  const params = new URLSearchParams({
    client_id: APPLE_SERVICES_ID,
    redirect_uri: `${APP_BASE_URL}/api/auth/apple/callback`,
    response_type: 'code',
    scope: 'name email',
    state,
    response_mode: 'form_post',
  });
  res.redirect(`https://appleid.apple.com/auth/authorize?${params.toString()}`);
});

oauthRouter.post('/apple/callback', async (req, res) => {
  try {
    const body = req.body as { code?: string; state?: string; id_token?: string };
    if (!body.code || body.state !== req.cookies?.[STATE_COOKIE]) {
      res.redirect(appRedirect('/app/?auth_error=apple'));
      return;
    }
    const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: APPLE_SERVICES_ID,
        client_secret: appleClientSecret(),
        code: body.code,
        grant_type: 'authorization_code',
        redirect_uri: `${APP_BASE_URL}/api/auth/apple/callback`,
      }),
    });
    const tokenJson = (await tokenRes.json()) as { id_token?: string };
    const idToken = tokenJson.id_token ?? body.id_token;
    if (!idToken) {
      res.redirect(appRedirect('/app/?auth_error=apple'));
      return;
    }
    const claims = decodeJwtPayload(idToken);
    const email = claims.email as string | undefined;
    const sub = claims.sub as string | undefined;
    if (!email || !sub) {
      res.redirect(appRedirect('/app/?auth_error=apple'));
      return;
    }
    const user = await findOrCreateUser('apple', sub, email.toLowerCase());
    res.clearCookie(STATE_COOKIE, { path: '/' });
    issueSession(res, user.id);
    res.redirect(appRedirect('/app/'));
  } catch (e) {
    log.error('oauth apple callback failed', { error: String((e as Error)?.message ?? e) });
    res.redirect(appRedirect('/app/?auth_error=apple'));
  }
});
