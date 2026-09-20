import { Router } from 'express';
import { db, query } from '../db/index.js';
import { memory, type CampaignRow } from '../db/memory.js';
import { problem, sendProblem } from '../lib/problem.js';
import { singleEnvelope } from './helpers.js';

export const analyticsRouter = Router();

/**
 * Campaign performance rollup sourced from telemetry.engagement_events
 * (pg mode). In-memory mode derives funnel counts from kit/order fixtures.
 */
analyticsRouter.get('/analytics/campaign-performance/:campaignId', async (req, res, next) => {
  try {
    const campaignId = req.params.campaignId;
    let campaign: CampaignRow | undefined;
    if (db.pg) {
      const rows = await query<CampaignRow>(
        'SELECT * FROM campaigns WHERE id = $1 OR slug = $1',
        [campaignId],
      );
      campaign = rows[0];
    } else {
      campaign = memory.campaigns.find((c) => c.id === campaignId || c.slug === campaignId);
    }
    if (!campaign) {
      sendProblem(res, problem(404, 'AL-CMP-1001', `Campaign ${campaignId} not found`));
      return;
    }

    let sent = 0;
    let opened = 0;
    let clicked = 0;
    let converted = 0;
    if (db.pg) {
      try {
        const rows = await query<{ event_type: string; n: string }>(
          `SELECT event_type, COUNT(*)::text AS n
           FROM telemetry.engagement_events
           WHERE campaign_id = $1
           GROUP BY event_type`,
          [campaign.id],
        );
        for (const row of rows) {
          const n = Number.parseInt(row.n, 10);
          if (row.event_type === 'sent') sent = n;
          else if (row.event_type === 'opened') opened = n;
          else if (row.event_type === 'clicked') clicked = n;
          else if (row.event_type === 'converted') converted = n;
        }
      } catch {
        // telemetry schema/table absent (plain postgres without migration) → zeros
      }
    } else {
      // Dev-mode fixture rollup: kits requested/delivered and orders placed.
      sent = memory.sampleKits.length;
      opened = memory.sampleKits.filter((k) => k.status !== 'requested').length;
      clicked = memory.sampleKits.filter((k) => k.feedback_submitted_at !== null).length;
      converted = memory.orders.length;
    }

    res.json(
      singleEnvelope({
        campaign_id: campaign.id,
        slug: campaign.slug,
        name: campaign.name,
        status: campaign.status,
        sent,
        opened,
        clicked,
        converted,
        open_rate: sent > 0 ? opened / sent : 0,
        click_rate: opened > 0 ? clicked / opened : 0,
        conversion_rate: sent > 0 ? converted / sent : 0,
      }),
    );
  } catch (err) {
    next(err);
  }
});
