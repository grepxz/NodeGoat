# A10 Unvalidated Redirects: `/learn`

| | |
|---|---|
| Tutorial | `/tutorial/a10` (Unvalidated Redirects and Forwards) |
| Affected request | `GET /learn?url=<anything>`, authenticated user (the "Learning Resources" menu link) |
| Source location | `app/routes/index.js`, `/learn` handler: `res.redirect(req.query.url)` |
| Impact | Phishing: a link on the trusted NodeGoat origin forwards victims to any site. `javascript:` URLs are reflected into `Location` too |
| Regression test | `test/regression/a10-open-redirect.test.js` |

## Reproduce (vulnerable build)

```
/learn?url=https://evil.example/phish        -> 302 Location: https://evil.example/phish
/learn?url=//evil.example                    -> 302 Location: //evil.example   (protocol-relative)
/learn?url=javascript:alert(document.domain) -> 302 Location: javascript:alert(document.domain)
```

See `exploit-before.txt`.

## Fix

`isSafeLearnRedirect` allows only:

- **same-site paths**: one leading `/`, not `//` or `/\`, no whitespace or
  backslashes (browsers normalise `\` to `/` and strip tabs and newlines,
  which turns these into protocol-relative URLs), or
- **https URLs whose parsed `hostname` is exactly on an allowlist**
  (`www.khanacademy.org`, the target of the existing menu link).

Every other value returns `400`. Parsing with `URL` instead of string matching
defeats the common bypasses the test enumerates: `www.khanacademy.org.evil.example`,
`www.khanacademy.org@evil.example`, an allowlisted name in the query string,
and downgrades to `http:`.

## Evidence

- `test-before.txt`: 9 security tests fail, 3 pass (auth plus the two legitimate redirects)
- `test-after.txt`: 12/12 pass
- `exploit-after.txt`: hostile targets return 400; the menu link and `/dashboard` still redirect

> Evidence note: curl in Git Bash on Windows rewrites arguments that start with
> `/` (MSYS path conversion). The captures were taken with `MSYS_NO_PATHCONV=1`.
> The node tests are not affected.
