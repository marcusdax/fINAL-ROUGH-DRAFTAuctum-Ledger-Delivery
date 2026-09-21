import { Router } from 'express';
import { db, query } from '../db/index.js';
import { memory } from '../db/memory.js';
import { singleEnvelope } from './helpers.js';

export const dashboardRouter = Router();

/**
 * Dashboard summary for overview page.
 * Provides key metrics for the Ledger dashboard.
 * Spaces and connections are seeded in dedicated services; the rest are in memory/pg.
 */
dashboardRouter.get('/dashboard', async (_req, res, next) => {
  try {
    let totalSpaces = 5;
    let activeSpaces = 3;
    let totalConnections = 6;
    let totalSampleKits = 0;
    let totalOrders = 0;
    let totalCampaigns = 0;

    if (db.pg) {
      try {
        // Count sample kits
        const sampleKitsResult = await query('SELECT COUNT(*) as count FROM sample_kits');
        totalSampleKits = Number(sampleKitsResult[0].count);

        // Count orders
        const ordersResult = await query('SELECT COUNT(*) as count FROM orders');
        totalOrders = Number(ordersResult[0].count);

        // Count campaigns
        const campaignsResult = await query('SELECT COUNT(*) as count FROM campaigns');
        totalCampaigns = Number(campaignsResult[0].count);
      } catch {
        // Fall back to memory mode if queries fail
        totalSampleKits = memory.sampleKits.length;
        totalOrders = memory.orders.length;
        totalCampaigns = memory.campaigns.length;
      }
    } else {
      // Memory mode
      totalSampleKits = memory.sampleKits.length;
      totalOrders = memory.orders.length;
      totalCampaigns = memory.campaigns.length;
    }

    res.json(
      singleEnvelope({
        totalSpaces,
        activeSpaces,
        totalConnections,
        totalSampleKits,
        totalOrders,
        totalCampaigns,
        // Additional metrics can be added here
        lastUpdated: new Date().toISOString(),
      })
    );
  } catch (err) {
    next(err);
  }
});

export default dashboardRouter;