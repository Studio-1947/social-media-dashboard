---
description: How to change Git credentials for different GitHub users
---

# Change Git Credentials for Different GitHub Users

Use this workflow when you need to switch Git credentials between different GitHub accounts (e.g., switching from `aishwarya25252` to `soumicpersonal` or any other collaborator).

## Problem
You see an error like:
```
remote: Permission to Studio-1947/social-media-dashboard.git denied to aishwarya25252.
fatal: unable to access 'https://github.com/...': The requested URL returned error: 403
```

This means Git is using cached credentials from a different GitHub user.

---

## Solution Steps

### Step 1: Check Current Remote URL
First, verify which repository you're connected to:

```bash
git remote -v
```

### Step 2: Update Git Username (Optional but Recommended)
Set the correct username for this repository:

```bash
git config user.name "your-github-username"
git config user.email "your-email@example.com"
```

**Note:** To set globally for all repositories:
```bash
git config --global user.name "your-github-username"
git config --global user.email "your-email@example.com"
```

### Step 3: Find Cached GitHub Credentials
Check if there are cached credentials in Windows Credential Manager:

```bash
cmdkey /list | Select-String -Pattern "github"
```

You might see entries like:
- `Target: LegacyGeneric:target=git:https://github.com`
- `Target: git:https://github.com`

### Step 4: Delete Cached Credentials
Remove the cached credentials to force Git to prompt for new ones:

```bash
# For LegacyGeneric entries
cmdkey /delete:LegacyGeneric:target=git:https://github.com

# For direct git entries (if exists)
cmdkey /delete:git:https://github.com
```

You should see:
```
CMDKEY: Credential deleted successfully.
```

### Step 5: Push to GitHub
Now when you push, Git will prompt for authentication:

```bash
git push -u origin main
```

**Authentication Options:**

**Option A: GitHub Personal Access Token (Recommended)**
1. When prompted, a login window will appear
2. Sign in with the correct GitHub account
3. If needed, create a Personal Access Token:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Name it (e.g., "social-media-dashboard")
   - Select scope: `repo` (full control of repositories)
   - Click "Generate token"
   - Copy the token
4. When Git asks for a password, paste the token (not your GitHub password)

**Option B: GitHub CLI**
```bash
# Install GitHub CLI if not installed
winget install GitHub.cli

# Authenticate
gh auth login
```

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Check remote URL | `git remote -v` |
| Change remote URL | `git remote set-url origin https://github.com/USER/REPO.git` |
| List cached credentials | `cmdkey /list \| Select-String -Pattern "github"` |
| Delete cached credential | `cmdkey /delete:LegacyGeneric:target=git:https://github.com` |
| Set local username | `git config user.name "username"` |
| Set local email | `git config user.email "email@example.com"` |
| Set global username | `git config --global user.name "username"` |
| Set global email | `git config --global user.email "email@example.com"` |

---

## Switching Between Repositories

If you also need to change the remote repository URL:

```bash
# Check current remote
git remote -v

# Update to new repository
git remote set-url origin https://github.com/NEW-USER/NEW-REPO.git

# Verify the change
git remote -v

# Unset upstream if needed
git branch --unset-upstream

# Push to new remote
git push -u origin main
```

---

## Troubleshooting

**Problem: Still getting permission denied after deleting credentials**
- Make sure you deleted ALL GitHub credentials from Windows Credential Manager
- Try opening Windows Credential Manager GUI: `control /name Microsoft.CredentialManager`
- Look for any "GitHub" or "git:https://github.com" entries and delete them manually

**Problem: No credential prompt appears**
- Try pushing again
- Make sure Git Credential Manager is installed: `git credential-manager version`
- If not installed: `winget install Git.Git` (and restart terminal)

**Problem: Wrong username appears in commits**
- Check: `git config user.name` and `git config user.email`
- Update as needed (see Step 2)

---

## Tips for Team Collaboration

- When multiple people collaborate on a repository, each person should use their own GitHub credentials
- Add collaborators to the repository via GitHub Settings → Collaborators
- Each collaborator needs push access to the repository
- Personal Access Tokens are recommended over passwords for security
