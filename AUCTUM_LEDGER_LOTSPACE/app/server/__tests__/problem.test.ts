import { describe, expect, it } from 'vitest';
import { ProblemError, PROBLEM_TYPE_BASE, problem } from '../lib/problem.js';

describe('problem (RFC 9457)', () => {
  it('builds the full Problem shape', () => {
    const p = problem(404, 'AL-GEN-1005', 'Resource not found');
    expect(p.type).toBe(`${PROBLEM_TYPE_BASE}/AL-GEN-1005`);
    expect(p.title).toBe('AL-GEN-1005');
    expect(p.status).toBe(404);
    expect(p.code).toBe('AL-GEN-1005');
    expect(p.detail).toBe('Resource not found');
    expect(p.traceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('omits optional detail/errors when absent', () => {
    const p = problem(500, 'AL-GEN-1000');
    expect('detail' in p).toBe(false);
    expect('errors' in p).toBe(false);
  });

  it('includes field errors when provided', () => {
    const p = problem(400, 'AL-ROASTER-1002', 'roaster_name is required', [
      { field: 'roaster_name', code: 'required', message: 'roaster_name is required' },
    ]);
    expect(p.errors).toHaveLength(1);
    expect(p.errors?.[0].field).toBe('roaster_name');
  });

  it('generates a unique traceId per call', () => {
    expect(problem(404, 'AL-GEN-1005').traceId).not.toBe(problem(404, 'AL-GEN-1005').traceId);
  });

  it('uses the auctumledger.io type base', () => {
    expect(PROBLEM_TYPE_BASE).toBe('https://api.auctumledger.io/problems');
    expect(problem(422, 'AL-GEN-1003').type).toBe(
      'https://api.auctumledger.io/problems/AL-GEN-1003',
    );
  });

  describe('ProblemError', () => {
    it('carries a Problem body and message', () => {
      const err = new ProblemError(409, 'AL-EDU-1002', 'Invalid credential transition');
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('Invalid credential transition');
      expect(err.problem.status).toBe(409);
      expect(err.problem.code).toBe('AL-EDU-1002');
      expect(err.problem.type).toBe('https://api.auctumledger.io/problems/AL-EDU-1002');
    });
  });
});
