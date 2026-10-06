# TLS, CDN and WAF notes
## TLS
- Terminated at nginx (TLS 1.2/1.3, modern ECDHE/AEAD suites, no session tickets, OCSP stapling). Certificates in `TLS_CERT_DIR`.
- Issue with Let's Encrypt (certbot webroot is mounted at `/var/www/certbot`; port 80 serves only ACME + redirect) or use a CDN origin certificate. <a id="renewal"></a>Renewal: certbot timer + `docker exec <proxy> nginx -s reload` as deploy hook. Alert at 14 days.
- Verify after changes: `testssl.sh <domain>` / SSL Labs target A+. `harden-check.sh --url` rejects TLS 1.1 and checks expiry.
- HSTS is sent with `includeSubDomains` and 2-year max-age. **Do not add `preload` until every subdomain is HTTPS-only and you accept it is hard to undo.**
## CDN / WAF (recommended in front of the proxy)
- Put Cloudflare/CloudFront/Fastly/Azure Front Door in front; allow origin traffic **only from CDN ranges** (security group) so the WAF cannot be bypassed.
- Real client IP: uncomment `set_real_ip_from` / `real_ip_header` in `default.conf.template` with the CDN's ranges and header; set API `TRUST_PROXY=2`. Without this, all users share the CDN's IP in rate limits.
- Cache: **never cache `/api/*`** or HTML; cache `/assets/*` only (immutable, hashed).
- WAF baseline: managed OWASP core ruleset in block mode after a 1-week log-only period; bot/credential-stuffing rule on `POST /api/v1/auth/login` and `/auth/password/*`; rate rules mirroring nginx (auth 10/min/IP, exports 6/min/IP); geo-restrict if users are in known regions; body size cap 1 MB; block `/health`, `/ready`, `/api/docs-json` (nginx already denies public access).
- Tune false positives on `customers.create` free-text fields (address, extra) and the `reports.exportCreate` filter JSON.
## Object storage origin
Browsers PUT/GET presigned URLs at `STORAGE_PUBLIC_ORIGIN`. Use the cloud S3 endpoint (preferred) or publish MinIO through the CDN on its own hostname; the bucket stays private, CORS on the bucket allows only `APP_ORIGIN`, methods PUT/GET, short `MaxAgeSeconds`. That origin must be listed in the CSP `connect-src` (it is, via `${STORAGE_PUBLIC_ORIGIN}`).
