import { Router } from 'express';

export const integrationRouter = Router();

integrationRouter.get('/health', async (_req, res) => {
  res.json({ status: 'ok', contexts: ['spaces', 'feeds', 'reputation', 'connections'] });
});

export default integrationRouter;