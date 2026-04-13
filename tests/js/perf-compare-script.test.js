"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const compareScriptPath = path.resolve(__dirname, "../../scripts/perf/compare-performance-manifests.mjs");

function createTempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function writeHttpTsv(filePath, warmTimesSec) {
    const warmSamples = Array.isArray(warmTimesSec)
        ? warmTimesSec
        : [warmTimesSec];
    const lines = [
        "endpoint\tpath\titeration\ttime_total\ttime_starttransfer\tsize_download\thttp_code",
        "home\t/\tcold\t0.010\t0.009\t1024\t200"
    ];

    warmSamples.forEach((value, index) => {
        lines.push(`home\t/\t${index + 1}\t${Number(value).toFixed(3)}\t0.010\t1024\t200`);
    });

    fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function writeBrowserJson(filePath, { requestAvg, domP50, loadP50 }) {
    writeJson(filePath, {
        results: [
            {
                page: "home",
                requestCount: { avg: requestAvg },
                staticRequests: { avgFailedSameOrigin: 0 },
                domContentLoadedMs: { p50: domP50 },
                loadMs: { p50: loadP50 }
            }
        ]
    });
}

function writeManifest(filePath, browserFileName, httpFileName) {
    writeJson(filePath, {
        browserMetricsJson: browserFileName,
        httpMetricsTsv: httpFileName
    });
}

function runCompare(args, cwd) {
    return spawnSync(process.execPath, [compareScriptPath, ...args], {
        cwd,
        encoding: "utf8"
    });
}

test("perf compare script: generates report with regression status when thresholds are exceeded", () => {
    const tempDir = createTempDir("perf-compare-regression-");
    try {
        const budgetPath = path.join(tempDir, "perf-budget.json");
        writeJson(budgetPath, {
            regression: {
                browser: {
                    default: {
                        requestCountRegressionPctMax: 10,
                        domContentLoadedP50RegressionPctMax: 10,
                        loadP50RegressionPctMax: 10
                    }
                },
                http: {
                    default: {
                        p95RegressionPctMax: 10
                    }
                }
            }
        });

        const baselineBrowser = path.join(tempDir, "browser-baseline.json");
        const currentBrowser = path.join(tempDir, "browser-current.json");
        writeBrowserJson(baselineBrowser, { requestAvg: 10, domP50: 1000, loadP50: 1000 });
        writeBrowserJson(currentBrowser, { requestAvg: 12, domP50: 1200, loadP50: 1050 });

        const baselineHttp = path.join(tempDir, "http-baseline.tsv");
        const currentHttp = path.join(tempDir, "http-current.tsv");
        writeHttpTsv(baselineHttp, 0.020);
        writeHttpTsv(currentHttp, 0.030);

        const baselineManifest = path.join(tempDir, "baseline-manifest.json");
        const currentManifest = path.join(tempDir, "current-manifest.json");
        writeManifest(baselineManifest, path.basename(baselineBrowser), path.basename(baselineHttp));
        writeManifest(currentManifest, path.basename(currentBrowser), path.basename(currentHttp));

        const reportPath = path.join(tempDir, "report.md");
        const result = runCompare(
            [
                "--manifest", currentManifest,
                "--baseline-manifest", baselineManifest,
                "--budget", budgetPath,
                "--out", reportPath
            ],
            tempDir
        );

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        assert.equal(fs.existsSync(reportPath), true, "Expected report file to be generated.");
        const reportText = fs.readFileSync(reportPath, "utf8");
        assert.match(reportText, /Overall status: \*\*REGRESSION DETECTED\*\*/);
        assert.match(reportText, /REGRESSION/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf compare script: generates OK status when metrics are within thresholds", () => {
    const tempDir = createTempDir("perf-compare-ok-");
    try {
        const budgetPath = path.join(tempDir, "perf-budget.json");
        writeJson(budgetPath, {
            regression: {
                browser: {
                    default: {
                        requestCountRegressionPctMax: 25,
                        domContentLoadedP50RegressionPctMax: 25,
                        loadP50RegressionPctMax: 25
                    }
                },
                http: {
                    default: {
                        p95RegressionPctMax: 25
                    }
                }
            }
        });

        const baselineBrowser = path.join(tempDir, "browser-baseline.json");
        const currentBrowser = path.join(tempDir, "browser-current.json");
        writeBrowserJson(baselineBrowser, { requestAvg: 10, domP50: 1000, loadP50: 1000 });
        writeBrowserJson(currentBrowser, { requestAvg: 11, domP50: 1080, loadP50: 1090 });

        const baselineHttp = path.join(tempDir, "http-baseline.tsv");
        const currentHttp = path.join(tempDir, "http-current.tsv");
        writeHttpTsv(baselineHttp, 0.020);
        writeHttpTsv(currentHttp, 0.022);

        const baselineManifest = path.join(tempDir, "baseline-manifest.json");
        const currentManifest = path.join(tempDir, "current-manifest.json");
        writeManifest(baselineManifest, path.basename(baselineBrowser), path.basename(baselineHttp));
        writeManifest(currentManifest, path.basename(currentBrowser), path.basename(currentHttp));

        const reportPath = path.join(tempDir, "report.md");
        const result = runCompare(
            [
                "--manifest", currentManifest,
                "--baseline-manifest", baselineManifest,
                "--budget", budgetPath,
                "--out", reportPath
            ],
            tempDir
        );

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        assert.equal(fs.existsSync(reportPath), true, "Expected report file to be generated.");
        const reportText = fs.readFileSync(reportPath, "utf8");
        assert.match(reportText, /Overall status: \*\*OK\*\*/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf compare script: applies warm-sample trim to avoid single-outlier regressions", () => {
    const tempDir = createTempDir("perf-compare-trim-");
    try {
        const budgetPath = path.join(tempDir, "perf-budget.json");
        writeJson(budgetPath, {
            http: {
                default: {
                    p95TrimTopCount: 1
                }
            },
            regression: {
                browser: {
                    default: {
                        requestCountRegressionPctMax: 25,
                        domContentLoadedP50RegressionPctMax: 25,
                        loadP50RegressionPctMax: 25
                    }
                },
                http: {
                    default: {
                        p95RegressionPctMax: 15
                    }
                }
            }
        });

        const baselineBrowser = path.join(tempDir, "browser-baseline.json");
        const currentBrowser = path.join(tempDir, "browser-current.json");
        writeBrowserJson(baselineBrowser, { requestAvg: 10, domP50: 1000, loadP50: 1000 });
        writeBrowserJson(currentBrowser, { requestAvg: 10, domP50: 1020, loadP50: 1030 });

        const baselineHttp = path.join(tempDir, "http-baseline.tsv");
        const currentHttp = path.join(tempDir, "http-current.tsv");
        writeHttpTsv(baselineHttp, [0.020, 0.020, 0.020, 0.020]);
        writeHttpTsv(currentHttp, [0.020, 0.020, 0.020, 0.250]);

        const baselineManifest = path.join(tempDir, "baseline-manifest.json");
        const currentManifest = path.join(tempDir, "current-manifest.json");
        writeManifest(baselineManifest, path.basename(baselineBrowser), path.basename(baselineHttp));
        writeManifest(currentManifest, path.basename(currentBrowser), path.basename(currentHttp));

        const reportPath = path.join(tempDir, "report.md");
        const result = runCompare(
            [
                "--manifest", currentManifest,
                "--baseline-manifest", baselineManifest,
                "--budget", budgetPath,
                "--out", reportPath
            ],
            tempDir
        );

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        const reportText = fs.readFileSync(reportPath, "utf8");
        assert.match(reportText, /Overall status: \*\*OK\*\*/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf compare script: applies absolute-delta budget for low baseline p95", () => {
    const tempDir = createTempDir("perf-compare-abs-delta-");
    try {
        const budgetPath = path.join(tempDir, "perf-budget.json");
        writeJson(budgetPath, {
            regression: {
                browser: {
                    default: {
                        requestCountRegressionPctMax: 25,
                        domContentLoadedP50RegressionPctMax: 25,
                        loadP50RegressionPctMax: 25
                    }
                },
                http: {
                    default: {
                        p95RegressionPctMax: 25,
                        p95RegressionBaselineMinMs: 30,
                        p95RegressionAbsDeltaMaxMs: 5
                    }
                }
            }
        });

        const baselineBrowser = path.join(tempDir, "browser-baseline.json");
        const currentBrowser = path.join(tempDir, "browser-current.json");
        writeBrowserJson(baselineBrowser, { requestAvg: 10, domP50: 1000, loadP50: 1000 });
        writeBrowserJson(currentBrowser, { requestAvg: 10, domP50: 1001, loadP50: 1002 });

        const baselineHttp = path.join(tempDir, "http-baseline.tsv");
        const currentHttp = path.join(tempDir, "http-current.tsv");
        writeHttpTsv(baselineHttp, [0.020, 0.021, 0.019]);
        writeHttpTsv(currentHttp, [0.027, 0.026, 0.026]);

        const baselineManifest = path.join(tempDir, "baseline-manifest.json");
        const currentManifest = path.join(tempDir, "current-manifest.json");
        writeManifest(baselineManifest, path.basename(baselineBrowser), path.basename(baselineHttp));
        writeManifest(currentManifest, path.basename(currentBrowser), path.basename(currentHttp));

        const reportPath = path.join(tempDir, "report.md");
        const result = runCompare(
            [
                "--manifest", currentManifest,
                "--baseline-manifest", baselineManifest,
                "--budget", budgetPath,
                "--out", reportPath
            ],
            tempDir
        );

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        const reportText = fs.readFileSync(reportPath, "utf8");
        assert.match(reportText, /warm\.p95\.ms\.regression\.absDelta/);
        assert.match(reportText, /Overall status: \*\*REGRESSION DETECTED\*\*/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
