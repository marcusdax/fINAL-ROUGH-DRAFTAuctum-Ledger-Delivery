import { createApp } from './app.js';
import { shutdownDb } from './db/index.js';
import { shutdownKafka, startOutboxRelay } from './lib/kafka.js';

const port = Number.parseInt(process.env.AI_PROXY_PORT ?? '3001', 10);

const app = createApp();
const server = app.listen(port, () => {
  console.log(`[auctum-ledger] api listening on :${port}`);
});

const stopRelay = startOutboxRelay(
  Number.parseInt(process.env.OUTBOX_RELAY_INTERVAL_MS ?? '5000', 10),
);

async function shutdown(signal: string): Promise<void> {
  console.log(`[auctum-ledger] ${signal} received, shutting down`);
  stopRelay();
  server.close();
  await shutdownKafka();
  await shutdownDb();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
