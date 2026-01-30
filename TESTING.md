# Testing Guide

This document describes the testing framework and how to run tests for Radio Calico.

## Overview

Radio Calico uses **Jest** as the testing framework with **Supertest** for API testing. The test suite covers:

- Backend API endpoints
- Database operations and constraints
- Rating system logic
- Frontend utility functions
- Metadata parsing
- Integration tests

## Prerequisites

Install test dependencies:

```bash
npm install
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test Suites
```bash
# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:frontend

# Integration tests only
npm run test:integration
```

### Run Individual Test Files
```bash
# Run specific test file
npx jest tests/backend/api/ratings.test.js

# Run tests matching pattern
npx jest --testNamePattern="should prevent duplicate ratings"
```

## Test Structure

```
tests/
├── setup.js                          # Global test configuration
├── backend/
│   ├── api/
│   │   ├── health.test.js           # Health endpoint tests
│   │   └── ratings.test.js          # Rating API tests (13 tests)
│   ├── database/
│   │   └── db.test.js               # Database schema tests (15 tests)
│   └── utils/
│       └── ip-detection.test.js     # IP detection tests (10 tests)
├── frontend/
│   ├── utils/
│   │   ├── time-format.test.js      # Time formatting tests (8 tests)
│   │   └── song-id.test.js          # Song ID generation tests (15 tests)
│   └── metadata/
│       └── quality-parsing.test.js  # Quality parsing tests (20 tests)
└── integration/
    └── rating-flow.test.js          # End-to-end tests (6 tests)
```

**Total: 87+ tests**

## Test Categories

### Backend Tests

#### Database Tests (`tests/backend/database/db.test.js`)
Tests database schema, constraints, and data integrity:
- Table creation
- UNIQUE constraints (email, song_id+user_id)
- CHECK constraints (rating must be 1 or -1)
- NOT NULL constraints
- Auto-increment behavior
- Vote counting logic

#### API Tests (`tests/backend/api/`)
Tests HTTP endpoints and responses:
- Health check endpoint
- Rating retrieval (GET /api/ratings/:songId)
- Rating submission (POST /api/ratings)
- Duplicate prevention (409 responses)
- Input validation (400 responses)
- Error handling (500 responses)

#### Utility Tests (`tests/backend/utils/ip-detection.test.js`)
Tests IP address extraction:
- x-forwarded-for header parsing
- x-real-ip header fallback
- Multiple IP handling
- IPv4 and IPv6 support
- Header priority order

### Frontend Tests

#### Utility Tests (`tests/frontend/utils/`)
Tests helper functions:
- Time formatting (M:SS format)
- Song ID generation from artist + title
- Special character handling
- Case normalization

#### Metadata Tests (`tests/frontend/metadata/`)
Tests metadata parsing:
- Quality string parsing
- Hz to kHz conversion
- Bit depth extraction
- Fallback values
- Common audio formats (CD, DVD, Hi-Res)

### Integration Tests

#### Rating Flow (`tests/integration/rating-flow.test.js`)
Tests complete user workflows:
- Full rating lifecycle (check → rate → verify)
- Multiple users rating same song
- Song change scenarios
- Concurrent rating handling
- Error recovery
- Data integrity

## Writing Tests

### Backend Test Example
```javascript
const request = require('supertest');
const app = require('./app'); // Your Express app

describe('API Endpoint', () => {
  test('should return expected response', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .set('x-forwarded-for', '192.168.1.1');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });
});
```

### Frontend Test Example
```javascript
/**
 * @jest-environment jsdom
 */

function myFunction(input) {
  return input.toUpperCase();
}

describe('Function', () => {
  test('should transform input', () => {
    expect(myFunction('hello')).toBe('HELLO');
  });
});
```

## Coverage Goals

Target coverage thresholds (configured in jest.config.js):
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Use `beforeEach`/`afterEach` for setup/teardown
3. **Descriptive Names**: Test names should clearly describe what they test
4. **Arrange-Act-Assert**: Structure tests in three clear sections
5. **Mock External Dependencies**: Use in-memory database for tests
6. **Test Edge Cases**: Include invalid inputs, boundary conditions
7. **Test Error Paths**: Verify error handling works correctly

## Common Issues

### Tests Timeout
Increase timeout in jest.config.js or individual test:
```javascript
test('slow test', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Database Locked
Ensure proper cleanup in afterEach:
```javascript
afterEach(() => {
  if (db) {
    db.close();
  }
});
```

### Port Already in Use
Tests use port 3001 (configured in tests/setup.js) to avoid conflicts with development server on port 3000.

## Continuous Integration

Tests can be integrated with GitHub Actions:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## Debugging Tests

### Run Tests in Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### View Detailed Output
```bash
npm test -- --verbose
```

### Run Single Test
```bash
npm test -- --testNamePattern="specific test name"
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Library](https://testing-library.com/)
