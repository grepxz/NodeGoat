"use strict";

// A10 Unvalidated Redirects - GET /learn?url=.
// Source: app/routes/index.js, the /learn handler called res.redirect(req.query.url).

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const { USERS, request, login } = require("./helpers");

let cookie;

before(async () => {
    cookie = await login(USERS.user1);
});

const learn = url => request(`/learn?url=${encodeURIComponent(url)}`, { cookie });

const LEARNING_LINK = "https://www.khanacademy.org/economics-finance-domain/core-finance/investment-vehicles-tutorial/ira-401ks/v/traditional-iras";

const hostileTargets = [
    "https://evil.example/phish",
    "http://evil.example",
    "//evil.example",                              // protocol-relative
    "/\\evil.example",                             // browsers normalise "\" to "/"
    "https://www.khanacademy.org.evil.example/",   // allowlisted name as a prefix
    "https://www.khanacademy.org@evil.example/",   // allowlisted name as userinfo
    "https://evil.example/?next=www.khanacademy.org",
    "javascript:alert(document.domain)",
    "http://www.khanacademy.org/"                  // downgrade to plain http
];

for (const target of hostileTargets) {
    test(`security: does not redirect to ${target}`, async () => {
        const res = await learn(target);
        const location = res.headers.get("location");

        assert.equal(location, null, `redirected to ${location}`);
        assert.equal(res.status, 400);
    });
}

test("security: anonymous users are still redirected to login", async () => {
    const res = await request(`/learn?url=${encodeURIComponent(LEARNING_LINK)}`);
    assert.equal(res.status, 302);
    assert.match(res.headers.get("location"), /login/);
});

test("functional: the Learning Resources menu link still redirects", async () => {
    const res = await learn(LEARNING_LINK);
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), LEARNING_LINK);
});

test("functional: same-site relative paths still redirect", async () => {
    // Behaviour relied on by test/e2e/integration/learn_spec.js
    const res = await learn("/dashboard");
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), "/dashboard");
});
