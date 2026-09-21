import { randomUUID } from 'node:crypto';
import type { Space } from './schema.js';

const spaces = new Map<string, Space>();

export function createSpace(input: { userId: string; archetype: Space['archetype']; shopfront: Space['shopfront'] }): Space {
  const now = new Date();
  const space: Space = {
    id: randomUUID(),
    userId: input.userId,
    archetype: input.archetype,
    shopfront: input.shopfront,
    compliance: { verified: false, documents: [] },
    incomeLedger: { totalEarned: 0, currency: 'USD' },
    createdAt: now,
    updatedAt: now,
  };
  spaces.set(space.id, space);
  return space;
}

export function getSpace(id: string): Space | undefined {
  return spaces.get(id);
}

export function updateShopfront(id: string, shopfront: Partial<Space['shopfront']>): Space | undefined {
  const space = spaces.get(id);
  if (!space) return undefined;
  space.shopfront = { ...space.shopfront, ...shopfront };
  space.updatedAt = new Date();
  return space;
}