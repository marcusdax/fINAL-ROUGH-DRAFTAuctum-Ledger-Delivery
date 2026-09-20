import cors from 'cors';
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { ProblemError, problem, sendProblem } from './lib/problem.js';
import { createRouter } from './routes/index.js';

/** Express app factory (contract §3 / brief §5). */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  const allowedOrigins = (process.env.AI_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin: allowedOrigins.length > 0 ? allowedOrigins : false,
      credentials: false,
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/v1', createRouter());

  // 404 fallback — Problem JSON catch-all.
  app.use((_req: Request, res: Response) => {
    sendProblem(res, problem(404, 'AL-GEN-1005', 'Resource not found'));
  });

  // Central error middleware — always emits Problem JSON.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ProblemError) {
      sendProblem(res, err.problem);
      return;
    }
    if (
      err instanceof SyntaxError &&
      'status' in err &&
      (err as { status?: number }).status === 400
    ) {
      sendProblem(res, problem(400, 'AL-GEN-1005', 'Malformed JSON request body'));
      return;
    }
    console.error('[api] unhandled error', err);
    sendProblem(res, problem(500, 'AL-GEN-1000', 'Internal server error'));
  });

  return app;
}
