import { describe, it, expect } from 'vitest';
import { createConnection, getConnections, getFollowers } from '../connections.service.js';

describe('Connections service', () => {
  it('creates a follow connection', () => {
    const conn = createConnection({ followerSpaceId: 'space-1', followingSpaceId: 'space-2', type: 'follow' });
    expect(conn.id).toBeDefined();
    expect(conn.type).toBe('follow');
  });

  it('retrieves connections for a space', () => {
    createConnection({ followerSpaceId: 'space-3', followingSpaceId: 'space-4', type: 'fan' });
    const conns = getConnections('space-4');
    expect(conns.data).toHaveLength(1);
  });

  it('retrieves followers of a space', () => {
    createConnection({ followerSpaceId: 'space-5', followingSpaceId: 'space-6', type: 'follow' });
    const followers = getFollowers('space-6');
    expect(followers).toHaveLength(1);
    expect(followers[0].followerSpaceId).toBe('space-5');
  });
});