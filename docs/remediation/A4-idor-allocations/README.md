# A4 Insecure Direct Object References: allocations

| | |
|---|---|
| Tutorial | `/tutorial/a4` (Insecure Direct Object References) |
| Affected request | `GET /allocations/:userId?threshold=N`, authenticated user |
| Source location | `app/routes/allocations.js` `displayAllocations` (uses `req.params.userId`); `app/data/allocations-dao.js` `getByUserIdAndThreshold` (builds a `$where` string from `threshold`) |
| Impact | Any logged-in user can read every other user's portfolio allocations |
| Regression test | `test/regression/a4-idor-allocations.test.js` |

## Reproduce (vulnerable build, logged in as `user1`, `_id 2`)

```
GET /allocations/3                                   -> 200, "Asset Allocations for Will Smith" (user2)
GET /allocations/2?threshold=1'; return 1 == '1      -> 200, allocations for all three users
```

See `exploit-before.txt`. The second request is the tutorial's "A1-2 NoSQL
injection". It is included here because it is a **second route to the same
broken property**: "a user can read only their own allocations." Fixing only
the URL parameter would leave the data leak open, and the test asserts the
property against both vectors.

## Fix

1. **Authorisation:** the user id comes from `req.session.userId`. The URL
   segment is kept so existing links and bookmarks still work, but a mismatch
   returns `403`.
2. **Query construction:** `threshold` must match `^\d{1,2}$` (otherwise
   `400`). The DAO now uses `{ userId, stocks: { $gt: n } }` instead of a
   JavaScript `$where` string, so input can only ever be a value, never code.

## Existing test that encoded the vulnerability

`test/e2e/integration/allocations_spec.js` signs in as `user1` (`_id 2`) and
then asserts it can open `/allocations/1`, which is the admin's page. The
spec was relying on the IDOR, so it now visits `/allocations/2`, the user's
own page. The app's nav link already uses the session `userId`
(`app/views/layout.html:56`), so real users never hit the 403.

## Evidence

- `test-before.txt`: both security tests fail (data leaked), 3 pass
- `test-after.txt`: 5/5 pass
- `exploit-after.txt`: 403 for another user's id, 400 for the injection, 200 for the user's own page
