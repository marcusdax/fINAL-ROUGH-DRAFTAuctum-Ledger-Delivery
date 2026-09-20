import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { getPrincipal } from './authn.js';
import { problem, sendProblem } from './problem.js';

/**
 * Authorization helpers (brief §5 / task 4).
 * `requireScope` gates an endpoint on an OAuth scope; `scopedToAccount`
 * restricts access to the tenant account named by a route param when the
 * principal carries an account claim.
 */

export function requireScope(scope: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const principal = getPrincipal(req);
    if (!principal) {
      sendProblem(res, problem(401, 'AL-AUTH-1001', 'Authentication required'));
      return;
    }
    if (!principal.scopes.includes('*') && !principal.scopes.includes(scope)) {
      sendProblem(res, problem(403, 'AL-AUTH-1003', `Missing required scope: ${scope}`));
      return;
    }
    next();
  };
}

export function scopedToAccount(param = 'accountId'): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const principal = getPrincipal(req);
    if (!principal) {
      sendProblem(res, problem(401, 'AL-AUTH-1001', 'Authentication required'));
      return;
    }
    const claimed = req.params[param];
    if (
      principal.accountId &&
      claimed &&
      claimed !== principal.accountId &&
      !principal.scopes.includes('*')
    ) {
      sendProblem(res, problem(403, 'AL-AUTH-1003', 'Token is not scoped to this account'));
      return;
    }
    next();
  };
}
