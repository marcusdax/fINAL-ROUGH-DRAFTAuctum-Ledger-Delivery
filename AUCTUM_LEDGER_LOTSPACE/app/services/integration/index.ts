import { Router } from 'express';

export const integrationRouter = Router();

integrationRouter.get('/health', async (_req, res) => {
  res.json({
    status: 'ok',
    contexts: ['spaces', 'feeds', 'reputation', 'connections'],
    ledger_status: 'active',
    outbox_depth: 0,
    schema_version: 'v1',
    consumer_group: 'auctum',
  });
});

export default integrationRouter;