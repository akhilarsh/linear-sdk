import { LinearClient } from '@linear/sdk';
import { linearConfig } from './config';

// Api key authentication
export const linearClient = new LinearClient({
  apiKey: linearConfig().apiKey,
});
