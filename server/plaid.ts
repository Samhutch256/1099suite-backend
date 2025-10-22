import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { env } from './env';

const plaidEnvironment =
  env.plaidEnv === 'production'
    ? PlaidEnvironments.production
    : PlaidEnvironments.sandbox;

const configuration = new Configuration({
  basePath: plaidEnvironment,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': env.plaidClientId,
      'PLAID-SECRET': env.plaidSecret,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);
