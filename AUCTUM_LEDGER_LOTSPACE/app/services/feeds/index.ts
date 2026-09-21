import { Router } from 'express';
import type { FeedItem } from './schema.js';

export const feedsRouter = Router();

// Seed data for LotSpace feed (ACTUM website integration)
const seedFeeds: FeedItem[] = [
  {
    id: 'feed-0001',
    spaceId: 'space-0001',
    type: 'cupping_result',
    content: {
      title: 'Cupping: Ethiopia Guji Hambela',
      body: '87.5 pts — jasmine, bergamot, apricot, black tea notes.',
      images: ['https://example.com/images/cupping-001.jpg'],
    },
    provenanceRef: 'lot-7a1c0e10-2b4a-4f0a-8a11-0000000000a1',
    createdAt: new Date('2025-08-15T10:00:00Z'),
  },
  {
    id: 'feed-0002',
    spaceId: 'space-0003',
    type: 'story',
    content: {
      title: 'New harvest from Finca El Injerto',
      body: 'Bourbon varietal, washed process. Clean cup with apple, almond, and brown sugar notes.',
      images: ['https://example.com/images/harvest-002.jpg'],
    },
    provenanceRef: null,
    createdAt: new Date('2025-08-14T08:30:00Z'),
  },
  {
    id: 'feed-0003',
    spaceId: 'space-0004',
    type: 'tip',
    content: {
      title: 'Micro-lot release',
      body: 'Costa Rica Tarrazú Geisha anaerobic natural. Pineapple, mango, and fermented wine notes.',
      images: [],
    },
    provenanceRef: null,
    createdAt: new Date('2025-08-13T14:00:00Z'),
  },
  {
    id: 'feed-0004',
    spaceId: 'space-0001',
    type: 'purchase',
    content: {
      title: 'Sold: Panama Geisha Natural',
      body: 'Hacienda La Esmeralda — 50 bags, intense tropical fruit, rose, and honey notes.',
      images: ['https://example.com/images/sale-004.jpg'],
    },
    provenanceRef: 'lot-7a1c0e10-2b4a-4f0a-8a11-0000000000a8',
    createdAt: new Date('2025-08-12T16:45:00Z'),
  },
  {
    id: 'feed-0005',
    spaceId: 'space-0003',
    type: 'cupping_result',
    content: {
      title: 'Cupping: Kenya Nyeri SL-28',
      body: '88.0 pts — blackcurrant, grapefruit, and wine-like acidity.',
      images: ['https://example.com/images/cupping-005.jpg'],
    },
    provenanceRef: 'lot-7a1c0e10-2b4a-4f0a-8a11-0000000000a3',
    createdAt: new Date('2025-08-11T09:15:00Z'),
  },
];

feedsRouter.get('/', async (req, res) => {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '20', 10);
  const offset = (page - 1) * limit;
  const data = seedFeeds.slice(offset, offset + limit);
  res.json({ data, meta: { total: seedFeeds.length, page, limit } });
});

export default feedsRouter;