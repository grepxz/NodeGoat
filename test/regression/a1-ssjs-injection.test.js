"use strict";

// A1 Injection - Server-Side JavaScript injection in POST /contributions.
// Source: app/routes/contributions.js (handleContributionsUpdate), which passed
// req.body.preTax / afterTax / roth to eval().

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const { USERS, request, login } = require("./helpers");

let cookie;

before(async () => {
    cookie = await login(USERS.user1);
});

const submit = form => request("/contributions", { cookie, method: "POST", form });

test("security: contribution fields are not evaluated as JavaScript", async () => {
    const res = await submit({ preTax: "res.end('SSJS_MARKER_' + (6 * 7))", afterTax: "1", roth: "1" });
    const body = await res.text();

    assert.ok(!body.includes("SSJS_MARKER_42"), "server executed attacker-supplied JavaScript");
    assert.match(body, /Invalid contribution percentages/);
});

test("security: expressions are rejected rather than computed", async () => {
    // eval("10-5") === 5 would be stored; a numeric parser must not accept it either.
    const res = await submit({ preTax: "10-5", afterTax: "1", roth: "1" });
    assert.match(await res.text(), /Invalid contribution percentages/);
});

test("security: partially numeric input is rejected", async () => {
    // eval("7 /* x */") === 7 and parseInt("7 /* x */") === 7, so neither eval nor a
    // bare parseInt fix rejects it. (Payload is deliberately harmless if evaluated.)
    const res = await submit({ preTax: "7 /* x */", afterTax: "1", roth: "1" });
    assert.match(await res.text(), /Invalid contribution percentages/);
});

test("functional: valid whole-number percentages are saved", async () => {
    const res = await submit({ preTax: "12", afterTax: "3", roth: "4" });
    const body = await res.text();

    assert.equal(res.status, 200);
    assert.match(body, /alert-success/);
    assert.match(body, /12 %/);
});

test("functional: the 30% cap still applies", async () => {
    const res = await submit({ preTax: "20", afterTax: "10", roth: "5" });
    assert.match(await res.text(), /Contribution percentages cannot exceed 30 %/);
});
