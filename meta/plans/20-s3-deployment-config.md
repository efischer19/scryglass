# Ticket 20: AWS S3 Deployment Configuration

## What do you want to build?

Configure the existing `.github/workflows/deploy-aws.yml` workflow for Scryglass deployment and document the "turnkey" setup process. The workflow must build the `@scryglass/pwa` package with Vite and deploy the resulting `packages/pwa/dist/` directory to S3. The goal is a deployment pipeline where a maintainer only needs to provide IAM role/credentials and an S3 bucket path to go live.

## Acceptance Criteria

- [ ] The existing `deploy-aws.yml` workflow includes a build step that runs `npm ci && npm run build` at the repository root (npm workspaces build both packages)
- [ ] The workflow deploys the `packages/pwa/dist/` directory (Vite's build output) to the S3 bucket root
- [ ] A deployment documentation section is added to `README.md` (or a dedicated `docs-src/deployment.md`) with step-by-step instructions
- [ ] The documentation clearly lists the required AWS resources: S3 bucket, CloudFront distribution, GitHub OIDC identity provider, IAM role
- [ ] The documentation lists the required GitHub repository variables: `AWS_ROLE_ARN`, `AWS_REGION`, `S3_BUCKET_NAME`, `CLOUDFRONT_DISTRIBUTION_ID`
- [ ] The documentation includes the IAM policy JSON needed for the deploy role (S3 put, CloudFront invalidate)
- [ ] The workflow is configured to deploy automatically on push to `main` (in addition to the existing `workflow_dispatch` trigger)
- [ ] The workflow sets appropriate `Cache-Control` headers: long cache for Vite's hashed assets in `dist/assets/`, short cache for `index.html` and `sw.js`
- [ ] The workflow invalidates the CloudFront distribution after deploy
- [ ] A smoke test step is added (optional): after deploy, curl the CloudFront URL and verify a 200 response
- [ ] The deployment documentation is complete enough that a new maintainer can go from zero to deployed by following the steps

## Implementation Notes (Optional)

The template already includes `deploy-aws.yml` with OIDC authentication — the heavy lifting is done. This ticket is primarily about:

1. Adding the `npm ci && npm run build` step before deployment
2. Updating the deploy source from `src/` to `packages/pwa/dist/`
3. Adding the `push` trigger to `main`
4. Setting cache headers that leverage Vite's content-hashed filenames
5. Writing clear, complete deployment documentation

Vite produces content-hashed filenames for all assets under `dist/assets/` (e.g., `index-abc123.js`, `style-def456.css`). These are safe to cache aggressively because a new hash means a new URL. Only `index.html` and `sw.js` sit at the root with stable names and need short cache TTLs.

The S3 sync commands should use:

```bash
# Build the monorepo (installs deps, builds @scryglass/core, then @scryglass/pwa)
npm ci
npm run build

# Sync Vite output — hashed assets get long cache
aws s3 sync packages/pwa/dist/ s3://$BUCKET_NAME/ \
  --delete \
  --cache-control "max-age=31536000" \
  --exclude "index.html" \
  --exclude "sw.js"

# Upload index.html and sw.js with short cache
aws s3 cp packages/pwa/dist/index.html s3://$BUCKET_NAME/index.html \
  --cache-control "max-age=60"
aws s3 cp packages/pwa/dist/sw.js s3://$BUCKET_NAME/sw.js \
  --cache-control "max-age=60"
```

**References:** Existing `deploy-aws.yml` workflow, Ticket 19 (Service Worker — `sw.js` needs short cache), [ADR-007](../adr/ADR-007-monorepo_structure.md) (Monorepo Structure)
