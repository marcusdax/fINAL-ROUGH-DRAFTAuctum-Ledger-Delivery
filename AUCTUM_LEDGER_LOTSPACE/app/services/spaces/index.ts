import { Router } from 'express';
import type { Space } from './schema.js';

export const spacesRouter = Router();

// Seed data for LotSpace discovery (ACTUM website integration)
const seedSpaces: Space[] = [
  {
    id: 'space-0001',
    userId: 'seed-user-1',
    archetype: 'importer',
    shopfront: {
      name: 'Hacienda La Esmeralda',
      description: 'Specialty green bean importer specializing in Panamanian Geisha and rare varietals.',
      logo_url: 'https://example.com/avatars/hacienda.png',
    },
    compliance: { verified: true, documents: ['SCA-GB-10412', 'CQI-Q-88271'] },
    incomeLedger: { totalEarned: 42500000, currency: 'USD' },
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-08-01T00:00:00Z',
  },
  {
    id: 'space-0002',
    userId: 'seed-user-2',
    archetype: 'exporter',
    shopfront: {
      name: 'Finca El Injerto',
      description: 'Family-owned farm in Guatemala with a legacy of award-winning coffees.',
      logo_url: 'https://example.com/avatars/finca.png',
    },
    compliance: { verified: false, documents: [] },
    incomeLedger: { totalEarned: 18700000, currency: 'USD' },
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2025-07-15T00:00:00Z',
  },
  {
    id: 'space-0003',
    userId: 'seed-user-3',
    archetype: 'roaster',
    shopfront: {
      name: 'Nordlicht Rösterei',
      description: 'Hamburg-based specialty roaster with a focus on origin-driven profiles.',
      logo_url: 'https://example.com/avatars/nordlicht.png',
    },
    compliance: { verified: true, documents: ['QC-Q-88271'] },
    incomeLedger: { totalEarned: 15200000, currency: 'USD' },
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2025-08-10T00:00:00Z',
  },
  {
    id: 'space-0004',
    userId: 'seed-user-4',
    archetype: 'collector',
    shopfront: {
      name: 'Bean & Bloom',
      description: 'Micro-roastery sourcing directly from smallholder farms worldwide.',
      logo_url: 'https://example.com/avatars/beanbloom.png',
    },
    compliance: { verified: false, documents: [] },
    incomeLedger: { totalEarned: 642000, currency: 'USD' },
    createdAt: '2024-09-01T00:00:00Z',
    updatedAt: '2025-08-20T00:00:00Z',
  },
  {
    id: 'space-0005',
    userId: 'seed-user-5',
    archetype: 'farmer',
    shopfront: {
      name: 'Đắk Lắk Craft Roasters',
      description: 'Vietnamese roaster specializing in Central Highlands coffees.',
      logo_url: 'https://example.com/avatars/daklak.png',
    },
    compliance: { verified: true, documents: ['UTZ'] },
    incomeLedger: { totalEarned: 5120000, currency: 'USD' },
    createdAt: '2025-02-01T00:00:00Z',
    updatedAt: '2025-08-05T00:00:00Z',
  },
];

spacesRouter.get('/', async (req, res) => {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '20', 10);
  const offset = (page - 1) * limit;
  const data = seedSpaces.slice(offset, offset + limit);
  res.json({ data, meta: { total: seedSpaces.length, page, limit } });
});

spacesRouter.get('/:spaceId', async (req, res) => {
  const space = seedSpaces.find(s => s.id === req.params.spaceId);
  if (!space) {
    res.status(404).json({ error: 'Space not found' });
    return;
  }
  res.json({ data: space, meta: {} });
});

export default spacesRouter;
