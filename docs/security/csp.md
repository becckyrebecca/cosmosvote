# Content Security Policy (CSP)

CosmosVote implements a strict Content Security Policy to protect users from Cross-Site Scripting (XSS) and other injection attacks. This is especially critical as the application interacts with blockchain wallets and handles sensitive transaction data.

## Policy Overview

The current policy is defined as:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
connect-src 'self' https://soroban-testnet.stellar.org https://soroban-mainnet.stellar.org;
frame-ancestors 'none';
upgrade-insecure-requests;
```

### Directive Breakdown

- **`default-src 'self'`**: Only allow resources from the same origin by default.
- **`script-src 'self'`**: Disallow all inline scripts and external scripts not from the same origin.
- **`style-src 'self' 'unsafe-inline'`**: Allow styles from the same origin and inline styles (required for some React components and Vite's development HMR).
- **`img-src 'self' data:`**: Allow images from the same origin and data URIs.
- **`connect-src 'self' ...`**: Limit network requests (XHR/Fetch/WebSockets) to the same origin and whitelisted Stellar RPC nodes:
    - `https://soroban-testnet.stellar.org`
    - `https://soroban-mainnet.stellar.org`
- **`frame-ancestors 'none'`**: Prevent the application from being embedded in iframes (Clickjacking protection).
- **`upgrade-insecure-requests`**: Instructs browsers to treat all of the site's insecure URLs (those over HTTP) as though they have been replaced with secure URLs (those over HTTPS).

## Implementation

### Development

In development, the policy is enforced by the Vite dev server via headers in `frontend/vite.config.ts`.

### Production

In production, the hosting platform (e.g., Vercel, Netlify, or Nginx) must be configured to serve these headers. If using a static web server, ensure the following header is included in all responses:

`Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://soroban-testnet.stellar.org https://soroban-mainnet.stellar.org; frame-ancestors 'none'; upgrade-insecure-requests;`
