# GitHub Actions Workflows

This directory contains automated CI/CD workflows for Radio Calico.

## Workflows

### CI/CD Pipeline (`ci.yml`)

Comprehensive continuous integration pipeline that runs on every push and pull request.

**Jobs:**

1. **test** - Unit and Integration Tests
   - Runs all test suites (backend, frontend, integration)
   - Generates code coverage reports
   - Uploads coverage to Codecov
   - Uploads test artifacts
   - **Triggers**: All pushes and PRs
   - **Fails on**: Test failures

2. **security** - Security Audit
   - Runs npm audit on production dependencies (moderate level)
   - Runs npm audit on all dependencies (moderate level, warning only)
   - Checks for high/critical vulnerabilities (fails build)
   - Generates security report summary
   - **Triggers**: All pushes and PRs
   - **Fails on**: High/critical vulnerabilities in production

3. **lint** - Code Quality Checks
   - Checks for outdated dependencies
   - Lists dependency tree
   - **Triggers**: All pushes and PRs
   - **Fails on**: Never (informational only)

4. **build** - Docker Image Build
   - Builds multi-platform Docker images (amd64, arm64)
   - Pushes to GitHub Container Registry
   - Scans with Trivy for vulnerabilities
   - Uploads security scan results
   - **Triggers**: After test and security jobs pass
   - **Fails on**: Build errors or critical container vulnerabilities

**Workflow Visualization:**

```
Push/PR
  │
  ├─▶ test ────┐
  ├─▶ security ┼─▶ build ──▶ Push to ghcr.io (main only)
  └─▶ lint ────┘
```

### Docker Build (`docker-build.yml`)

Legacy workflow for building and pushing Docker images. This workflow is kept for compatibility but most functionality has been moved to `ci.yml`.

**Note**: Consider using `ci.yml` for all CI/CD operations.

## Setup Instructions

### Required Secrets

None required for basic functionality. Optional secrets:

- `CODECOV_TOKEN` - For uploading coverage reports to Codecov.io

### Branch Protection

Recommended branch protection rules for `main`:

1. Require status checks to pass:
   - `test`
   - `security`
   - `lint`

2. Require pull request reviews before merging

3. Require linear history

### Badges

Add workflow status badges to your README:

```markdown
[![CI/CD Pipeline](https://github.com/VIVEK-JADHAV/radio-calico/actions/workflows/ci.yml/badge.svg)](https://github.com/VIVEK-JADHAV/radio-calico/actions/workflows/ci.yml)
```

## Local Testing

Test workflows locally before pushing:

```bash
# Run tests
make test
make test-coverage

# Run security audit
make security
make audit

# Build Docker image
make docker-build
```

## Debugging Failed Workflows

### Test Failures

```bash
# Run specific test suite locally
make test-backend
make test-frontend
make test-integration

# View detailed output
npm test -- --verbose
```

### Security Failures

```bash
# Check for vulnerabilities
make audit

# See detailed report
npm audit

# Attempt to fix
make audit-fix
```

### Build Failures

```bash
# Test Docker build locally
make docker-build

# Check logs
make docker-logs
```

## Workflow Outputs

### Test Job
- **Artifacts**: Test results and coverage reports (30-day retention)
- **Coverage**: Uploaded to Codecov (if token configured)

### Security Job
- **Summary**: Security audit report in GitHub Actions summary
- **Status**: Pass/fail based on vulnerability severity

### Build Job
- **Images**: Multi-platform Docker images in GHCR
- **Security Scan**: Trivy results uploaded to GitHub Security tab
- **Summary**: Build details in GitHub Actions summary

## Permissions

The workflows require the following permissions:

- `contents: read` - Checkout code
- `packages: write` - Push Docker images to GHCR
- `security-events: write` - Upload security scan results

These are automatically provided by GitHub Actions.

## Optimization

### Caching

Workflows use caching to speed up builds:
- npm cache (via `actions/setup-node@v4`)
- Docker layer cache (via `type=gha`)

### Parallel Execution

The `test`, `security`, and `lint` jobs run in parallel to reduce total workflow time.

## Customization

### Change Node.js Version

Edit the `NODE_VERSION` environment variable in `ci.yml`:

```yaml
env:
  NODE_VERSION: '20'
```

### Adjust Security Thresholds

Change audit levels in the security job:

```yaml
- name: Run npm audit (production)
  run: npm audit --production --audit-level=high  # was: moderate
```

### Add More Test Jobs

Add additional test configurations:

```yaml
test:
  strategy:
    matrix:
      node-version: [18, 20, 22]
```

## Maintenance

- Review and update GitHub Actions versions quarterly
- Monitor for deprecated actions
- Update Node.js version when LTS changes
- Review security audit thresholds regularly
