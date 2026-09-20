# GitHub Actions CI/CD Setup Guide

## Files Created

| File | Purpose | Destination |
|------|---------|-------------|
| `greensheet-ci-test.yml` | Lint & unit tests | `.github/workflows/test.yml` |
| `greensheet-ci-docker-build.yml` | Docker build & push | `.github/workflows/docker-build.yml` |
| `greensheet-ci-deploy.yml` | Deployment notification | `.github/workflows/deploy.yml` |
| `greensheet-docker-compose.prod.yml` | Production overrides | `app/docker-compose.prod.yml` |
| `greensheet-deploy.sh` | Deploy script | `deploy.sh` |

## Quick Setup

### Step 1: Create Workflow Directory
```bash
cd greensheet
mkdir -p .github/workflows
```

### Step 2: Copy Workflow Files
```bash
cp greensheet-ci-test.yml .github/workflows/test.yml
cp greensheet-ci-docker-build.yml .github/workflows/docker-build.yml
cp greensheet-ci-deploy.yml .github/workflows/deploy.yml
cp greensheet-docker-compose.prod.yml app/docker-compose.prod.yml
cp greensheet-deploy.sh deploy.sh
chmod +x deploy.sh
```

### Step 3: Commit & Push
```bash
git add .github/ app/docker-compose.prod.yml deploy.sh
git commit -m "ci: add GitHub Actions workflows"
git push origin main
```

## Workflow Triggers & Behavior

### 1. **test.yml** — Runs on every PR and push to main
```
PR open/updated → test.yml runs → status shown on PR
↓
Passes: ✅ Show green checkmark
Fails: ❌ Block merge
```

**Steps:**
- Lint with oxlint
- Unit tests with vitest
- Docker build test (no registry push)

### 2. **docker-build.yml** — Runs after merge to main
```
git push main → docker-build.yml runs → builds 2 images in parallel
↓
app (frontend) → ghcr.io/marcusdax/greensheet-app:latest
proxy (backend) → ghcr.io/marcusdax/greensheet-proxy:latest
↓
Tags:
  - latest (main branch)
  - main-<git-sha> (for rollback)
  - v1.0.0 (if tagged)
↓
Security scan: Trivy → GitHub Security tab
```

### 3. **deploy.yml** — Notification after docker-build succeeds
```
docker-build.yml succeeds → deploy.yml runs
↓
Logs: "Deployment ready for production"
Prints manual deployment instructions
Creates GitHub Deployment record (optional)
```

## Image Locations

After successful build, images are available at:

```bash
# Frontend (Vite + Nginx)
ghcr.io/marcusdax/greensheet-app:latest
ghcr.io/marcusdax/greensheet-app:main-a1b2c3d

# Backend (Express proxy)
ghcr.io/marcusdax/greensheet-proxy:latest
ghcr.io/marcusdax/greensheet-proxy:main-a1b2c3d
```

## Local Testing (Before Pushing)

### Test workflows locally with act
```bash
# Install act: https://github.com/nektos/act

# Run test workflow
act push -j lint

# Run docker-build simulation
act push -j build -s GITHUB_TOKEN=<your-token>
```

### Or manually verify:
```bash
# Test build
cd app
npm run lint
npm run test:run
docker build -f Dockerfile.app --target prod -t greensheet-app:test .
docker build -f Dockerfile.proxy --target prod -t greensheet-proxy:test .
```

## Production Deployment

### Option A: Manual SSH Deploy
```bash
ssh user@production.server
cd /opt/greensheet
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Option B: Use Deploy Script
```bash
# On production server
./deploy.sh production

# Verify
docker compose ps
curl http://localhost:8080
curl http://localhost:3001/health
```

### Option C: Automated Deployment (Advanced)
Integrate with:
- **ArgoCD**: GitOps-based continuous delivery
- **Keel**: Automatic image update on new tags
- **Flux**: Pull-based GitOps operator

Example with Keel:
```yaml
# Add to docker-compose.prod.yml
services:
  app:
    image: ghcr.io/marcusdax/greensheet-app:latest
    labels:
      keel: enabled  # Keel watches for new images
      keel.policy: 'force' # Always update
```

## Monitoring

### GitHub Actions Dashboard
- Go to: `https://github.com/marcusdax/greensheet/actions`
- View all workflow runs
- Check individual job logs
- Troubleshoot failures

### Security Scanning
- Go to: `https://github.com/marcusdax/greensheet/security`
- View Trivy scan results
- Check vulnerability severity
- Track remediation

### Image Registry
- Go to: `https://github.com/marcusdax/greensheet/pkgs/container/`
- View all pushed images
- Check tags and layers
- Delete old images

## Secrets & Configuration

### No secrets required by default
- `GITHUB_TOKEN` is auto-generated (read-only by default, but Actions gets write access)

### Optional: Docker Hub Integration
Add to GitHub repo settings → Secrets:
```
DOCKERHUB_USERNAME=your_username
DOCKERHUB_TOKEN=your_pat_token
```

Then update docker-build.yml login step to Docker Hub.

### Optional: Slack Notifications
Add workflow step:
```yaml
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Build ${{ job.status }}'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Tagging & Versioning

### Automatic semantic versions
Add Git tags to trigger release builds:
```bash
git tag v1.0.0
git push origin v1.0.0
```

Tags are automatically picked up and create images:
- `ghcr.io/marcusdax/greensheet-app:v1.0.0`
- `ghcr.io/marcusdax/greensheet-app:1.0`
- `ghcr.io/marcusdax/greensheet-app:1`

## Troubleshooting

### Workflow not triggering
- Check branch: workflows run on `main` (not `master`)
- Verify file paths in `on.push.paths` filter
- Manually trigger: Actions tab → workflow name → Run workflow

### Build fails with "merge conflicts"
- Run `npm run test:run` locally to find TypeScript errors
- Resolve in editor
- Push fix and re-trigger

### Image not pushed to GHCR
- Check: repo is public or org has GHCR enabled
- Verify: `secrets.GITHUB_TOKEN` is available
- Check permissions in `.github/workflows/docker-build.yml` — needs `packages: write`

### Trivy scan reports vulnerabilities
- Review GitHub Security tab for details
- Update base images: `node:22-alpine`, `nginx:alpine`
- Suppress false positives in `.trivyignore` file

## Next Steps

1. ✅ Copy workflow files to `.github/workflows/`
2. ✅ Commit and push to GitHub
3. ✅ Create a PR to test workflows
4. ✅ Merge PR to trigger docker-build
5. ✅ Verify images in GitHub Packages
6. ✅ Deploy to production using deploy.sh or manual step
7. ✅ Monitor GitHub Actions dashboard
8. ✅ Set up Slack notifications (optional)
9. ✅ Integrate with ArgoCD or Keel for auto-deployment (optional)

## References

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Trivy Vulnerability Scanner](https://github.com/aquasecurity/trivy-action)
- [Metadata Action](https://github.com/docker/metadata-action)
- [GHCR Docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
