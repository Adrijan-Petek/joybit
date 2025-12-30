# GitHub Wiki Auto-Publish Setup Guide

## Overview
This guide helps you set up automatic publishing of your `docs/` folder to GitHub Wiki whenever documentation changes are pushed to the main branch.

## Prerequisites

### 1. Enable Wikis for Your Repository
1. Go to your repository: https://github.com/Adrijan-Petek/joybit
2. Click **Settings** tab
3. Scroll to **Features** section
4. ✅ Check "Wikis"
5. Click **Save**

### 2. Create Your First Wiki Page
1. Click **Wiki** tab in your repository
2. If prompted, create the first wiki page (can be empty)
3. This initializes the wiki repository

### 3. Generate Personal Access Token
1. Go to https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. **Note**: `Wiki Auto-Publish Token`
4. **Expiration**: Choose appropriate timeframe
5. **Scopes**: Check `repo` (full control of private repositories)
6. Click **Generate token**
7. ⚠️ **Copy the token immediately** (you won't see it again!)

### 4. Add Repository Secret
1. Go to repository: https://github.com/Adrijan-Petek/joybit
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. **Name**: `GH_PERSONAL_ACCESS_TOKEN`
5. **Value**: Paste your personal access token
6. Click **Add secret**

## How It Works

### Automatic Publishing
- Triggers on pushes to `main` branch that modify `docs/` files
- Can also be triggered manually via GitHub Actions UI
- Publishes all `.md` files from `docs/` to your wiki

### Workflow File
Located at: `.github/workflows/wiki-publish.yml`

```yaml
name: Publish Documentation to Wiki
on:
  push:
    branches: [ main ]
    paths:
      - 'docs/**'  # Only runs when docs change
  workflow_dispatch:  # Manual trigger
```

## Testing the Setup

### Manual Trigger
1. Go to **Actions** tab in your repository
2. Click **"Publish Documentation to Wiki"** workflow
3. Click **"Run workflow"** button
4. Check the logs for success/failure

### Verify Wiki Updates
1. Click **Wiki** tab in your repository
2. You should see your documentation pages
3. Check that all `docs/` files are published

## Troubleshooting

### Common Issues

#### ❌ "GH_PERSONAL_ACCESS_TOKEN not found"
- Check that the secret is named exactly `GH_PERSONAL_ACCESS_TOKEN`
- Verify the token has `repo` scope
- Ensure token hasn't expired

#### ❌ "Wiki repository not found"
- Make sure wiki is enabled in repository settings
- Create at least one wiki page manually first

#### ❌ "Permission denied"
- Verify the personal access token has `repo` scope
- Check that the token wasn't revoked

#### ❌ Workflow doesn't trigger
- Check that changes are pushed to `main` branch
- Verify that `docs/` files were actually modified
- Check workflow trigger paths in `.github/workflows/wiki-publish.yml`

### Debug Steps
1. Check **Actions** tab for workflow runs
2. Click on failed runs to see detailed logs
3. Look for error messages in the "Publish Documentation to Wiki" step

## Benefits

✅ **Dual Publishing**: Docs in main repo + Wiki interface  
✅ **Automatic**: No manual wiki updates needed  
✅ **Version Controlled**: All changes tracked in git  
✅ **User Friendly**: Wiki interface for casual readers  
✅ **Developer Friendly**: Local editing with full git workflow  

## Security Notes

- The personal access token has `repo` scope (necessary for wiki access)
- Token is stored as a repository secret (encrypted)
- Workflow only runs on your main repository (not forks)
- Consider rotating the token periodically

## Alternative Approach

If you prefer NOT to use GitHub Wiki, you can:
- Keep documentation only in `docs/` folder
- Link to it from your README
- Use GitHub's built-in markdown rendering

The choice depends on whether you want the wiki interface for easier navigation vs. keeping everything in the main repository.

---

**Ready to test?** Push a change to any `docs/` file and watch it auto-publish to your wiki! 🚀