import { Router } from 'express';

export const reputationRouter = Router();

reputationRouter.get('/reputation/:spaceId', async (req, res) => {
  res.json({ data: null, meta: {} });
});

export default reputationRouter;