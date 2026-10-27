"use strict";

// Shared helpers for the security regression suite.
// The suite runs on the host (Node >= 18, built-in node:test + fetch) against
// the NodeGoat lab started with `docker compose up` and published on loopback.

const BASE_URL = process.env.NODEGOAT_URL || "http://127.0.0.1:4000";

const USERS = {
    admin: { _id: 1, userName: "admin", password: "Admin_123", fullName: "Node Goat Admin" },
    user1: { _id: 2, userName: "user1", password: "User1_123", fullName: "John Doe" },
    user2: { _id: 3, userName: "user2", password: "User2_123", fullName: "Will Smith" }
};

const request = (path, { cookie, method = "GET", form } = {}) => {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    let body;
    if (form) {
        headers["content-type"] = "application/x-www-form-urlencoded";
        body = new URLSearchParams(form).toString();
    }
    // redirect: "manual" so tests can assert on the Location header itself.
    return fetch(`${BASE_URL}${path}`, { method, headers, body, redirect: "manual" });
};

const login = async ({ userName, password }) => {
    const res = await request("/login", { method: "POST", form: { userName, password } });
    const setCookie = res.headers.get("set-cookie");
    if (res.status !== 302 || !setCookie) {
        throw new Error(`Login failed for ${userName}: HTTP ${res.status}`);
    }
    return setCookie.split(";")[0];
};

module.exports = { BASE_URL, USERS, request, login };
