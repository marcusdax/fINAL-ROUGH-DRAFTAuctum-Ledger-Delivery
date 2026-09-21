import { Router } from 'express';

export const feedsRouter = Router();

feedsRouter.get('/feeds', async (req, res) => {
  res.json({ data: [], meta: { total: 0 } });
});

export default feedsRouter;