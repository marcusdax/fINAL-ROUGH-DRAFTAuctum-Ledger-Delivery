import { randomUUID } from 'node:crypto';
import type { FeedItem } from './schema.js';

const feeds = new Map<string, FeedItem[]>();

export function createFeedItem(input: { spaceId: string; type: FeedItem['type']; content: Record<string, unknown>; provenanceRef: string | null }): FeedItem {
  const item: FeedItem = {
    id: randomUUID(),
    spaceId: input.spaceId,
    type: input.type,
    content: input.content,
    provenanceRef: input.provenanceRef,
    createdAt: new Date(),
  };
  const existing = feeds.get(input.spaceId) ?? [];
  existing.push(item);
  feeds.set(input.spaceId, existing);
  return item;
}

export function getFeedBySpace(spaceId: string): { data: FeedItem[]; meta: { total: number } } {
  const items = feeds.get(spaceId) ?? [];
  return { data: items, meta: { total: items.length } };
}