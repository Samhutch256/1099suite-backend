import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import { createPlaidRouter } from './routes/plaid';

const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const app = express();

app.use(
  cors({
    origin: true,
    credentials: false,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    plaidEnv: env.plaidEnv,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/plaid', createPlaidRouter(supabase));

if (require.main === module) {
  app.listen(env.port, () => {
    console.log(
      `[Server] Listening on port ${env.port} in ${env.nodeEnv} mode (Plaid ${env.plaidEnv})`,
    );
  });
}
