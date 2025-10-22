import { config as loadEnv } from 'dotenv';

loadEnv();

type PlaidEnvironmentName = 'sandbox' | 'production';

interface EnvConfig {
  nodeEnv: string;
  port: number;
  plaidClientId: string;
  plaidSecret: string;
  plaidEnv: PlaidEnvironmentName;
  plaidWebhookUrl?: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  tokenEncryptionKey: Buffer;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return parsed;
}

function resolvePlaidEnv(): PlaidEnvironmentName {
  return process.env.PLAID_ENV === 'production' ? 'production' : 'sandbox';
}

function loadTokenKey(): Buffer {
  const raw = requireEnv('TOKEN_ENC_KEY');
  const decoded = Buffer.from(raw, 'base64');
  if (decoded.length !== 32) {
    throw new Error(
      'TOKEN_ENC_KEY must be a base64 encoded 32-byte value (256-bit key)',
    );
  }
  return decoded;
}

export const env: EnvConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseIntEnv('PORT', 5001),
  plaidClientId: requireEnv('PLAID_CLIENT_ID'),
  plaidSecret: requireEnv('PLAID_SECRET'),
  plaidEnv: resolvePlaidEnv(),
  plaidWebhookUrl: process.env.PLAID_WEBHOOK_URL,
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  tokenEncryptionKey: loadTokenKey(),
};

export type Env = typeof env;
