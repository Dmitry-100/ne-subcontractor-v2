"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const budgetScriptPath = path.resolve(__dirname, "../../scripts/perf/check-performance-budget.mjs");

function createTempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function writeHttpTsv(filePath, { warmCode = 200, warmTimeSec = 0.020 } = {}) {
    const lines = [
        "endpoint\tpath\titeration\ttime_total\ttime_starttransfer\tsize_download\thttp_code",
        "home\t/\tcold\t0.010\t0.009\t1024\t200",
        `home\t/\t1\t${warmTimeSec.toFixed(3)}\t0.010\t1024\t${warmCode}`
    ];
    fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function runBudget(args, cwd) {
    return spawnSync(
        process.execPath,
        [budgetScriptPath, ...args],
        {
            cwd,
            encoding: "utf8"
        }
    );
}

test("perf budget script: defaults to paired contour manifest when present", () => {
    const tempDir = createTempDir("perf-budget-manifest-");
    try {
        const budgetPath = path.join(tempDir, "perf-budget.json");
        writeJson(budgetPath, {
            browser: {
                default: {
                    requestCountAvgMax: 20,
                    failedRequestsSameOriginAvgMax: 0,
                    domContentLoadedP50MaxMs: 2000,
                    loadP50MaxMs: 3000
                }
            },
            http: {
                default: {
                    p95MaxMs: 100,
                    nonSuccessAllowed: 0
                }
            }
        });

        const browserPassPath = path.join(tempDir, "browser-metrics-20260101-000000.json");
        writeJson(browserPassPath, {
            results: [
                {
                    page: "home",
                    requestCount: { avg: 5 },
                    staticRequests: { avgFailedSameOrigin: 0 },
                    domContentLoadedMs: { p50: 200 },
                    loadMs: { p50: 400 }
                }
            ]
        });

        const browserFailPath = path.join(tempDir, "browser-metrics-20270101-000000.json");
        writeJson(browserFailPath, {
            results: [
                {
                    page: "home",
                    requestCount: { avg: 99 },
                    staticRequests: { avgFailedSameOrigin: 2 },
                    domContentLoadedMs: { p50: 6000 },
                    loadMs: { p50: 8000 }
                }
            ]
        });

        const httpPassPath = path.join(tempDir, "http-metrics-20260101-000000.tsv");
        writeHttpTsv(httpPassPath, { warmCode: 200 });
        const httpFailPath = path.join(tempDir, "http-metrics-20270101-000000.tsv");
        writeHttpTsv(httpFailPath, { warmCode: 500 });

        const manifestPath = path.join(tempDir, "perf-contour-latest.json");
        writeJson(manifestPath, {
            browserMetricsJson: path.basename(browserPassPath),
            httpMetricsTsv: path.basename(httpPassPath)
        });

        const result = runBudget(
            [
                "--artifacts-dir",
                tempDir,
                "--budget",
                budgetPath
            ],
            tempDir
        );

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        assert.match(result.stdout, /Contour manifest:/, "Expected manifest-based selection in output.");
        assert.doesNotMatch(result.stdout, new RegExp(browserFailPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
        assert.doesNotMatch(result.stdout, new RegExp(httpFailPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf budget script: fails fast when only one explicit artifact is provided without manifest", () => {
    const tempDir = createTempDir("perf-budget-single-arg-");
    try {
        const budgetPath = path.join(tempDir, "perf-budget.json");
        writeJson(budgetPath, {
            browser: { default: {} },
            http: { default: {} }
        });

        const browserPath = path.join(tempDir, "browser-metrics-20260101-000000.json");
        writeJson(browserPath, { results: [] });

        const result = runBudget(
            [
                "--artifacts-dir",
                tempDir,
                "--budget",
                budgetPath,
                "--browser-json",
                browserPath
            ],
            tempDir
        );

        const combinedOutput = `${result.stdout}\n${result.stderr}`;
        assert.notEqual(result.status, 0, "Expected non-zero exit code for incomplete explicit artifact args.");
        assert.match(
            combinedOutput,
            /Provide both '--browser-json' and '--http-tsv' together, or use '--manifest'/,
            "Expected clear validation message for incomplete explicit artifact args."
        );
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf budget script: fails when browser runtime error metrics exceed budget", () => {
    const tempDir = createTempDir("perf-budget-runtime-errors-");
    try {
        const budgetPath = path.join(tempDir, "perf-budget.json");
        writeJson(budgetPath, {
            browser: {
                default: {
                    runtimeConsoleErrorsAvgMax: 0,
                    runtimePageErrorsAvgMax: 0
                }
            },
            http: {
                default: {}
            }
        });

        const browserPath = path.join(tempDir, "browser-metrics-20260101-000000.json");
        writeJson(browserPath, {
            results: [
                {
                    page: "home",
                    runtimeErrors: {
                        avgConsoleErrors: 1,
                        avgPageErrors: 0,
                        avgTotalErrors: 1
                    },
                    requestCount: { avg: 1 },
                    staticRequests: { avgFailedSameOrigin: 0 },
                    domContentLoadedMs: { p50: 100 },
                    loadMs: { p50: 100 }
                }
            ]
        });

        const httpPath = path.join(tempDir, "http-metrics-20260101-000000.tsv");
        writeHttpTsv(httpPath, { warmCode: 200 });

        const result = runBudget(
            [
                "--artifacts-dir",
                tempDir,
                "--budget",
                budgetPath,
                "--browser-json",
                browserPath,
                "--http-tsv",
                httpPath
            ],
            tempDir
        );

        const combinedOutput = `${result.stdout}\n${result.stderr}`;
        assert.notEqual(result.status, 0, "Expected non-zero exit code when runtime errors exceed budget.");
        assert.match(
            combinedOutput,
            /runtimeErrors\.avgConsoleErrors/,
            "Expected runtime error metric failure to appear in output.");
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf budget script: fails when browser/http regression budget is exceeded", () => {
    const tempDir = createTempDir("perf-budget-regression-");
    try {
        const budgetPath = path.join(tempDir, "perf-budget.json");
        writeJson(budgetPath, {
            browser: { default: {} },
            http: { default: {} },
            regression: {
                browser: {
                    default: {
                        loadP50RegressionPctMax: 10,
                        domContentLoadedP50RegressionPctMax: 10,
                        requestCountRegressionPctMax: 10
                    }
                },
                http: {
                    default: {
                        p95RegressionPctMax: 10
                    }
                }
            }
        });

        const baselineBrowserPath = path.join(tempDir, "browser-baseline.json");
        writeJson(baselineBrowserPath, {
            results: [
                {
                    page: "home",
                    requestCount: { avg: 10 },
                    staticRequests: { avgFailedSameOrigin: 0 },
                    domContentLoadedMs: { p50: 1000 },
                    loadMs: { p50: 1000 }
                }
            ]
        });
        const currentBrowserPath = path.join(tempDir, "browser-current.json");
        writeJson(currentBrowserPath, {
            results: [
                {
                    page: "home",
                    requestCount: { avg: 13 },
                    staticRequests: { avgFailedSameOrigin: 0 },
                    domContentLoadedMs: { p50: 1300 },
                    loadMs: { p50: 1250 }
                }
            ]
        });

        const baselineHttpPath = path.join(tempDir, "http-baseline.tsv");
        writeHttpTsv(baselineHttpPath, { warmCode: 200, warmTimeSec: 0.020 });
        const currentHttpPath = path.join(tempDir, "http-current.tsv");
        writeHttpTsv(currentHttpPath, { warmCode: 200, warmTimeSec: 0.026 });

        const result = runBudget(
            [
                "--budget",
                budgetPath,
                "--browser-json",
                currentBrowserPath,
                "--http-tsv",
                currentHttpPath,
                "--baseline-browser-json",
                baselineBrowserPath,
                "--baseline-http-tsv",
                baselineHttpPath
            ],
            tempDir
        );

        const combinedOutput = `${result.stdout}\n${result.stderr}`;
        assert.notEqual(result.status, 0, "Expected non-zero exit code when regression budgets are exceeded.");
        assert.match(
            combinedOutput,
            /browser-regression:home load\.p50\.ms\.regression\.pct/,
            "Expected browser regression check in output."
        );
        assert.match(
            combinedOutput,
            /http-regression:home warm\.p95\.ms\.regression\.pct/,
            "Expected HTTP regression check in output."
        );
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf budget script: uses absolute-delta HTTP regression checks for low-latency baselines", () => {
    const tempDir = createTempDir("perf-budget-regression-abs-");
    try {
        const budgetPath = path.join(tempDir, "perf-budget.json");
        writeJson(budgetPath, {
            browser: { default: {} },
            http: { default: {} },
            regression: {
                browser: { default: {} },
                http: {
                    default: {
                        p95RegressionPctMax: 10,
                        p95RegressionBaselineMinMs: 20,
                        p95RegressionAbsDeltaMaxMs: 5
                    }
                }
            }
        });

        const baselineBrowserPath = path.join(tempDir, "browser-baseline.json");
        writeJson(baselineBrowserPath, { results: [] });
        const currentBrowserPath = path.join(tempDir, "browser-current.json");
        writeJson(currentBrowserPath, { results: [] });

        const baselineHttpPath = path.join(tempDir, "http-baseline.tsv");
        writeHttpTsv(baselineHttpPath, { warmCode: 200, warmTimeSec: 0.010 });
        const currentHttpPath = path.join(tempDir, "http-current.tsv");
        writeHttpTsv(currentHttpPath, { warmCode: 200, warmTimeSec: 0.025 });

        const result = runBudget(
            [
                "--budget",
                budgetPath,
                "--browser-json",
                currentBrowserPath,
                "--http-tsv",
                currentHttpPath,
                "--baseline-browser-json",
                baselineBrowserPath,
                "--baseline-http-tsv",
                baselineHttpPath
            ],
            tempDir
        );

        const combinedOutput = `${result.stdout}\n${result.stderr}`;
        assert.notEqual(result.status, 0, "Expected non-zero exit code when abs-delta regression budget is exceeded.");
        assert.match(
            combinedOutput,
            /http-regression:home warm\.p95\.ms\.regression\.absDelta/,
            "Expected abs-delta regression check in output."
        );
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf budget script: supports HTTP p95 trim-top samples to reduce single outlier impact", () => {
    const tempDir = createTempDir("perf-budget-trim-top-");
    try {
        const budgetPath = path.join(tempDir, "perf-budget.json");
        writeJson(budgetPath, {
            browser: {
                default: {}
            },
            http: {
                default: {
                    p95MaxMs: 30,
                    nonSuccessAllowed: 0,
                    p95TrimTopCount: 1
                }
            }
        });

        const browserPath = path.join(tempDir, "browser.json");
        writeJson(browserPath, {
            results: []
        });

        const httpPath = path.join(tempDir, "http.tsv");
        const lines = [
            "endpoint\tpath\titeration\ttime_total\ttime_starttransfer\tsize_download\thttp_code",
            "home\t/\tcold\t0.010\t0.009\t1024\t200",
            "home\t/\t1\t0.010\t0.009\t1024\t200",
            "home\t/\t2\t0.011\t0.009\t1024\t200",
            "home\t/\t3\t0.012\t0.009\t1024\t200",
            "home\t/\t4\t0.200\t0.009\t1024\t200"
        ];
        fs.writeFileSync(httpPath, `${lines.join("\n")}\n`, "utf8");

        const result = runBudget(
            [
                "--budget",
                budgetPath,
                "--browser-json",
                browserPath,
                "--http-tsv",
                httpPath
            ],
            tempDir
        );

        assert.equal(result.status, 0, `Expected success with trim-top outlier.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf budget script: fails fast when only one explicit baseline artifact is provided without baseline manifest", () => {
    const tempDir = createTempDir("perf-budget-baseline-single-arg-");
    try {
        const budgetPath = path.join(tempDir, "perf-budget.json");
        writeJson(budgetPath, {
            browser: { default: {} },
            http: { default: {} }
        });

        const browserPath = path.join(tempDir, "browser-metrics-20260101-000000.json");
        writeJson(browserPath, { results: [] });
        const httpPath = path.join(tempDir, "http-metrics-20260101-000000.tsv");
        writeHttpTsv(httpPath, { warmCode: 200 });
        const baselineBrowserPath = path.join(tempDir, "browser-baseline.json");
        writeJson(baselineBrowserPath, { results: [] });

        const result = runBudget(
            [
                "--budget",
                budgetPath,
                "--browser-json",
                browserPath,
                "--http-tsv",
                httpPath,
                "--baseline-browser-json",
                baselineBrowserPath
            ],
            tempDir
        );

        const combinedOutput = `${result.stdout}\n${result.stderr}`;
        assert.notEqual(result.status, 0, "Expected non-zero exit code for incomplete baseline artifact args.");
        assert.match(
            combinedOutput,
            /Provide both '--baseline-browser-json' and '--baseline-http-tsv' together, or use '--baseline-manifest'/,
            "Expected clear validation message for incomplete explicit baseline artifact args."
        );
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf budget script: writes markdown report for passing contour", () => {
    const tempDir = createTempDir("perf-budget-report-pass-");
    try {
        const budgetPath = path.join(tempDir, "perf-budget.json");
        writeJson(budgetPath, {
            browser: {
                default: {
                    requestCountAvgMax: 20,
                    failedRequestsSameOriginAvgMax: 0,
                    domContentLoadedP50MaxMs: 2000,
                    loadP50MaxMs: 3000
                }
            },
            http: {
                default: {
                    p95MaxMs: 100,
                    nonSuccessAllowed: 0
                }
            }
        });

        const browserPath = path.join(tempDir, "browser.json");
        writeJson(browserPath, {
            results: [
                {
                    page: "home",
                    requestCount: { avg: 5 },
                    staticRequests: { avgFailedSameOrigin: 0 },
                    domContentLoadedMs: { p50: 150 },
                    loadMs: { p50: 300 }
                }
            ]
        });
        const httpPath = path.join(tempDir, "http.tsv");
        writeHttpTsv(httpPath, { warmCode: 200, warmTimeSec: 0.012 });
        const reportPath = path.join(tempDir, "budget-report.md");

        const result = runBudget(
            [
                "--budget",
                budgetPath,
                "--browser-json",
                browserPath,
                "--http-tsv",
                httpPath,
                "--report-md",
                reportPath
            ],
            tempDir
        );

        assert.equal(result.status, 0, `Expected success with report.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
        assert.ok(fs.existsSync(reportPath), "Expected markdown report file to be created.");
        const reportContent = fs.readFileSync(reportPath, "utf8");
        assert.match(reportContent, /# Performance Budget Report/);
        assert.match(reportContent, /- Result: `PASS`/);
        assert.match(reportContent, /- Failed checks: `0`/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("perf budget script: writes markdown report for failed contour", () => {
    const tempDir = createTempDir("perf-budget-report-fail-");
    try {
        const budgetPath = path.join(tempDir, "perf-budget.json");
        writeJson(budgetPath, {
            browser: {
                default: {
                    requestCountAvgMax: 0
                }
            },
            http: {
                default: {}
            }
        });

        const browserPath = path.join(tempDir, "browser.json");
        writeJson(browserPath, {
            results: [
                {
                    page: "home",
                    requestCount: { avg: 1 },
                    staticRequests: { avgFailedSameOrigin: 0 },
                    domContentLoadedMs: { p50: 100 },
                    loadMs: { p50: 100 }
                }
            ]
        });
        const httpPath = path.join(tempDir, "http.tsv");
        writeHttpTsv(httpPath, { warmCode: 200, warmTimeSec: 0.010 });
        const reportPath = path.join(tempDir, "budget-report.md");

        const result = runBudget(
            [
                "--budget",
                budgetPath,
                "--browser-json",
                browserPath,
                "--http-tsv",
                httpPath,
                "--report-md",
                reportPath
            ],
            tempDir
        );

        assert.notEqual(result.status, 0, "Expected failure when requestCount exceeds budget.");
        assert.ok(fs.existsSync(reportPath), "Expected markdown report file to be created even on failure.");
        const reportContent = fs.readFileSync(reportPath, "utf8");
        assert.match(reportContent, /- Result: `FAIL`/);
        assert.match(reportContent, /\| browser \| home \| requestCount\.avg \|/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
