import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateKeyPair,
  exportJWK,
  SignJWT,
  createLocalJWKSet,
  type JWTVerifyGetKey,
  type JWK,
} from 'jose';
import {
  verifyGoogleIdToken,
  verifyAppleIdentityToken,
  OAuthVerifyError,
} from './oauthVerify.js';

// A self-contained JWKS + signer so tests never hit the network. Mirrors how
// Google/Apple publish RS256 keys and how we verify the identity token they mint.
interface Signer {
  keySet: JWTVerifyGetKey;
  sign: (claims: Record<string, unknown>, opts: SignOpts) => Promise<string>;
}

interface SignOpts {
  issuer: string;
  audience: string;
  kid?: string;
  expiresIn?: string; // jose duration, e.g. '1h' or '-1h' for already-expired
}

async function makeSigner(kid = 'test-key'): Promise<Signer> {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = (await exportJWK(publicKey)) as JWK;
  jwk.kid = kid;
  jwk.alg = 'RS256';
  jwk.use = 'sig';
  const keySet = createLocalJWKSet({ keys: [jwk] });

  const sign = (claims: Record<string, unknown>, opts: SignOpts) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: opts.kid ?? kid })
      .setIssuedAt()
      .setIssuer(opts.issuer)
      .setAudience(opts.audience)
      .setExpirationTime(opts.expiresIn ?? '1h')
      .sign(privateKey);

  return { keySet, sign };
}

const GOOGLE_ISS = 'https://accounts.google.com';
const APPLE_ISS = 'https://appleid.apple.com';
const GOOGLE_AUD = '111-ios.apps.googleusercontent.com';
const APPLE_AUD = 'com.roundsahead.app';

let signer: Signer;
beforeAll(async () => {
  signer = await makeSigner();
});

