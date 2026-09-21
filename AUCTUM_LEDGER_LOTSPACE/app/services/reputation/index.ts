import { Router } from 'express';
import type { ReputationRecord } from './schema.js';

export const reputationRouter = Router();

// Seed data for LotSpace reputation (ACTUM website integration)
const seedReputation: ReputationRecord[] = [
  {
    id: 'rep-0001',
    spaceId: 'space-0001',
    credential: {
      code: 'CUPPER_PANEL',
      level: 'panel',
      expiresAt: '2026-09-01T00:00:00Z',
      status: 'active',
    },
    score: 92.5,
    createdAt: '2025-08-01T00:00:00Z',
    updatedAt: '2025-08-15T00:00:00Z',
  },
  {
    id: 'rep-0002',
    spaceId: 'space-0003',
    credential: {
      code: 'Q_GRADER_ARABICA',
      level: 'grader',
      expiresAt: '2026-06-01T00:00:00Z',
      status: 'expiring',
    },
    score: 88.0,
    createdAt: '2025-08-01T00:00:00Z',
    updatedAt: '2025-08-10T00:00:00Z',
  },
  {
    id: 'rep-0003',
    spaceId: 'space-0004',
    credential: {
      code: 'CUPPER_TIER_1',
      level: 'tier1',
      expiresAt: null,
      status: 'active',
    },
    score: 85.5,
    createdAt: '2025-08-01T00:00:00Z',
    updatedAt: '2025-08-20T00:00:00Z',
  },
  {
    id: 'rep-0004',
    spaceId: 'space-0002',
    credential: {
      code: 'DOC_OPERATOR',
      level: 'operator',
      expiresAt: '2025-07-01T00:00:00Z',
      status: 'stale',
    },
    score: 72.0,
    createdAt: '2025-08-01T00:00:00Z',
    updatedAt: '2025-08-05T00:00:00Z',
  },
  {
    id: 'rep-0005',
    spaceId: 'space-0005',
    credential: {
      code: 'SAMPLE_CUSTODY',
      level: 'custody',
      expiresAt: '2025-03-01T00:00:00Z',
      status: 'lapsed',
    },
    score: 61.0,
    createdAt: '2025-08-01T00:00:00Z',
    updatedAt: '2025-08-01T00:00:00Z',
  },
];

reputationRouter.get('/:spaceId', async (req, res) => {
  const record = seedReputation.find(r => r.spaceId === req.params.spaceId);
  res.json({ data: record ?? null, meta: {} });
});

reputationRouter.get('/', async (req, res) => {
  res.json({ data: seedReputation, meta: { total: seedReputation.length } });
});

export default reputationRouter;