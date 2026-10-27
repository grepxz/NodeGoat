# A1 Injection: server-side JavaScript injection in contributions

| | |
|---|---|
| Tutorial | `/tutorial/a1` (Server-Side JS Injection) |
| Affected request | `POST /contributions` (form fields `preTax`, `afterTax`, `roth`), authenticated user |
| Source location | `app/routes/contributions.js`, `handleContributionsUpdate`: `eval(req.body.preTax)` and the same for `afterTax` and `roth` |
| Impact | Remote code execution as the Node process. `eval` runs in the handler's scope, so `req`, `res`, `require` and `process` are all reachable |
| Regression test | `test/regression/a1-ssjs-injection.test.js` |

## Reproduce (vulnerable build)

```
preTax=res.end("SSJS_MARKER_"+(6*7))   ->  response body "SSJS_MARKER_42"
preTax=res.end(require("os").hostname()+" "+process.version)  ->  "18ccdf2e57cf v12.22.12"
```

See `exploit-before.txt`. While writing the test, a `process.exit()` payload
also terminated the server, so denial of service is trivial as well.

## Fix

The request values are parsed as data, never executed. `parsePercentage`
accepts only a 1–3 digit whole number and returns `NaN` otherwise. The
existing validation rejects `NaN`, negative values, and totals above 30%.

The upstream tutorial's suggested fix is `parseInt()`. That is not strict
enough on its own: `parseInt("7abc") === 7` silently accepts malformed input.
Test 3 covers that case.

## Evidence

- `test-before.txt`: 3 security tests fail, 2 functional tests pass
- `test-after.txt`: 5/5 pass
- `exploit-after.txt`: the same payload now returns "Invalid contribution percentages"
