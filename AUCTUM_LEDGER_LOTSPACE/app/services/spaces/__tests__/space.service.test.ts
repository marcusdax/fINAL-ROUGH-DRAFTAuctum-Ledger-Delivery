import { describe, it, expect } from 'vitest';
import { createSpace, getSpace, updateShopfront } from '../space.service.js';

describe('Space service', () => {
  it('creates a space with required fields', () => {
    const space = createSpace({
      userId: 'user-1',
      archetype: 'farmer',
      shopfront: { name: 'Test Farm', description: 'A test farm', avatarUrl: null },
    });
    expect(space.id).toBeDefined();
    expect(space.archetype).toBe('farmer');
    expect(space.compliance.verified).toBe(false);
    expect(space.incomeLedger.totalEarned).toBe(0);
  });

  it('retrieves a space by ID', () => {
    const space = createSpace({ userId: 'user-2', archetype: 'roaster', shopfront: { name: 'Test Roaster', description: '', avatarUrl: null } });
    const retrieved = getSpace(space.id);
    expect(retrieved?.shopfront.name).toBe('Test Roaster');
  });

  it('updates shopfront', () => {
    const space = createSpace({ userId: 'user-3', archetype: 'consumer', shopfront: { name: 'Old', description: '', avatarUrl: null } });
    const updated = updateShopfront(space.id, { name: 'New Name', description: 'Updated', avatarUrl: 'https://example.com/avatar.png' });
    expect(updated.shopfront.name).toBe('New Name');
    expect(updated.shopfront.avatarUrl).toBe('https://example.com/avatar.png');
  });
});