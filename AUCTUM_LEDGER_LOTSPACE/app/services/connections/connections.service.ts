import { randomUUID } from 'node:crypto';
import type { Connection } from './schema.js';

const connections = new Map<string, Connection[]>();

export function createConnection(input: { followerSpaceId: string; followingSpaceId: string; type: Connection['type'] }): Connection {
  const conn: Connection = {
    id: randomUUID(),
    followerSpaceId: input.followerSpaceId,
    followingSpaceId: input.followingSpaceId,
    type: input.type,
    createdAt: new Date(),
  };
  const existing = connections.get(input.followingSpaceId) ?? [];
  existing.push(conn);
  connections.set(input.followingSpaceId, existing);
  return conn;
}

export function getConnections(spaceId: string): { data: Connection[]; meta: { total: number } } {
  const items = connections.get(spaceId) ?? [];
  return { data: items, meta: { total: items.length } };
}

export function getFollowers(spaceId: string): Connection[] {
  return connections.get(spaceId) ?? [];
}