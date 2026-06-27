# Preview Deployment

Every pull request that touches the `frontend/` directory triggers a Netlify preview deployment via `.github/workflows/preview.yml`.

## How it works

1. The workflow runs on PRs targeting `main` when any file under `frontend/` changes.
2. It type-checks and builds the React + Vite app pointed at the **testnet** RPC endpoint.
3. The built `frontend/dist/` directory is deployed to Netlify under a unique alias (`pr-<number>`).
4. Netlify posts the preview URL as a PR comment so reviewers can open it immediately.

## Required secrets

Add these in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `NETLIFY_AUTH_TOKEN` | Personal access token from [Netlify user settings](https://app.netlify.com/user/applications) |
| `NETLIFY_SITE_ID` | Site ID from Netlify site settings (**General → Site details**) |

## Rollback

Preview deployments are isolated per PR alias (`pr-<number>`) and do not affect production.

To roll back the **production** site after a merged deploy:

1. Open the Netlify dashboard → **Deploys**.
2. Find the last known-good deploy.
3. Click **Publish deploy**.

Or via the Netlify CLI:

```bash
# List recent deploys
netlify deploys --site <NETLIFY_SITE_ID>

# Roll back to a specific deploy ID
netlify deploy --prod --dir frontend/dist --message "rollback to <deploy-id>"
```

## Local preview

```bash
cd frontend
npm ci
npm run build
npm run preview   # serves the production build locally on http://localhost:4173
```
