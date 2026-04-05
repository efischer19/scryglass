# AWS Deployment Guide

This guide walks through deploying Scryglass to **Amazon S3 + CloudFront** using
the GitHub Actions workflow in `.github/workflows/deploy-aws.yml`.

By the end of this guide you will have a production deployment that:

- Builds both `@scryglass/core` and `@scryglass/pwa` in CI
- Uploads the Vite build output to an S3 bucket
- Serves the site through CloudFront with proper cache headers
- Deploys automatically on every push to `main`

---

## Prerequisites

- An **AWS account** with permissions to create the resources below
- A **GitHub repository** (fork or clone of Scryglass)
- The [AWS CLI](https://aws.amazon.com/cli/) installed locally (helpful for
  verification, not strictly required)

---

## Step 1 — Create an S3 Bucket

1. Open the [S3 console](https://s3.console.aws.amazon.com/s3/) and create a new
   bucket (e.g. `scryglass-prod`).
2. **Block all public access** — CloudFront will serve the files; the bucket does
   not need to be public.
3. Enable **static website hosting** under the bucket properties (set the index
   document to `index.html`). This is optional when using CloudFront with an
   Origin Access Control, but useful for debugging.

---

## Step 2 — Create a CloudFront Distribution

1. Open the [CloudFront console](https://console.aws.amazon.com/cloudfront/) and
   create a new distribution.
2. Set the **origin** to the S3 bucket created above. Use an **Origin Access
   Control (OAC)** so CloudFront can read from the private bucket.
3. Set the **default root object** to `index.html`.
4. Under **Error pages**, add a custom error response for HTTP 403 and 404 that
   returns `/index.html` with status 200. This enables client-side routing.
5. Note the **Distribution ID** and **domain name** (e.g.
   `d1234567890abc.cloudfront.net`) — you will need both later.

---

## Step 3 — Create a GitHub OIDC Identity Provider in AWS

This lets GitHub Actions assume an IAM role without long-lived credentials.

1. Open the [IAM console → Identity providers](https://console.aws.amazon.com/iam/home#/providers).
2. Click **Add provider** → **OpenID Connect**.
3. Set:
   - **Provider URL:** `https://token.actions.githubusercontent.com`
   - **Audience:** `sts.amazonaws.com`
4. Click **Add provider**.

---

## Step 4 — Create an IAM Role for Deployment

1. In the IAM console, create a new role.
2. Choose **Web identity** as the trusted entity, select the GitHub OIDC provider
   created above, and set the audience to `sts.amazonaws.com`.
3. Add a **trust policy condition** that restricts the role to your repository and
   branch. Replace `YOUR_ORG/YOUR_REPO` with your GitHub owner/repo:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
           },
           "StringLike": {
             "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/main"
           }
         }
       }
     ]
   }
   ```

4. Attach an inline policy (or managed policy) granting the minimum permissions
   needed to deploy. Replace `YOUR_BUCKET_NAME` and `YOUR_DISTRIBUTION_ID`:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "S3Deploy",
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::YOUR_BUCKET_NAME",
           "arn:aws:s3:::YOUR_BUCKET_NAME/*"
         ]
       },
       {
         "Sid": "CloudFrontInvalidate",
         "Effect": "Allow",
         "Action": "cloudfront:CreateInvalidation",
         "Resource": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
       }
     ]
   }
   ```

5. Note the **Role ARN** (e.g. `arn:aws:iam::123456789012:role/scryglass-deploy`).

---

## Step 5 — Configure GitHub Repository Variables

In your repository, go to **Settings → Secrets and variables → Actions →
Variables** and add:

| Variable                       | Description                               | Example                                          |
| :----------------------------- | :---------------------------------------- | :------------------------------------------------|
| `AWS_ROLE_ARN`                 | ARN of the IAM deploy role                | `arn:aws:iam::123456789012:role/scryglass-deploy`|
| `AWS_REGION`                   | AWS region of the S3 bucket               | `us-east-1`                                      |
| `S3_BUCKET_NAME`               | Name of the S3 bucket                     | `scryglass-prod`                                 |
| `CLOUDFRONT_DISTRIBUTION_ID`   | CloudFront distribution ID                | `E1234567890ABC`                                 |
| `CLOUDFRONT_DOMAIN` (optional) | CloudFront domain for the smoke test step | `d1234567890abc.cloudfront.net`                  |

!!! note
    These are **repository variables** (not secrets). They are not sensitive
    because the OIDC trust policy already restricts who can assume the role.

---

## Step 6 — Deploy

Deployments happen automatically on push to `main`. You can also trigger a deploy
manually:

1. Go to **Actions → Deploy to AWS (S3 + CloudFront)**.
2. Click **Run workflow** → select the `main` branch → **Run workflow**.

---

## How the Workflow Works

The workflow (`.github/workflows/deploy-aws.yml`) runs these steps:

1. **Checkout** the repository.
2. **Install dependencies** with `npm ci` (npm workspaces resolve both packages).
3. **Build** with `npm run build` (compiles `@scryglass/core` then builds
   `@scryglass/pwa` with Vite, producing `packages/pwa/dist/`).
4. **Configure AWS credentials** via GitHub OIDC (no stored secrets needed).
5. **Sync to S3** with differentiated cache headers:
   - `dist/assets/*` (Vite's hashed files) → `Cache-Control: public,
     max-age=31536000, immutable` (1 year — safe because filenames change on
     every build)
   - `index.html` → `Cache-Control: public, max-age=60, s-maxage=300` (short
     browser cache, slightly longer CDN cache)
   - `sw.js` → `Cache-Control: public, max-age=0, must-revalidate` (always
     re-validate so users get service worker updates immediately)
6. **Invalidate CloudFront** so edge caches serve the new content.
7. **Smoke test** (optional) — if `CLOUDFRONT_DOMAIN` is set, curl the site and
   verify a 200 response.

---

## Troubleshooting

### "Not authorized to perform sts:AssumeRoleWithWebIdentity"

- Verify the OIDC provider URL and audience in IAM match exactly.
- Check the trust policy `sub` condition matches your repo and branch.

### "Access Denied" during S3 sync

- Ensure the IAM policy includes `s3:ListBucket` on the bucket ARN (not just
  `s3:*Object` on the objects).
- Confirm the bucket name in the GitHub variable matches the actual bucket.

### CloudFront still serving old content

- The workflow creates an invalidation on every deploy. Propagation takes 1-2
  minutes. Wait and retry.
- For debugging, check the invalidation status in the CloudFront console.

### Smoke test is skipped

- The smoke test only runs when the `CLOUDFRONT_DOMAIN` variable is set. Add it
  to your repository variables if you want the check.