describe('verifyGoogleIdToken', () => {
  it('accepts a properly signed token and returns sub + lowercased email', async () => {
    const token = await signer.sign(
      { sub: 'google-sub-1', email: 'Parent@Example.com', email_verified: true },
      { issuer: GOOGLE_ISS, audience: GOOGLE_AUD },
    );
    const id = await verifyGoogleIdToken(token, {
      keySet: signer.keySet,
      audiences: [GOOGLE_AUD],
    });
    expect(id).toEqual({ provider: 'google', sub: 'google-sub-1', email: 'parent@example.com' });
  });

  it('accepts the bare-domain issuer variant Google also uses', async () => {
    const token = await signer.sign(
      { sub: 's', email: 'a@b.com', email_verified: true },
      { issuer: 'accounts.google.com', audience: GOOGLE_AUD },
    );
    const id = await verifyGoogleIdToken(token, { keySet: signer.keySet, audiences: [GOOGLE_AUD] });
    expect(id.sub).toBe('s');
  });

  it('rejects a token for a different audience', async () => {
    const token = await signer.sign(
      { sub: 's', email: 'a@b.com' },
      { issuer: GOOGLE_ISS, audience: 'someone-elses-client-id' },
    );
    await expect(
      verifyGoogleIdToken(token, { keySet: signer.keySet, audiences: [GOOGLE_AUD] }),
    ).rejects.toBeInstanceOf(OAuthVerifyError);
  });

  it('rejects a token from the wrong issuer', async () => {
    const token = await signer.sign(
      { sub: 's', email: 'a@b.com' },
      { issuer: 'https://evil.example.com', audience: GOOGLE_AUD },
    );
    await expect(
      verifyGoogleIdToken(token, { keySet: signer.keySet, audiences: [GOOGLE_AUD] }),
    ).rejects.toBeInstanceOf(OAuthVerifyError);
  });

  it('rejects an expired token', async () => {
    const token = await signer.sign(
      { sub: 's', email: 'a@b.com' },
      { issuer: GOOGLE_ISS, audience: GOOGLE_AUD, expiresIn: '-1h' },
    );
    await expect(
      verifyGoogleIdToken(token, { keySet: signer.keySet, audiences: [GOOGLE_AUD] }),
    ).rejects.toBeInstanceOf(OAuthVerifyError);
  });

  it('rejects a token signed by an unknown key', async () => {
    const attacker = await makeSigner('attacker-key');
    const token = await attacker.sign(
      { sub: 's', email: 'a@b.com' },
      { issuer: GOOGLE_ISS, audience: GOOGLE_AUD },
    );
    // Verified against the *legitimate* key set — signature must not match.
    await expect(
      verifyGoogleIdToken(token, { keySet: signer.keySet, audiences: [GOOGLE_AUD] }),
    ).rejects.toBeInstanceOf(OAuthVerifyError);
  });

  it('rejects a token missing an email claim', async () => {
    const token = await signer.sign({ sub: 's' }, { issuer: GOOGLE_ISS, audience: GOOGLE_AUD });
    await expect(
      verifyGoogleIdToken(token, { keySet: signer.keySet, audiences: [GOOGLE_AUD] }),
    ).rejects.toBeInstanceOf(OAuthVerifyError);
  });

  it('accepts the string "true" form of email_verified', async () => {
    const token = await signer.sign(
      { sub: 's', email: 'a@b.com', email_verified: 'true' },
      { issuer: GOOGLE_ISS, audience: GOOGLE_AUD },
    );
    const id = await verifyGoogleIdToken(token, { keySet: signer.keySet, audiences: [GOOGLE_AUD] });
    expect(id.sub).toBe('s');
  });

  it('rejects a token whose email is not verified', async () => {
    const token = await signer.sign(
      { sub: 's', email: 'a@b.com', email_verified: false },
      { issuer: GOOGLE_ISS, audience: GOOGLE_AUD },
    );
    await expect(
      verifyGoogleIdToken(token, { keySet: signer.keySet, audiences: [GOOGLE_AUD] }),
    ).rejects.toBeInstanceOf(OAuthVerifyError);
  });

  it('rejects a token with no email_verified claim at all', async () => {
    const token = await signer.sign(
      { sub: 's', email: 'a@b.com' },
      { issuer: GOOGLE_ISS, audience: GOOGLE_AUD },
    );
    await expect(
      verifyGoogleIdToken(token, { keySet: signer.keySet, audiences: [GOOGLE_AUD] }),
    ).rejects.toBeInstanceOf(OAuthVerifyError);
  });

  it('throws when no audiences are configured', async () => {
    const token = await signer.sign(
      { sub: 's', email: 'a@b.com' },
      { issuer: GOOGLE_ISS, audience: GOOGLE_AUD },
    );
    await expect(
      verifyGoogleIdToken(token, { keySet: signer.keySet, audiences: [] }),
    ).rejects.toBeInstanceOf(OAuthVerifyError);
  });
});

describe('verifyAppleIdentityToken', () => {
  it('accepts a properly signed token and returns sub + email', async () => {
    const token = await signer.sign(
      { sub: 'apple-sub-1', email: 'kid@privaterelay.appleid.com' },
      { issuer: APPLE_ISS, audience: APPLE_AUD },
    );
    const id = await verifyAppleIdentityToken(token, {
      keySet: signer.keySet,
      audiences: [APPLE_AUD],
    });
    expect(id).toEqual({
      provider: 'apple',
      sub: 'apple-sub-1',
      email: 'kid@privaterelay.appleid.com',
    });
  });

  it('rejects a token for a different bundle id', async () => {
    const token = await signer.sign(
      { sub: 's', email: 'a@b.com' },
      { issuer: APPLE_ISS, audience: 'com.someone.else' },
    );
    await expect(
      verifyAppleIdentityToken(token, { keySet: signer.keySet, audiences: [APPLE_AUD] }),
    ).rejects.toBeInstanceOf(OAuthVerifyError);
  });

  it('rejects a Google-issued token even with a valid signature', async () => {
    const token = await signer.sign(
      { sub: 's', email: 'a@b.com' },
      { issuer: GOOGLE_ISS, audience: APPLE_AUD },
    );
    await expect(
      verifyAppleIdentityToken(token, { keySet: signer.keySet, audiences: [APPLE_AUD] }),
    ).rejects.toBeInstanceOf(OAuthVerifyError);
  });
});
