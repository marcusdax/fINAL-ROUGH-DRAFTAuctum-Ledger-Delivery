import { Router } from 'express';

export const spacesRouter = Router();

spacesRouter.get('/spaces', async (req, res) => {
  res.json({ data: [], meta: { total: 0 } });
});

export default spacesRouter;
