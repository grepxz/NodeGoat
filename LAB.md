# NodeGoat remediation lab

This fork is used to reproduce, fix, and regression-test vulnerabilities in
[OWASP NodeGoat](https://github.com/OWASP/NodeGoat). The application is
**intentionally vulnerable**. Run it only on a local machine, never on a shared
network or a public host.

## Confinement

- `docker-compose.override.yml` re-publishes the `web` service on
  `127.0.0.1:4000` only (the upstream file binds `0.0.0.0:4000`, which exposes
  it on every network interface). MongoDB is not published to the host at all.
- No secrets in `config/env/*.js` are real; they are lab defaults.
- Stop the lab when you are done: `docker compose down`.

## Exact working versions (recorded 2026-10-27)

| Component | Version |
|---|---|
| Upstream commit | `c5cb68a` (OWASP/NodeGoat `master`, "Merge pull request #290") |
| Host OS | Windows 11 Home 10.0.26200 |
| Docker Engine / Compose | 28.1.1 (Docker Desktop) / v2.35.1 |
| App base image | `node:12-alpine` @ `sha256:d4b15b3d48f42059a15bd659be60afe21762aae9d6cbea6f124440895c27db68` |
| Node.js / npm (in container) | 12.22.12 / 6.14.16 (Alpine 3.15.4). Node 12 has been end-of-life since 2022 |
| Database image | `mongo:4.4` @ `sha256:4be76f674fc4b27859816811b8baa3c51830eb1dbf4ca81a51e26b79edd662ef` (server 4.4.30) |
| Resolved app dependencies | express 4.16.4, express-session 1.15.6, body-parser 1.18.3, mongodb 2.2.36, swig 1.4.2, helmet 2.3.0, csurf 1.9.0, marked 0.3.5, needle 2.2.4, bcrypt-nodejs 0.0.3, consolidate 0.14.5, forever 2.0.0, underscore 1.9.1 |
| Host Node.js (test runner) | 22.17.0 (built-in `node:test` + `fetch`; nothing to install) |

## Run

```sh
docker compose up -d --build      # app on http://127.0.0.1:4000, DB re-seeded on every start
npm run test:regression           # security regression suite (host Node >= 18)
docker compose down
```

Seeded accounts: `admin / Admin_123`, `user1 / User1_123`, `user2 / User2_123`.

## Remediations

| Tutorial class | Issue | Evidence |
|---|---|---|
| A1 Injection | Server-side JavaScript injection via `eval()` in `POST /contributions` | `docs/remediation/A1-ssjs-injection/` |
| A4 Insecure Direct Object References | Any user can read any user's allocations via `GET /allocations/:userId` | `docs/remediation/A4-idor-allocations/` |
| A10 Unvalidated Redirects | Open redirect via `GET /learn?url=` | `docs/remediation/A10-open-redirect/` |
