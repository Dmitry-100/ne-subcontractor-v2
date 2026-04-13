"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const scriptPath = path.resolve(__dirname, "../../scripts/ci/check-performance-evidence-pack.sh");

function createTempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

test("performance evidence check script: validates perf + sql evidence pack", () => {
    const tempDir = createTempDir("perf-evidence-check-ok-");
    try {
        const perfDir = path.join(tempDir, "perf");
        const sqlDir = path.join(tempDir, "sql-evidence");
        fs.mkdirSync(perfDir, { recursive: true });
        fs.mkdirSync(sqlDir, { recursive: true });

        const browserJson = path.join(perfDir, "browser-metrics-raw.json");
        const httpTsv = path.join(perfDir, "http-metrics-raw.tsv");
        fs.writeFileSync(browserJson, '{"results":[]}', "utf8");
        fs.writeFileSync(httpTsv, "endpoint\tpath\n", "utf8");
        fs.writeFileSync(path.join(perfDir, "http-cache-compression-telemetry-latest.md"), "# telemetry\n", "utf8");
        fs.writeFileSync(path.join(perfDir, "http-cache-compression-telemetry-latest.tsv"), "endpoint\tpath\n", "utf8");
        fs.writeFileSync(path.join(perfDir, "perf-budget-latest.md"), "# budget report\n", "utf8");

        writeJson(path.join(perfDir, "perf-contour-latest.json"), {
            browserMetricsJson: browserJson,
            httpMetricsTsv: httpTsv
        });

        writeJson(path.join(sqlDir, "manifest.json"), { generatedAtUtc: "2026-04-13T00:00:00Z" });
        fs.writeFileSync(path.join(sqlDir, "evidence-summary.md"), "# sql evidence\n", "utf8");

        const result = spawnSync("bash", [scriptPath, perfDir, sqlDir], {
            encoding: "utf8"
        });

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        assert.match(result.stdout, /Performance evidence pack check: OK/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("performance evidence check script: fails when telemetry report is missing", () => {
    const tempDir = createTempDir("perf-evidence-check-missing-");
    try {
        const perfDir = path.join(tempDir, "perf");
        fs.mkdirSync(perfDir, { recursive: true });

        const browserJson = path.join(perfDir, "browser-metrics-raw.json");
        const httpTsv = path.join(perfDir, "http-metrics-raw.tsv");
        fs.writeFileSync(browserJson, '{"results":[]}', "utf8");
        fs.writeFileSync(httpTsv, "endpoint\tpath\n", "utf8");
        fs.writeFileSync(path.join(perfDir, "http-cache-compression-telemetry-latest.tsv"), "endpoint\tpath\n", "utf8");

        writeJson(path.join(perfDir, "perf-contour-latest.json"), {
            browserMetricsJson: browserJson,
            httpMetricsTsv: httpTsv
        });

        const result = spawnSync("bash", [scriptPath, perfDir], {
            encoding: "utf8"
        });

        assert.notEqual(result.status, 0, "Expected non-zero exit code for missing telemetry report.");
        assert.match(`${result.stdout}\n${result.stderr}`, /Missing telemetry report/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("performance evidence check script: resolves contour paths prefixed with artifactsDir", () => {
    const tempDir = createTempDir("perf-evidence-check-artifacts-prefix-");
    try {
        const perfDir = path.join(tempDir, "artifacts", "perf");
        fs.mkdirSync(perfDir, { recursive: true });

        const browserJson = path.join(perfDir, "browser-metrics-prefixed.json");
        const httpTsv = path.join(perfDir, "http-metrics-prefixed.tsv");
        fs.writeFileSync(browserJson, '{"results":[]}', "utf8");
        fs.writeFileSync(httpTsv, "endpoint\tpath\n", "utf8");
        fs.writeFileSync(path.join(perfDir, "http-cache-compression-telemetry-latest.md"), "# telemetry\n", "utf8");
        fs.writeFileSync(path.join(perfDir, "http-cache-compression-telemetry-latest.tsv"), "endpoint\tpath\n", "utf8");
        fs.writeFileSync(path.join(perfDir, "perf-budget-latest.md"), "# budget report\n", "utf8");

        writeJson(path.join(perfDir, "perf-contour-latest.json"), {
            artifactsDir: "artifacts/perf",
            browserMetricsJson: "artifacts/perf/browser-metrics-prefixed.json",
            httpMetricsTsv: "artifacts/perf/http-metrics-prefixed.tsv"
        });

        const result = spawnSync("bash", [scriptPath, perfDir], {
            cwd: tempDir,
            encoding: "utf8"
        });

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        assert.match(result.stdout, /Performance evidence pack check: OK/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("performance evidence check script: fails when budget report is missing", () => {
    const tempDir = createTempDir("perf-evidence-check-missing-budget-");
    try {
        const perfDir = path.join(tempDir, "perf");
        fs.mkdirSync(perfDir, { recursive: true });

        const browserJson = path.join(perfDir, "browser-metrics-raw.json");
        const httpTsv = path.join(perfDir, "http-metrics-raw.tsv");
        fs.writeFileSync(browserJson, '{"results":[]}', "utf8");
        fs.writeFileSync(httpTsv, "endpoint\tpath\n", "utf8");
        fs.writeFileSync(path.join(perfDir, "http-cache-compression-telemetry-latest.md"), "# telemetry\n", "utf8");
        fs.writeFileSync(path.join(perfDir, "http-cache-compression-telemetry-latest.tsv"), "endpoint\tpath\n", "utf8");

        writeJson(path.join(perfDir, "perf-contour-latest.json"), {
            browserMetricsJson: browserJson,
            httpMetricsTsv: httpTsv
        });

        const result = spawnSync("bash", [scriptPath, perfDir], {
            encoding: "utf8"
        });

        assert.notEqual(result.status, 0, "Expected non-zero exit code for missing budget report.");
        assert.match(`${result.stdout}\n${result.stderr}`, /Missing budget report/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
