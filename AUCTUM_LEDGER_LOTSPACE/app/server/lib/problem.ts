import crypto from 'node:crypto';
import type { Response } from 'express';

export const PROBLEM_TYPE_BASE = 'https://api.auctumledger.io/problems';

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export interface Problem {
  type: string;
  title: string;
  status: number;
  code: string;
  detail?: string;
  errors?: FieldError[];
  traceId: string;
}

/** Build an RFC 9457 Problem Details body (brief §5). */
export function problem(
  status: number,
  code: string,
  detail?: string,
  errors?: FieldError[],
): Problem {
  const body: Problem = {
    type: `${PROBLEM_TYPE_BASE}/${code}`,
    title: code,
    status,
    code,
    traceId: crypto.randomUUID(),
  };
  if (detail !== undefined) body.detail = detail;
  if (errors !== undefined && errors.length > 0) body.errors = errors;
  return body;
}

/** Error carrying a Problem body; caught by the central error middleware. */
export class ProblemError extends Error {
  readonly problem: Problem;

  constructor(status: number, code: string, detail?: string, errors?: FieldError[]) {
    super(detail ?? code);
    this.name = 'ProblemError';
    this.problem = problem(status, code, detail, errors);
  }
}

/** Serialize a Problem as application/problem+json. */
export function sendProblem(res: Response, body: Problem): void {
  res.status(body.status).type('application/problem+json').json(body);
}
