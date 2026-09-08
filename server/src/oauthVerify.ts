// Verifies OAuth *identity tokens* presented directly by native clients.
//
// This is the security boundary for native sign-in. Unlike the web flow — where
// the server exchanges an authorization code for the id_token over TLS using the
// client secret, and can therefore trust it — a native client hands us the token
// it received on-device. So we MUST verify its signature against the provider's
// published JWKS, and pin the issuer and audience, or anyone could forge a login.
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export class OAuthVerifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthVerifyError';
  }
}

export interface VerifiedIdentity {
  provider: 'google' | 'apple';
  sub: string;
  email: string;
}

// Google issues the same subject under two issuer spellings.
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

// Remote key sets are created once; jose caches and refreshes them internally.
const googleRemoteKeySet = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
const appleRemoteKeySet = createRemoteJWKSet(new URL(APPLE_JWKS_URL));

// Parse a comma-separated env list of allowed client IDs (audiences).
export function parseClientIds(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function googleNativeAudiences(): string[] {
  return parseClientIds(process.env.GOOGLE_NATIVE_CLIENT_IDS);
}

export function appleNativeAudiences(): string[] {
  // Defaults to the app's bundle id — the audience of an Apple identity token
  // minted for the native app (as opposed to APPLE_SERVICES_ID used by the web).
  const configured = parseClientIds(process.env.APPLE_NATIVE_CLIENT_IDS);
  return configured.length > 0 ? configured : ['com.roundsahead.app'];
}

interface VerifyOptions {
  // Injectable key set for tests; defaults to the provider's remote JWKS.
  keySet?: JWTVerifyGetKey;
  // Allowed audiences; defaults to the env-configured client IDs.
  audiences?: string[];
}

// The `email_verified` claim arrives as a boolean or the string "true"
// depending on the provider/serialization; treat both as verified.
function isEmailVerified(claim: unknown): boolean {
  return claim === true || claim === 'true';
}

async function verify(
  provider: 'google' | 'apple',
  token: string,
  issuer: string | string[],
  keySet: JWTVerifyGetKey,
  audiences: string[],
  requireVerifiedEmail: boolean,
): Promise<VerifiedIdentity> {
  if (audiences.length === 0) {
    throw new OAuthVerifyError(`${provider} native sign-in is not configured`);
  }
  if (!token) {
    throw new OAuthVerifyError('Missing identity token');
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(token, keySet, { issuer, audience: audiences }));
  } catch (e) {
    throw new OAuthVerifyError(
      `Invalid ${provider} identity token: ${e instanceof Error ? e.message : 'verification failed'}`,
    );
  }

  const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : undefined;
  if (!sub || !email) {
    throw new OAuthVerifyError(`${provider} identity token is missing sub or email`);
  }

  // An unverified email must not be trusted for account linking — someone could
  // claim an address they don't control and take over an existing account.
  if (requireVerifiedEmail && !isEmailVerified(payload.email_verified)) {
    throw new OAuthVerifyError(`${provider} email is not verified`);
  }

  return { provider, sub, email };
}

export function verifyGoogleIdToken(
  idToken: string,
  opts: VerifyOptions = {},
): Promise<VerifiedIdentity> {
  return verify(
    'google',
    idToken,
    GOOGLE_ISSUERS,
    opts.keySet ?? googleRemoteKeySet,
    opts.audiences ?? googleNativeAudiences(),
    true, // Google reports email_verified; require it before trusting the email.
  );
}

export function verifyAppleIdentityToken(
  identityToken: string,
  opts: VerifyOptions = {},
): Promise<VerifiedIdentity> {
  return verify(
    'apple',
    identityToken,
    APPLE_ISSUER,
    opts.keySet ?? appleRemoteKeySet,
    opts.audiences ?? appleNativeAudiences(),
    // Apple only issues tokens for verified emails; there is no reliable
    // email_verified claim to gate on, so don't require it here.
    false,
  );
}
