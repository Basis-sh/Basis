# GitHub Actions Setup Guide

## Required Secrets

This workflow requires the following secrets to be configured in your GitHub repository:

### 1. CLOUDFLARE_API_TOKEN
Your Cloudflare API token with permissions to deploy Workers.

**How to get it:**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click **"Create Token"** button
3. You'll see a form with several sections. Here's what to fill in:

#### Token Name
- Enter a descriptive name, e.g., `Basis GitHub Actions Deploy` or `Workers Deployment Token`

#### Permissions Section
You need to configure the following permissions:

**Account-level permissions:**
- **Workers Scripts** → **Edit** (Required - to deploy workers)
- **Workers KV Storage** → **Edit** (Required - for KV namespaces used by your workers)
- **Workers R2 Storage** → **Edit** (Optional but recommended)
- **Workers Builds Configuration** → **Edit** (Required - to build and deploy)
- **Workers Observability** → **Edit** (Optional - for monitoring)
- **Account Settings** → **Read** (Required - to access account info)

**Zone-level permissions (if using Workers Routes):**
- **Workers Routes** → **Edit** (Optional - only if you're using custom routes)

**User-level permissions:**
- **User Details** → **Read** (Required - for authentication)
- **Memberships** → **Read** (Optional - for team access)

#### Resources Section

**Account Resources:**
- Select **"Include"** 
- Choose **"Select..."** and select your Cloudflare account (the one where your Workers will be deployed)
- This ensures the token only works for your specific account

**Zone Resources:**
- If you're using Workers Routes, select your zones
- Otherwise, you can leave this empty or select **"Include"** → **"All zones"**

#### Client IP Address Filtering (Optional)
- **Leave empty** for GitHub Actions (GitHub uses dynamic IPs)
- Only restrict if you want to limit token usage to specific IPs (not recommended for CI/CD)

#### TTL (Time To Live) - Optional
- **Leave empty** for a token that never expires (recommended for CI/CD)
- Or set a specific expiration date if you prefer time-limited tokens

4. Click **"Continue to summary"** to review your settings
5. Click **"Create Token"**
6. **IMPORTANT:** Copy the token immediately - you won't be able to see it again!
7. Store it securely - you'll need it for the next step

### 2. CLOUDFLARE_ACCOUNT_ID
Your Cloudflare Account ID.

**How to get it:**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Look at the **right sidebar** on any page
3. Under your account name, you'll see **"Account ID"** 
4. Click the **copy icon** (📋) next to the Account ID to copy it
   - The Account ID is a 32-character hexadecimal string
   - Example format: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

**Alternative method:**
- If you don't see it in the sidebar, go to **Workers & Pages** → **Overview**
- The Account ID is displayed at the top of the page

## Configuring Secrets in GitHub

### Via GitHub Web Interface:

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Enter the secret name (e.g., `CLOUDFLARE_API_TOKEN`)
6. Paste the secret value
7. Click **Add secret**
8. Repeat for `CLOUDFLARE_ACCOUNT_ID`

### Via GitHub CLI:

```bash
# Install GitHub CLI if needed: brew install gh

# Authenticate
gh auth login

# Add secrets (replace <your-username>/<repo-name> with Basis-sh/Basis)
gh secret set CLOUDFLARE_API_TOKEN --repo Basis-sh/Basis
# When prompted, paste your Cloudflare API token and press Enter

gh secret set CLOUDFLARE_ACCOUNT_ID --repo Basis-sh/Basis
# When prompted, paste your Cloudflare Account ID and press Enter
```

**Note:** The CLI will prompt you to enter the secret value interactively for security.

### Via Terraform/Infrastructure as Code:

If you manage your repository with Terraform, you can set secrets programmatically:

```hcl
resource "github_actions_secret" "cloudflare_api_token" {
  repository      = "Basis"
  secret_name     = "CLOUDFLARE_API_TOKEN"
  plaintext_value = var.cloudflare_api_token
}

resource "github_actions_secret" "cloudflare_account_id" {
  repository      = "Basis"
  secret_name     = "CLOUDFLARE_ACCOUNT_ID"
  plaintext_value = var.cloudflare_account_id
}
```

## Verifying Secrets Are Set

After adding secrets, you can verify they exist (but not their values) by:
1. Going to **Settings** → **Secrets and variables** → **Actions**
2. You should see both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` listed

## Testing the Workflow

Once secrets are configured:
1. Push a commit to the `main` branch
2. Go to **Actions** tab in your repository
3. Watch the workflow run - it should deploy all workers successfully

## Troubleshooting

**Error: "Context access might be invalid"**
- This is a linter warning in your IDE - it's safe to ignore
- The workflow will work correctly once secrets are configured in GitHub

**Error: "Missing required secret"**
- Verify secrets are spelled exactly: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (case-sensitive!)
- Check that secrets are set at the repository level (not organization level if using a different scope)
- Go to **Settings** → **Secrets and variables** → **Actions** to verify they exist

**Error: "Authentication failed" or "Invalid API Token"**
- Verify your API token has the correct permissions (especially **Workers Scripts** → **Edit**)
- Check that the token hasn't expired (if you set a TTL)
- Ensure the Account ID matches the account where your Workers are deployed
- Try creating a new token if the old one isn't working

**Error: "Account ID mismatch"**
- Double-check that the Account ID you copied matches the account where your Workers exist
- You can verify by going to **Workers & Pages** → **Overview** and checking the Account ID shown there

**Error: "Insufficient permissions"**
- Make sure your token has **Edit** permissions for:
  - Workers Scripts
  - Workers KV Storage
  - Workers Builds Configuration
- Recreate the token with the correct permissions if needed

**Workflow runs but workers don't deploy:**
- Check the Actions logs for specific error messages
- Verify that the worker names in `wrangler.toml` files don't conflict with existing workers
- Ensure you have available Workers quota in your Cloudflare account

