# Vercel Deployment Setup

This document provides instructions for setting up CI/CD with GitHub Actions and Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Vercel CLI**: Install globally with `npm i -g vercel`

## Setup Instructions

### 1. Link Project to Vercel

```bash
# In your project directory
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name: git-branch-graph (or your preferred name)
# - Directory: ./
# - Override settings? No
```

### 2. Get Vercel Credentials

After linking, get your project credentials:

```bash
# Get your Vercel project info
vercel env ls

# Or check your .vercel/project.json file
cat .vercel/project.json
```

### 3. Set GitHub Secrets

Go to your GitHub repository settings → Secrets and variables → Actions, and add:

#### Required Secrets:

- **`VERCEL_TOKEN`**: 
  - Go to [Vercel Settings → Tokens](https://vercel.com/account/tokens)
  - Create new token
  - Copy the token value

- **`VERCEL_ORG_ID`**: 
  - Found in `.vercel/project.json` as `"orgId"`
  - Or in your Vercel dashboard URL

- **`VERCEL_PROJECT_ID`**: 
  - Found in `.vercel/project.json` as `"projectId"`
  - Or in your project settings

### 4. Environment Variables (Optional)

If your app uses environment variables, add them in Vercel dashboard:

1. Go to your project in Vercel dashboard
2. Settings → Environment Variables
3. Add variables like:
   - `NEXT_PUBLIC_GITHUB_TOKEN` (if you want a default token)

### 5. Deploy

Push to your main branch:

```bash
git add .
git commit -m "Add CI/CD pipeline"
git push origin main
```

The GitHub Action will automatically:
1. ✅ Install dependencies
2. ✅ Run type checking
3. ✅ Run linting
4. ✅ Build the project
5. ✅ Deploy to Vercel

## GitHub Actions Workflow

The workflow (`.github/workflows/deploy.yml`) includes:

- **Node.js 18** setup with pnpm caching
- **Quality checks**: TypeScript + ESLint
- **Build process** with production optimizations
- **Vercel deployment** for production

## Troubleshooting

### Build Issues on Windows

If you encounter permission errors during build:

```bash
# Clean build
pnpm run build:clean

# Or manually clean
rimraf .next
pnpm run build
```

### Missing Secrets

If deployment fails with authentication errors:
1. Double-check all GitHub secrets are set correctly
2. Ensure Vercel token has proper permissions
3. Verify project is linked correctly with `vercel ls`

### Build Fails

Check the GitHub Actions logs for specific errors:
1. Go to your repository
2. Click "Actions" tab
3. Click on the failed workflow
4. Expand the failing step

## Manual Deployment

For manual deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Project URLs

After successful deployment:
- **Production**: `https://your-project.vercel.app`
- **Preview**: Automatic preview deployments for PRs

---

**Note**: Make sure your `vercel.json` configuration is compatible with Next.js 15 and your build setup.