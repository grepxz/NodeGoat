"use strict";

// A4 Insecure Direct Object References - GET /allocations/:userId.
// Source: app/routes/allocations.js (displayAllocations) trusted req.params.userId,
// and app/data/allocations-dao.js (getByUserIdAndThreshold) built a $where string
// from the threshold query parameter. Both let one user read another's allocations.

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const { USERS, request, login } = require("./helpers");

let cookie;

before(async () => {
    cookie = await login(USERS.user1);
});

const othersNames = [USERS.admin.fullName, USERS.user2.fullName];

const assertNoOtherUsersData = body => {
    for (const name of othersNames) {
        assert.ok(!body.includes(`Asset Allocations for ${name}`), `leaked allocations of ${name}`);
    }
};

test("security: a user cannot read another user's allocations by id", async () => {
    const res = await request(`/allocations/${USERS.user2._id}`, { cookie });
    assertNoOtherUsersData(await res.text());
    assert.equal(res.status, 403);
});

test("security: threshold cannot inject into the query to list every user", async () => {
    const threshold = encodeURIComponent("1'; return 1 == '1");
    const res = await request(`/allocations/${USERS.user1._id}?threshold=${threshold}`, { cookie });
    assertNoOtherUsersData(await res.text());
    assert.equal(res.status, 400);
});

test("security: anonymous users are still redirected to login", async () => {
    const res = await request(`/allocations/${USERS.user1._id}`);
    assert.equal(res.status, 302);
    assert.match(res.headers.get("location"), /login/);
});

test("functional: a user can read their own allocations", async () => {
    const res = await request(`/allocations/${USERS.user1._id}`, { cookie });
    assert.equal(res.status, 200);
    assert.match(await res.text(), new RegExp(`Asset Allocations for ${USERS.user1.fullName}`));
});

test("functional: a numeric threshold still filters the user's own allocations", async () => {
    // Seeded stocks are 1..40, so threshold 0 always matches and 99 never does.
    const shown = await request(`/allocations/${USERS.user1._id}?threshold=0`, { cookie });
    assert.equal(shown.status, 200);
    assert.match(await shown.text(), new RegExp(`Asset Allocations for ${USERS.user1.fullName}`));

    const filtered = await request(`/allocations/${USERS.user1._id}?threshold=99`, { cookie });
    const body = await filtered.text();
    assert.ok(!body.includes("Asset Allocations for"), "threshold 99 should hide all allocations");
    assertNoOtherUsersData(body);
});
