import { Router } from 'express';

export const connectionsRouter = Router();

connectionsRouter.get('/connections/:spaceId', async (req, res) => {
  res.json({ data: [], meta: { total: 0 } });
});

export default connectionsRouter;