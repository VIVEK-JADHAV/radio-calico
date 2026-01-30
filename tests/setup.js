// Global test setup
process.env.NODE_ENV = 'test';
process.env.PORT = 3001;
process.env.DATABASE_PATH = ':memory:';

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   error: jest.fn(),
//   warn: jest.fn(),
// };
