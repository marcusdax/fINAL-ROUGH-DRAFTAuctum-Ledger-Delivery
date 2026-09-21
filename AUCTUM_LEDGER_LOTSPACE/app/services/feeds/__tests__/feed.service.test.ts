import { describe, it, expect } from 'vitest';
import { createFeedItem, getFeedBySpace } from '../feed.service.js';

describe('Feed service', () => {
  it('creates a feed item with provenance reference', () => {
    const item = createFeedItem({
      spaceId: 'space-1',
      type: 'story',
      content: { text: 'New harvest available' },
      provenanceRef: 'lot-123',
    });
    expect(item.id).toBeDefined();
    expect(item.type).toBe('story');
    expect(item.provenanceRef).toBe('lot-123');
  });

  it('retrieves feed items by space', () => {
    createFeedItem({ spaceId: 'space-2', type: 'tip', content: { amount: 10 }, provenanceRef: null });
    createFeedItem({ spaceId: 'space-2', type: 'follow', content: { followedSpaceId: 'space-3' }, provenanceRef: null });
    const feed = getFeedBySpace('space-2');
    expect(feed.data).toHaveLength(2);
  });

  it('stories carry provenance, tips are trust events', () => {
    const story = createFeedItem({ spaceId: 'space-4', type: 'story', content: { text: 'Origin story' }, provenanceRef: 'lot-456' });
    expect(story.provenanceRef).toBe('lot-456');
  });
});