# GitHub Actions Setup Guide

## Required Secrets

This workflow requires the following secrets to be configured in your GitHub repository:

### 1. CLOUDFLARE_API_TOKEN
Your Cloudflare API token with permissions to deploy Workers.

**How to get it:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use the "Edit Cloudflare Workers" template or create a custom token with:
   - **Account** → **Cloudflare Workers** → **Edit**
4. Copy the token (you won't be able to see it again!)

### 2. CLOUDFLARE_ACCOUNT_ID
Your Cloudflare Account ID.

**How to get it:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account (right sidebar)
3. Copy the **Account ID** from the right sidebar

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

# Add secrets
gh secret set CLOUDFLARE_API_TOKEN --repo <your-username>/<repo-name>
gh secret set CLOUDFLARE_ACCOUNT_ID --repo <your-username>/<repo-name>
```

### Via Terraform/Infrastructure as Code:

If you manage your repository with Terraform, you can set secrets programmatically:

```hcl
resource "github_actions_secret" "cloudflare_api_token" {
  repository      = "your-repo-name"
  secret_name     = "CLOUDFLARE_API_TOKEN"
  plaintext_value = var.cloudflare_api_token
}

resource "github_actions_secret" "cloudflare_account_id" {
  repository      = "your-repo-name"
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
- Verify secrets are spelled exactly: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
- Check that secrets are set at the repository level (not organization level if using a different scope)

**Error: "Authentication failed"**
- Verify your API token has the correct permissions
- Check that the token hasn't expired
- Ensure the Account ID matches the account where your Workers are deployed

