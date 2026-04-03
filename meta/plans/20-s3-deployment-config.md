# Ticket 20: AWS S3 Deployment Configuration

## What do you want to build?

Configure the existing `.github/workflows/deploy-aws.yml` workflow for Scryglass deployment and document the "turnkey" setup process. The goal is a deployment pipeline where a maintainer only needs to provide IAM role/credentials and an S3 bucket path to go live.

## Acceptance Criteria

- [ ] The existing `deploy-aws.yml` workflow is reviewed and confirmed to work with the `src/` directory structure
- [ ] A deployment documentation section is added to `README.md` (or a dedicated `docs-src/deployment.md`) with step-by-step instructions
- [ ] The documentation clearly lists the required AWS resources: S3 bucket, CloudFront distribution, GitHub OIDC identity provider, IAM role
- [ ] The documentation lists the required GitHub repository variables: `AWS_ROLE_ARN`, `AWS_REGION`, `S3_BUCKET_NAME`, `CLOUDFRONT_DISTRIBUTION_ID`
- [ ] The documentation includes the IAM policy JSON needed for the deploy role (S3 put, CloudFront invalidate)
- [ ] The workflow is configured to deploy automatically on push to `main` (in addition to the existing `workflow_dispatch` trigger)
- [ ] The workflow syncs the `src/` directory to the S3 bucket root
- [ ] The workflow sets appropriate `Cache-Control` headers: long cache for assets (CSS, JS, images), short cache for `index.html` and `sw.js`
- [ ] The workflow invalidates the CloudFront distribution after deploy
- [ ] A smoke test step is added (optional): after deploy, curl the CloudFront URL and verify a 200 response
- [ ] The deployment documentation is complete enough that a new maintainer can go from zero to deployed by following the steps

## Implementation Notes (Optional)

The template already includes `deploy-aws.yml` with OIDC authentication — the heavy lifting is done. This ticket is primarily about:

1. Verifying the workflow works with Scryglass's file structure
2. Adding the `push` trigger to `main`
3. Setting appropriate cache headers in the S3 sync command
4. Writing clear, complete deployment documentation

The S3 sync command should use:

```bash
aws s3 sync src/ s3://$BUCKET_NAME/ \
  --delete \
  --cache-control "max-age=31536000" \
  --exclude "index.html" \
  --exclude "sw.js"

# Upload index.html and sw.js with short cache
aws s3 cp src/index.html s3://$BUCKET_NAME/index.html \
  --cache-control "max-age=60"
aws s3 cp src/sw.js s3://$BUCKET_NAME/sw.js \
  --cache-control "max-age=60"
```

**References:** Existing `deploy-aws.yml` workflow, Ticket 19 (Service Worker — `sw.js` needs short cache)
