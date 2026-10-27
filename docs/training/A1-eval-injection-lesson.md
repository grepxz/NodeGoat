# Developer lesson: why `eval()` on a form field is remote code execution

**Format:** 15-minute hands-on exercise, solo or pair
**Audience:** developers who write Node.js/Express handlers
**You will:** break a real handler, prove it with a test, fix it, and see why the "obvious" fix is incomplete
**Prerequisites:** this lab running (`docker compose up -d --build` on `master`, see `LAB.md`), Node ≥ 18 on your machine

---

## The bug in one sentence

`app/routes/contributions.js` turned three form fields into numbers like this:

```js
const preTax = eval(req.body.preTax);
```

`eval` doesn't *parse a number*. It *runs a program*, and the client
writes that program. Because this is a direct `eval`, the program runs inside
the handler's scope, so it can reach `req`, `res`, `require`, and `process`.
That is remote code execution, behind a login form any user can sign up for.

---

## 0:00–0:03 · Predict

Read `handleContributionsUpdate` in `app/routes/contributions.js` on `master`.
Before running anything, write down your answer:

> If `preTax` is `res.end("hello")`, what does the browser receive?

## 0:03–0:07 · Reproduce

Log in as `user1 / User1_123`, then send a harmless payload:

```sh
curl -s -c jar -d 'userName=user1&password=User1_123' http://127.0.0.1:4000/login -o /dev/null
curl -s -b jar --data-urlencode 'preTax=res.end("SSJS_MARKER_"+(6*7))' \
     -d 'afterTax=1&roth=1' http://127.0.0.1:4000/contributions
# -> SSJS_MARKER_42
```

The server computed `6*7` and wrote your string straight into the response.
Now swap in `res.end(require("os").hostname())`. You just read data from the
host.

> ⚠️ Only ever do this against the lab on `127.0.0.1`. Do **not** try
> `process.exit()`: it really does kill the server. The author found that out
> while writing this exercise.

## 0:07–0:09 · Capture it as a test

Copy `test/regression/a1-ssjs-injection.test.js` into your checkout of
`master` and run it:

```sh
node --test test/regression/a1-ssjs-injection.test.js
```

Three security tests fail and two functional tests pass. That's the baseline
you want: the test fails *because of the bug*, not because something else
is broken.

## 0:09–0:12 · Fix it, then fix it properly

**Attempt 1: what the tutorial suggests.** Replace each `eval(x)` with
`parseInt(x)`. Restart (`docker compose up -d --build web`) and rerun the
test.

Test 1 (code execution) now passes, but two tests still fail:

```
not ok 2 - security: expressions are rejected rather than computed
not ok 3 - security: partially numeric input is rejected
```

`parseInt("10-5")` is `10` and `parseInt("7 /* x */")` is `7`. `parseInt`
reads the leading digits and silently ignores the rest. That's no longer code
execution, but the handler now accepts input that isn't a number, and "accept
garbage and keep the prefix" is exactly the habit that produces the next
injection bug.

**Attempt 2: validate the whole value, then convert.**

```js
// Strict parse: parseInt("7abc") === 7, so check the whole string first.
const parsePercentage = value => /^\s*\d{1,3}\s*$/.test(value) ? parseInt(value, 10) : NaN;

const preTax = parsePercentage(req.body.preTax);
```

`NaN` flows into the existing `isNaN(...)` validation and the user gets
"Invalid contribution percentages". Rebuild and rerun: **5/5 pass**.

## 0:12–0:15 · Verify nothing else broke, then discuss

- The functional tests in the same file (valid input is saved, the 30% cap
  still applies) pass, so the fix didn't break the feature.
- The full upstream e2e suite still passes: `docs/remediation/A1-ssjs-injection/e2e-after.txt`.

**Discussion (pick one):**

1. `eval`, `new Function(...)`, `vm.runInThisContext`, `setTimeout("string")`,
   and MongoDB `$where` all execute strings. Where in *your* codebase does a
   string become code? (`grep -rnE "eval\(|new Function|\\\$where|runIn(This|New)Context" src/`)
2. Why does the regression test assert on the *marker in the response*
   instead of only checking for a 200 or 400 status?
3. The validator says "at most 3 digits". What is the real business rule,
   and should the server enforce it here too (each field ≤ 30)?

---

## Takeaways

1. **Never pass request data to anything that executes strings.** No
   amount of escaping makes `eval(userInput)` safe.
2. **Parse, don't coerce.** Validate the *entire* value against what you
   expect, then convert it. `parseInt`, `Number`, and `+x` each accept surprises.
3. **Write the failing test first, against the vulnerable code.** It proves
   the bug is real, proves the fix works, and stops someone from quietly
   bringing it back later.

Reference: NodeGoat `/tutorial/a1`, the fix commit `fix(A1): stop eval()-ing contribution form fields` on `fix/a1-ssjs-injection`, and `docs/remediation/A1-ssjs-injection/`.
