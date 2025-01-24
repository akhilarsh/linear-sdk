import * as dotenv from 'dotenv';
dotenv.config();

export type ILinear = {
  apiKey: string;
  cycleStart: string;
  cycleEnd: string;
};

export function linearConfig(): ILinear {
  if (!process.env.LINEAR_API_KEY) {
    throw new Error('LINEAR_API_KEY is not set in environment variables');
  }

  return {
    apiKey: process.env.LINEAR_API_KEY,
    cycleStart: process.env.CYCLE_START_DATE,
    cycleEnd: process.env.CYCLE_END_DATE,
  };
}
