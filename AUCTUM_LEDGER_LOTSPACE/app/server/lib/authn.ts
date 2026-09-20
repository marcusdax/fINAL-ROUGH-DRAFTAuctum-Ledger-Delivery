import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyResult } from 'jose';
import type { NextFunction, Request, Response } from 'express';
import { problem, sendProblem } from './problem.js';

/**
 * OIDC authentication (brief §5 / task 4).
 *
 * Bearer tokens are verified with `jose` against a remote JWKS derived from
 * OIDC_ISSUER, with audience OIDC_AUDIENCE. Dev overrides (never in
 * production): `AUTH_DISABLE=true` bypasses auth entirely; `LOCAL_JWT`
 * accepts HS256 tokens signed with that secret for local testing.
 */

export interface Principal {
  sub: string;
  accountId?: string;
  scopes: string[];
  claims: JWTPayload;
}

type GetKeyFn = ReturnType<typeof createRemoteJWKSet>;

let jwks: GetKeyFn | null = null;

function getJwks(): GetKeyFn {
  if (!jwks) {
    const issuer = process.env.OIDC_ISSUER;
    if (!issuer) throw new Error('OIDC_ISSUER is not configured');
    jwks = createRemoteJWKSet(new URL(`${issuer.replace(/\/$/, '')}/.well-known/jwks.json`));
  }
  return jwks;
}

function isAuthDisabled(): boolean {
  return process.env.AUTH_DISABLE === 'true' && process.env.NODE_ENV !== 'production';
}

export function extractScopes(claims: JWTPayload): string[] {
  if (typeof claims.scope === 'string') return claims.scope.split(' ').filter(Boolean);
  if (Array.isArray(claims.scp)) return claims.scp.filter((s): s is string => typeof s === 'string');
  return [];
}

function toPrincipal(verified: JWTVerifyResult): Principal {
  const claims = verified.payload;
  const accountId =
    typeof claims.account_id === 'string'
      ? claims.account_id
      : typeof claims.accountId === 'string'
        ? claims.accountId
        : undefined;
  return {
    sub: claims.sub ?? 'unknown',
    accountId,
    scopes: extractScopes(claims),
    claims,
  };
}

export async function verifyToken(token: string): Promise<Principal> {
  const localSecret = process.env.LOCAL_JWT;
  if (localSecret && process.env.NODE_ENV !== 'production') {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(localSecret), {
      algorithms: ['HS256'],
    });
    return toPrincipal({ payload, protectedHeader: { alg: 'HS256' } } as JWTVerifyResult);
  }
  const verified = await jwtVerify(token, getJwks(), {
    issuer: process.env.OIDC_ISSUER,
    audience: process.env.OIDC_AUDIENCE,
  });
  return toPrincipal(verified);
}

export function getPrincipal(req: Request): Principal | undefined {
  return (req.res?.locals.principal ?? undefined) as Principal | undefined;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (isAuthDisabled()) {
    res.locals.principal = {
      sub: 'dev-user',
      scopes: ['*'],
      claims: { sub: 'dev-user', scope: '*' },
    } satisfies Principal;
    next();
    return;
  }
  const header = req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (!token) {
    sendProblem(res, problem(401, 'AL-AUTH-1001', 'Missing bearer token'));
    return;
  }
  try {
    res.locals.principal = await verifyToken(token);
    next();
  } catch {
    sendProblem(res, problem(401, 'AL-AUTH-1001', 'Invalid or expired bearer token'));
  }
}
