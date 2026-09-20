import { Router } from 'express';
import { authenticate } from '../lib/authn.js';
import { idempotency } from '../lib/idempotency.js';
import { analyticsRouter } from './analytics.js';
import { automationRulesRouter } from './automation-rules.js';
import { campaignsRouter } from './campaigns.js';
import { catalogRouter } from './catalog.js';
import { chatRouter } from './chat.js';
import { credentialsRouter } from './credentials.js';
import { ordersRouter } from './orders.js';
import { referralsRouter } from './referrals.js';
import { roastersRouter } from './roasters.js';
import { sampleKitsRouter } from './sample-kits.js';
import { webhooksRouter } from './webhooks.js';

/**
 * /api/v1 router (brief §5). `/chat` is mounted BEFORE JWT auth (own API-key
 * scheme); everything else requires authentication. Idempotency-Key is
 * enforced on all POST/PATCH requests by middleware.
 */
export function createRouter(): Router {
  const router = Router();

  router.use('/chat', chatRouter);

  router.use(authenticate);
  router.use(idempotency());

  router.use(roastersRouter);
  router.use(catalogRouter);
  router.use(campaignsRouter);
  router.use(automationRulesRouter);
  router.use(sampleKitsRouter);
  router.use(ordersRouter);
  router.use(webhooksRouter);
  router.use(analyticsRouter);
  router.use(referralsRouter);
  router.use(credentialsRouter);

  return router;
}
