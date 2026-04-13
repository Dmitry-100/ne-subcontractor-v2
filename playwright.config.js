"use strict";

const { defineConfig } = require("@playwright/test");

const baseURL = process.env.BASE_URL || "http://127.0.0.1:5080";

module.exports = defineConfig({
    testDir: "./tests/smoke",
    timeout: 60_000,
    expect: {
        timeout: 10_000
    },
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL: baseURL,
        browserName: "chromium",
        headless: true,
        ignoreHTTPSErrors: true,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure"
    }
});
