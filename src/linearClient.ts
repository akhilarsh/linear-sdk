import { LinearClient } from '@linear/sdk';
import { linearConfig } from './config';

// Api key authentication
export const linearClient = new LinearClient({
  apiKey: linearConfig().apiKey,
});

export const cycleStartDate = linearConfig().cycleStart;
export const cycleEndDate = linearConfig().cycleEnd;
