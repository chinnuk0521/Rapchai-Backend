# 🚀 Vercel CI/CD Deployment Guide

This document provides comprehensive instructions for setting up and using the automated CI/CD pipeline for deploying the Rapchai Backend to Vercel.

## 📋 Quick Start

### Prerequisites

1. **Vercel Account**: [Sign up at vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Vercel Project**: Create a project in Vercel (connected to your GitHub repo)

### Required GitHub Secrets

Add these secrets in: **GitHub Repository → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Where to Find It | Description |
|------------|-----------------|-------------|
| `VERCEL_TOKEN` | [Vercel Account Settings → Tokens](https://vercel.com/account/tokens) | Click "Create Token", copy the token |
| `VERCEL_ORG_ID` | Vercel Dashboard → Project → Settings → General | Found in "Organization ID" section |
| `VERCEL_PROJECT_ID` | Vercel Dashboard → Project → Settings → General | Found in "Project ID" section |
| `VERCEL_PROJECT_DOMAIN` | Vercel Dashboard → Project → Settings → Domains | Your project domain (optional, for health checks) |

### Required Vercel Environment Variables

Configure these in: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add all variables from `env.example` file:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - At least 32 characters
- `JWT_REFRESH_SECRET` - At least 32 characters
- `NODE_ENV` - `production` for production environment
- All other required environment variables

## 🔄 Deployment Workflow

### Automatic Deployment

The pipeline automatically runs on:

1. **Production Deployment**:
   - Trigger: Push to `main` branch
   - Environment: Production
   - URL: Your production Vercel domain

2. **Preview Deployment**:
   - Trigger: Push to any branch except `main`
   - Environment: Preview
   - URL: Unique preview URL per branch

### Pipeline Steps

```
┌─────────────────────────────────┐
│  1. Pre-Deployment Checks        │
│  ✓ TypeScript type check        │
│  ✓ ESLint validation           │
│  ✓ Prettier formatting          │
│  ✓ Unit tests                   │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│  2. Build Verification          │
│  ✓ Prisma client generation    │
│  ✓ TypeScript compilation       │
│  ✓ Build output validation      │
│  ✓ Vercel config check          │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│  3. Deployment                  │
│  ✓ Production (main branch)     │
│  ✓ Preview (other branches)      │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│  4. Health Check                │
│  ✓ API health endpoint          │
└─────────────────────────────────┘
```

## 🎯 Manual Deployment

### Via GitHub Actions UI

1. Go to your GitHub repository
2. Click on **"Actions"** tab
3. Select **"Deploy Backend to Vercel"** workflow
4. Click **"Run workflow"** button
5. Choose options:
   - **Environment**: `production` or `preview`
   - **Skip tests**: `false` (recommended)
6. Click **"Run workflow"**

### Via Command Line

```bash
# Trigger production deployment
git push origin main

# Trigger preview deployment
git push origin your-feature-branch
```

## ✅ Verification Checklist

Before deploying, ensure:

- [ ] All GitHub secrets are configured (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`)
- [ ] All environment variables are set in Vercel dashboard
- [ ] `package.json` has correct build scripts
- [ ] `vercel.json` is properly configured
- [ ] `.vercelignore` excludes unnecessary files
- [ ] Tests pass locally: `npm test`
- [ ] Build works locally: `npm run build`

## 🔍 Monitoring Deployments

### View Deployment Status

1. **GitHub Actions**: 
   - Go to **Actions** tab
   - Click on latest workflow run
   - View step-by-step execution logs

2. **Vercel Dashboard**:
   - Go to **Deployments** tab
   - View deployment history and logs
   - Check build logs

### Health Checks

After deployment, verify the API is working:

```bash
# Production health check
curl https://your-domain.vercel.app/api/health

# Preview health check
curl https://your-preview-url.vercel.app/api/health
```

Expected response: `200 OK` with JSON health status

## 🐛 Troubleshooting

### Common Issues

#### 1. "VERCEL_TOKEN is invalid"
**Solution**: Generate a new token from Vercel account settings

#### 2. "Build failed: TypeScript errors"
**Solution**: 
- Run `npm run type-check` locally
- Fix all TypeScript errors
- Commit and push again

#### 3. "Tests failed"
**Solution**:
- Run `npm test` locally
- Fix failing tests
- Or temporarily skip tests (not recommended) in manual trigger

#### 4. "Prisma client not generated"
**Solution**:
- Check `prisma/schema.prisma` exists
- Verify `prisma generate` runs successfully
- Check Prisma version compatibility

#### 5. "Environment variable missing"
**Solution**:
- Check Vercel Dashboard → Settings → Environment Variables
- Ensure all required vars from `env.example` are set
- Redeploy after adding variables

#### 6. "dist/ folder not found"
**Solution**:
- Verify `tsconfig.json` has `"outDir": "./dist"`
- Run `npm run build` locally
- Check `package.json` build script

## 📊 Deployment History

View deployment history:
- **GitHub**: Actions tab → Workflow runs
- **Vercel**: Dashboard → Deployments

## 🔐 Security Best Practices

1. **Never commit secrets**: All sensitive data should be in GitHub Secrets
2. **Use environment-specific vars**: Different values for production/preview
3. **Rotate tokens regularly**: Update `VERCEL_TOKEN` periodically
4. **Review deployments**: Always check deployment logs for unexpected changes

## 🚨 Rollback Procedure

If a deployment fails or needs rollback:

1. **Via Vercel Dashboard**:
   - Go to Deployments → Select previous successful deployment
   - Click "Promote to Production"

2. **Via GitHub**:
   - Revert the problematic commit
   - Push to main branch
   - Pipeline will deploy the reverted version

## 📝 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## 💡 Tips

1. **Test locally first**: Always run `npm test` and `npm run build` before pushing
2. **Use preview deployments**: Test changes in preview before merging to main
3. **Monitor health checks**: Set up alerts for failed health checks
4. **Keep dependencies updated**: Regularly update `package.json` dependencies
5. **Review build logs**: Check Vercel build logs for optimization opportunities

---

**Last Updated**: 2025-01-29
**Maintained by**: Rapchai Team

