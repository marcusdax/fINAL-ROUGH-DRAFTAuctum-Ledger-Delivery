import { Router } from 'express';
import type { Connection } from './schema.js';

export const connectionsRouter = Router();

// Seed data for LotSpace connections (ACTUM website integration)
const seedConnections: Connection[] = [
  {
    id: 'conn-0001',
    followerSpaceId: 'space-0004',
    followingSpaceId: 'space-0001',
    type: 'follow',
    createdAt: new Date('2025-08-15T10:00:00Z'),
  },
  {
    id: 'conn-0002',
    followerSpaceId: 'space-0004',
    followingSpaceId: 'space-0003',
    type: 'follow',
    createdAt: new Date('2025-08-14T10:00:00Z'),
  },
  {
    id: 'conn-0003',
    followerSpaceId: 'space-0002',
    followingSpaceId: 'space-0001',
    type: 'follow',
    createdAt: new Date('2025-08-13T10:00:00Z'),
  },
  {
    id: 'conn-0004',
    followerSpaceId: 'space-0002',
    followingSpaceId: 'space-0003',
    type: 'subscriber',
    createdAt: new Date('2025-08-13T10:00:00Z'),
  },
  {
    id: 'conn-0005',
    followerSpaceId: 'space-0005',
    followingSpaceId: 'space-0004',
    type: 'collector',
    createdAt: new Date('2025-08-12T10:00:00Z'),
  },
  {
    id: 'conn-0006',
    followerSpaceId: 'space-0005',
    followingSpaceId: 'space-0001',
    type: 'collector',
    createdAt: new Date('2025-08-11T10:00:00Z'),
  },
];

connectionsRouter.get('/', async (req, res) => {
  const spaceId = req.query.spaceId as string | undefined;
  let connections = seedConnections;
  if (spaceId) {
    connections = connections.filter(
      (c) => c.followingSpaceId === spaceId || c.followerSpaceId === spaceId
    );
  }
  res.json({ data: connections, meta: { total: connections.length } });
});

connectionsRouter.get('/:spaceId', async (req, res) => {
  const spaceId = req.params.spaceId;
  const connections = seedConnections.filter(
    (c) => c.followingSpaceId === spaceId || c.followerSpaceId === spaceId
  );
  res.json({ data: connections, meta: { total: connections.length } });
});

export default connectionsRouter;