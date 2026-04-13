"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const trendScriptPath = path.resolve(__dirname, "../../scripts/perf/generate-performance-trend-report.mjs");

function createTempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function writeHttpTsv(filePath, warmMs) {
    const warmSeconds = (warmMs / 1000).toFixed(3);
    const content = [
        "endpoint\tpath\titeration\ttime_total\ttime_starttransfer\tsize_download\thttp_code",
        "dashboard-summary-api\t/api/dashboard/summary\tcold\t0.010\t0.005\t100\t200",
        `dashboard-summary-api\t/api/dashboard/summary\t1\t${warmSeconds}\t0.006\t100\t200`
    ].join("\n");
    fs.writeFileSync(filePath, `${content}\n`, "utf8");
}

function writeBrowserJson(filePath, runId) {
    const valueByRun = {
        r1: {
            home: 1200,
            procedures: 1900,
            contracts: 2100,
            admin: 1600
        },
        r2: {
            home: 1300,
            procedures: 1700,
            contracts: 2200,
            admin: 1500
        }
    };

    const values = valueByRun[runId];
    writeJson(filePath, {
        results: [
            { page: "home", loadMs: { p50: values.home } },
            { page: "procedures-page", loadMs: { p50: values.procedures } },
            { page: "contracts-page", loadMs: { p50: values.contracts } },
            { page: "admin-page", loadMs: { p50: values.admin } }
        ]
    });
}

function writeManifest(perfDir, timestamp, browserPath, httpPath) {
    const manifestPath = path.join(perfDir, `perf-contour-${timestamp}.json`);
    writeJson(manifestPath, {
        generatedAtUtc: `2026-04-13T${timestamp.slice(9, 11)}:${timestamp.slice(11, 13)}:00Z`,
        browserMetricsJson: browserPath,
        httpMetricsTsv: httpPath
    });
    return manifestPath;
}

test("perf trend script: builds trend table and delta from recent manifests", () => {
    const tempDir = createTempDir("perf-trend-script-");
    const perfDir = path.join(tempDir, "perf");
    const reportPath = path.join(perfDir, "perf-trend-latest.md");

    try {
        fs.mkdirSync(perfDir, { recursive: true });

        const browser1 = path.join(perfDir, "browser-r1.json");
        const browser2 = path.join(perfDir, "browser-r2.json");
        const http1 = path.join(perfDir, "http-r1.tsv");
        const http2 = path.join(perfDir, "http-r2.tsv");
        writeBrowserJson(browser1, "r1");
        writeBrowserJson(browser2, "r2");
        writeHttpTsv(http1, 20);
        writeHttpTsv(http2, 25);

        writeManifest(perfDir, "20260413-090000", browser1, http1);
        writeManifest(perfDir, "20260413-100000", browser2, http2);

        const result = spawnSync("node", [trendScriptPath, "--dir", perfDir, "--out", reportPath], {
            encoding: "utf8"
        });

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        const report = fs.readFileSync(reportPath, "utf8");
        assert.match(report, /Performance Trend Snapshot/);
        assert.match(report, /perf-contour-20260413-090000/);
        assert.match(report, /perf-contour-20260413-100000/);
        assert.match(report, /Latest Delta vs Previous Run/);
        assert.match(report, /Home load p50: 1200\.0 -> 1300\.0/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf trend script: fails when contour manifests are missing", () => {
    const tempDir = createTempDir("perf-trend-script-empty-");
    const perfDir = path.join(tempDir, "perf");
    const reportPath = path.join(perfDir, "perf-trend-latest.md");

    try {
        fs.mkdirSync(perfDir, { recursive: true });
        const result = spawnSync("node", [trendScriptPath, "--dir", perfDir, "--out", reportPath], {
            encoding: "utf8"
        });
        assert.notEqual(result.status, 0, "Expected non-zero exit when no manifests are present.");
        assert.match(result.stderr, /No contour manifests found/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
