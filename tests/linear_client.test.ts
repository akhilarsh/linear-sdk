import { linearConfig, ILinear } from '../src/config';
import { describe, expect, it, beforeEach, afterAll } from '@jest/globals';

describe('linearConfig', () => {
  const originalEnv = { ...process.env }; // Clone the original environment variables

  beforeEach(() => {
    jest.resetModules(); // Reset module state before each test
    process.env = { ...originalEnv }; // Reset environment variables
  });

  afterAll(() => {
    process.env = originalEnv; // Restore original environment variables after all tests
  });

  it('should throw an error when LINEAR_API_KEY is not set', () => {
    delete process.env.LINEAR_API_KEY; // Simulate missing LINEAR_API_KEY
    expect(() => linearConfig()).toThrowError('LINEAR_API_KEY is not set in environment variables');
  });

  it('should return a config object with all required properties', () => {
    // Set required environment variables
    process.env.LINEAR_API_KEY = 'test-api-key';
    process.env.CYCLE_START_DATE = '2024-01-01';
    process.env.CYCLE_END_DATE = '2024-01-31';

    const config: ILinear = linearConfig();

    // Assert that the returned config matches the expected structure and values
    expect(config).toStrictEqual({
      apiKey: 'test-api-key',
      cycleStart: '2024-01-01',
      cycleEnd: '2024-01-31',
    });
  });
});
