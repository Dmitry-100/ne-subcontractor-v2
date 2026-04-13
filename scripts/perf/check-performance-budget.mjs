#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DEFAULT_ARTIFACTS_DIR = "artifacts/perf";
const DEFAULT_BUDGET_FILE = "scripts/perf/perf-budget.json";

function parseArgs(argv) {
    const options = {
        artifactsDir: DEFAULT_ARTIFACTS_DIR,
        budgetFile: DEFAULT_BUDGET_FILE,
        manifestFile: null,
        browserFile: null,
        httpFile: null,
        baselineManifestFile: null,
        baselineBrowserFile: null,
        baselineHttpFile: null,
        reportMarkdownFile: null
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        const nextValue = argv[index + 1];
        if (token === "--artifacts-dir" && nextValue) {
            options.artifactsDir = nextValue;
            index += 1;
            continue;
        }
        if (token === "--budget" && nextValue) {
            options.budgetFile = nextValue;
            index += 1;
            continue;
        }
        if (token === "--manifest" && nextValue) {
            options.manifestFile = nextValue;
            index += 1;
            continue;
        }
        if (token === "--browser-json" && nextValue) {
            options.browserFile = nextValue;
            index += 1;
            continue;
        }
        if (token === "--http-tsv" && nextValue) {
            options.httpFile = nextValue;
            index += 1;
            continue;
        }
        if (token === "--baseline-manifest" && nextValue) {
            options.baselineManifestFile = nextValue;
            index += 1;
            continue;
        }
        if (token === "--baseline-browser-json" && nextValue) {
            options.baselineBrowserFile = nextValue;
            index += 1;
            continue;
        }
        if (token === "--baseline-http-tsv" && nextValue) {
            options.baselineHttpFile = nextValue;
            index += 1;
            continue;
        }
        if (token === "--report-md" && nextValue) {
            options.reportMarkdownFile = nextValue;
            index += 1;
            continue;
        }
        if (token === "--help" || token === "-h") {
            printHelpAndExit(0);
        }
    }

    return options;
}

function printHelpAndExit(exitCode) {
    console.log("Usage: node scripts/perf/check-performance-budget.mjs [options]");
    console.log("");
    console.log("Options:");
    console.log("  --artifacts-dir <path>   Directory with perf artifacts (default: artifacts/perf)");
    console.log("  --budget <path>          Budget config JSON file (default: scripts/perf/perf-budget.json)");
    console.log("  --manifest <path>        Explicit perf contour manifest JSON file");
    console.log("  --browser-json <path>    Explicit browser metrics JSON file");
    console.log("  --http-tsv <path>        Explicit HTTP metrics TSV file");
    console.log("  --baseline-manifest <path>      Baseline perf contour manifest JSON file");
    console.log("  --baseline-browser-json <path>  Baseline browser metrics JSON file");
    console.log("  --baseline-http-tsv <path>      Baseline HTTP metrics TSV file");
    console.log("  --report-md <path>              Write markdown budget report to file");
    process.exit(exitCode);
}

function toAbsolute(workdir, maybePath) {
    if (!maybePath) {
        return null;
    }
    return path.isAbsolute(maybePath) ? maybePath : path.join(workdir, maybePath);
}

function findLatestFile(dir, prefix, extension) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const matched = entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => name.startsWith(prefix) && name.endsWith(extension))
        .sort();

    if (matched.length === 0) {
        throw new Error(`No files found in '${dir}' by pattern '${prefix}*${extension}'.`);
    }

    return path.join(dir, matched[matched.length - 1]);
}

function findLatestContourManifest(dir) {
    const latestAlias = path.join(dir, "perf-contour-latest.json");
    if (fs.existsSync(latestAlias)) {
        return latestAlias;
    }

    if (!fs.existsSync(dir)) {
        return null;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const matched = entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => /^perf-contour-\d{8}-\d{6}\.json$/.test(name))
        .sort();

    if (matched.length === 0) {
        return null;
    }

    return path.join(dir, matched[matched.length - 1]);
}

function resolveManifestPath(manifestPath, value, workdir) {
    if (!value) {
        return null;
    }
    if (path.isAbsolute(value)) {
        return value;
    }

    const fromWorkdir = path.join(workdir, value);
    if (fs.existsSync(fromWorkdir)) {
        return fromWorkdir;
    }

    return path.join(path.dirname(manifestPath), value);
}

function readContourManifest(manifestPath, workdir) {
    const manifest = readJson(manifestPath);
    const browserFileValue = manifest.browserMetricsJson ?? manifest.browserFile ?? null;
    const httpFileValue = manifest.httpMetricsTsv ?? manifest.httpFile ?? null;
    const browserFile = resolveManifestPath(manifestPath, browserFileValue, workdir);
    const httpFile = resolveManifestPath(manifestPath, httpFileValue, workdir);

    if (!browserFile || !httpFile) {
        throw new Error(
            `Perf contour manifest '${manifestPath}' is invalid. Expected browserMetricsJson/httpMetricsTsv fields.`
        );
    }

    return {
        browserFile,
        httpFile
    };
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function mergeBudget(defaultBudget, overrideBudget) {
    return {
        ...defaultBudget,
        ...(overrideBudget || {})
    };
}

function percentile(values, percentileRank) {
    if (!values.length) {
        return NaN;
    }
    const sorted = [...values].sort((left, right) => left - right);
    const rank = Math.ceil((percentileRank / 100) * sorted.length) - 1;
    const index = Math.max(0, Math.min(sorted.length - 1, rank));
    return sorted[index];
}

function parseHttpMetrics(tsvFilePath) {
    const lines = fs
        .readFileSync(tsvFilePath, "utf8")
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0);

    if (lines.length <= 1) {
        throw new Error(`HTTP metrics TSV file '${tsvFilePath}' does not contain data rows.`);
    }

    const groupedByEndpoint = new Map();
    for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
        const columns = lines[rowIndex].split("\t");
        if (columns.length < 7) {
            continue;
        }

        const endpoint = columns[0];
        const iteration = columns[2];
        const timeTotal = Number(columns[3]);
        const httpCode = Number(columns[6]);
        if (!Number.isFinite(timeTotal) || !Number.isFinite(httpCode)) {
            continue;
        }

        let endpointMetrics = groupedByEndpoint.get(endpoint);
        if (!endpointMetrics) {
            endpointMetrics = {
                warmMs: [],
                nonSuccessCount: 0
            };
            groupedByEndpoint.set(endpoint, endpointMetrics);
        }

        if (httpCode < 200 || httpCode >= 400) {
            endpointMetrics.nonSuccessCount += 1;
        }

        if (iteration !== "cold") {
            endpointMetrics.warmMs.push(timeTotal * 1000);
        }
    }

    return groupedByEndpoint;
}

function computeHttpSummaryByEndpoint(httpMetricsByEndpoint) {
    const summary = new Map();
    for (const [endpoint, endpointMetrics] of httpMetricsByEndpoint.entries()) {
        summary.set(endpoint, {
            p95: percentile(endpointMetrics.warmMs, 95),
            nonSuccessCount: endpointMetrics.nonSuccessCount
        });
    }
    return summary;
}

function toValidTrimTopCount(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 0;
    }
    const floored = Math.floor(numeric);
    return floored > 0 ? floored : 0;
}

function applyWarmSampleTrim(warmSamples, budget) {
    const samples = Array.isArray(warmSamples)
        ? warmSamples.filter((value) => Number.isFinite(value))
        : [];
    const trimTopCount = toValidTrimTopCount(budget?.p95TrimTopCount);

    if (trimTopCount <= 0 || samples.length <= trimTopCount) {
        return samples;
    }

    const sorted = [...samples].sort((left, right) => left - right);
    return sorted.slice(0, sorted.length - trimTopCount);
}

function computeRegressionPercent(currentValue, baselineValue) {
    if (!Number.isFinite(currentValue) || !Number.isFinite(baselineValue)) {
        return NaN;
    }

    if (baselineValue === 0) {
        if (currentValue === 0) {
            return 0;
        }
        return NaN;
    }

    return ((currentValue - baselineValue) / baselineValue) * 100;
}

function mergeNestedBudgets(defaultBudget, overrideBudget) {
    return {
        ...(defaultBudget || {}),
        ...(overrideBudget || {})
    };
}

function checkBrowserBudgets(browserMetrics, budgetConfig) {
    const failures = [];
    const checks = [];
    const browserBudget = budgetConfig.browser || {};
    const defaultBudget = browserBudget.default || {};
    const pageBudgets = browserBudget.pages || {};

    for (const pageResult of browserMetrics.results || []) {
        const budget = mergeBudget(defaultBudget, pageBudgets[pageResult.page]);
        const requestAvg = Number(pageResult?.requestCount?.avg ?? NaN);
        const failedSameOriginAvg = Number(
            pageResult?.staticRequests?.avgFailedSameOrigin
                ?? pageResult?.staticRequests?.avgFailed
                ?? NaN
        );
        const failedExternalAvg = Number(
            pageResult?.staticRequests?.avgFailedExternal
                ?? NaN
        );
        const runtimeConsoleErrorsAvg = Number(
            pageResult?.runtimeErrors?.avgConsoleErrors
                ?? 0
        );
        const runtimePageErrorsAvg = Number(
            pageResult?.runtimeErrors?.avgPageErrors
                ?? 0
        );
        const runtimeTotalErrorsAvg = Number(
            pageResult?.runtimeErrors?.avgTotalErrors
                ?? (Number.isFinite(runtimeConsoleErrorsAvg) && Number.isFinite(runtimePageErrorsAvg)
                    ? runtimeConsoleErrorsAvg + runtimePageErrorsAvg
                    : NaN)
        );
        const domP50 = Number(pageResult?.domContentLoadedMs?.p50 ?? NaN);
        const loadP50 = Number(pageResult?.loadMs?.p50 ?? NaN);
        const failedSameOriginThreshold = Number.isFinite(budget.failedRequestsSameOriginAvgMax)
            ? budget.failedRequestsSameOriginAvgMax
            : budget.failedRequestsAvgMax;

        checks.push({
            kind: "browser",
            key: pageResult.page,
            metric: "requestCount.avg",
            actual: requestAvg,
            threshold: budget.requestCountAvgMax
        });
        checks.push({
            kind: "browser",
            key: pageResult.page,
            metric: "staticRequests.avgFailedSameOrigin",
            actual: failedSameOriginAvg,
            threshold: failedSameOriginThreshold
        });
        if (Number.isFinite(budget.failedRequestsExternalAvgMax)) {
            checks.push({
                kind: "browser",
                key: pageResult.page,
                metric: "staticRequests.avgFailedExternal",
                actual: failedExternalAvg,
                threshold: budget.failedRequestsExternalAvgMax
            });
        }
        if (Number.isFinite(budget.runtimeConsoleErrorsAvgMax)) {
            checks.push({
                kind: "browser",
                key: pageResult.page,
                metric: "runtimeErrors.avgConsoleErrors",
                actual: runtimeConsoleErrorsAvg,
                threshold: budget.runtimeConsoleErrorsAvgMax
            });
        }
        if (Number.isFinite(budget.runtimePageErrorsAvgMax)) {
            checks.push({
                kind: "browser",
                key: pageResult.page,
                metric: "runtimeErrors.avgPageErrors",
                actual: runtimePageErrorsAvg,
                threshold: budget.runtimePageErrorsAvgMax
            });
        }
        if (Number.isFinite(budget.runtimeErrorsAvgMax)) {
            checks.push({
                kind: "browser",
                key: pageResult.page,
                metric: "runtimeErrors.avgTotalErrors",
                actual: runtimeTotalErrorsAvg,
                threshold: budget.runtimeErrorsAvgMax
            });
        }
        checks.push({
            kind: "browser",
            key: pageResult.page,
            metric: "domContentLoaded.p50.ms",
            actual: domP50,
            threshold: budget.domContentLoadedP50MaxMs
        });
        checks.push({
            kind: "browser",
            key: pageResult.page,
            metric: "load.p50.ms",
            actual: loadP50,
            threshold: budget.loadP50MaxMs
        });
    }

    for (const check of checks) {
        if (!Number.isFinite(check.threshold)) {
            continue;
        }
        if (!Number.isFinite(check.actual) || check.actual > check.threshold) {
            failures.push(check);
        }
    }

    return { checks, failures };
}

function checkBrowserRegressionBudgets(browserMetrics, baselineBrowserMetrics, budgetConfig) {
    const failures = [];
    const checks = [];
    const regressionBudget = budgetConfig.regression?.browser || {};
    const defaultBudget = regressionBudget.default || {};
    const pageBudgets = regressionBudget.pages || {};
    const baselineByPage = new Map(
        (baselineBrowserMetrics.results || []).map((result) => [result.page, result])
    );

    for (const pageResult of browserMetrics.results || []) {
        const baseline = baselineByPage.get(pageResult.page);
        if (!baseline) {
            continue;
        }

        const budget = mergeNestedBudgets(defaultBudget, pageBudgets[pageResult.page]);
        const currentRequestCount = Number(pageResult?.requestCount?.avg ?? NaN);
        const baselineRequestCount = Number(baseline?.requestCount?.avg ?? NaN);
        const currentDomP50 = Number(pageResult?.domContentLoadedMs?.p50 ?? NaN);
        const baselineDomP50 = Number(baseline?.domContentLoadedMs?.p50 ?? NaN);
        const currentLoadP50 = Number(pageResult?.loadMs?.p50 ?? NaN);
        const baselineLoadP50 = Number(baseline?.loadMs?.p50 ?? NaN);

        checks.push({
            kind: "browser-regression",
            key: pageResult.page,
            metric: "requestCount.avg.regression.pct",
            actual: computeRegressionPercent(currentRequestCount, baselineRequestCount),
            threshold: budget.requestCountRegressionPctMax
        });
        checks.push({
            kind: "browser-regression",
            key: pageResult.page,
            metric: "domContentLoaded.p50.ms.regression.pct",
            actual: computeRegressionPercent(currentDomP50, baselineDomP50),
            threshold: budget.domContentLoadedP50RegressionPctMax
        });
        checks.push({
            kind: "browser-regression",
            key: pageResult.page,
            metric: "load.p50.ms.regression.pct",
            actual: computeRegressionPercent(currentLoadP50, baselineLoadP50),
            threshold: budget.loadP50RegressionPctMax
        });
    }

    for (const check of checks) {
        if (!Number.isFinite(check.threshold)) {
            continue;
        }
        if (!Number.isFinite(check.actual) || check.actual > check.threshold) {
            failures.push(check);
        }
    }

    return { checks, failures };
}

function checkHttpBudgets(httpMetricsByEndpoint, budgetConfig) {
    const failures = [];
    const checks = [];
    const httpBudget = budgetConfig.http || {};
    const defaultBudget = httpBudget.default || {};
    const endpointBudgets = httpBudget.endpoints || {};

    for (const [endpoint, endpointMetrics] of httpMetricsByEndpoint.entries()) {
        const budget = mergeBudget(defaultBudget, endpointBudgets[endpoint]);
        const effectiveWarmSamples = applyWarmSampleTrim(endpointMetrics.warmMs, budget);
        const p95 = percentile(effectiveWarmSamples, 95);
        const nonSuccess = endpointMetrics.nonSuccessCount;
        checks.push({
            kind: "http",
            key: endpoint,
            metric: "warm.p95.ms",
            actual: p95,
            threshold: budget.p95MaxMs
        });
        checks.push({
            kind: "http",
            key: endpoint,
            metric: "nonSuccess.count",
            actual: nonSuccess,
            threshold: budget.nonSuccessAllowed
        });
    }

    for (const check of checks) {
        if (!Number.isFinite(check.threshold)) {
            continue;
        }
        if (!Number.isFinite(check.actual) || check.actual > check.threshold) {
            failures.push(check);
        }
    }

    return { checks, failures };
}

function checkHttpRegressionBudgets(httpMetricsByEndpoint, baselineHttpMetricsByEndpoint, budgetConfig) {
    const failures = [];
    const checks = [];
    const regressionBudget = budgetConfig.regression?.http || {};
    const defaultBudget = regressionBudget.default || {};
    const endpointBudgets = regressionBudget.endpoints || {};
    for (const [endpoint, currentMetrics] of httpMetricsByEndpoint.entries()) {
        const baselineMetrics = baselineHttpMetricsByEndpoint.get(endpoint);
        if (!baselineMetrics) {
            continue;
        }

        const budget = mergeNestedBudgets(defaultBudget, endpointBudgets[endpoint]);
        const currentWarmSamples = applyWarmSampleTrim(currentMetrics.warmMs, budget);
        const baselineWarmSamples = applyWarmSampleTrim(baselineMetrics.warmMs, budget);
        const currentP95 = percentile(currentWarmSamples, 95);
        const baselineP95 = percentile(baselineWarmSamples, 95);
        const baselineMinForPct = Number.isFinite(budget.p95RegressionBaselineMinMs)
            ? Number(budget.p95RegressionBaselineMinMs)
            : null;

        const useAbsoluteDeltaBudget = Number.isFinite(budget.p95RegressionAbsDeltaMaxMs)
            && Number.isFinite(currentP95)
            && Number.isFinite(baselineP95)
            && Number.isFinite(baselineMinForPct)
            && baselineP95 < baselineMinForPct;

        if (useAbsoluteDeltaBudget) {
            checks.push({
                kind: "http-regression",
                key: endpoint,
                metric: "warm.p95.ms.regression.absDelta",
                actual: currentP95 - baselineP95,
                threshold: budget.p95RegressionAbsDeltaMaxMs
            });
            continue;
        }

        if (Number.isFinite(baselineMinForPct) && Number.isFinite(baselineP95) && baselineP95 < baselineMinForPct) {
            continue;
        }

        checks.push({
            kind: "http-regression",
            key: endpoint,
            metric: "warm.p95.ms.regression.pct",
            actual: computeRegressionPercent(currentP95, baselineP95),
            threshold: budget.p95RegressionPctMax
        });
    }

    for (const check of checks) {
        if (!Number.isFinite(check.threshold)) {
            continue;
        }
        if (!Number.isFinite(check.actual) || check.actual > check.threshold) {
            failures.push(check);
        }
    }

    return { checks, failures };
}

function formatMetricValue(value) {
    if (!Number.isFinite(value)) {
        return "NaN";
    }
    if (Math.abs(value) >= 1000) {
        return value.toFixed(1);
    }
    return value.toFixed(2);
}

function printCheckStatus(check, passed) {
    const icon = passed ? "PASS" : "FAIL";
    console.log(
        `[${icon}] ${check.kind}:${check.key} ${check.metric} actual=${formatMetricValue(check.actual)} threshold=${formatMetricValue(check.threshold)}`
    );
}

function formatCheckMarkdownRow(check) {
    return `| ${check.kind} | ${check.key} | ${check.metric} | ${formatMetricValue(check.actual)} | ${formatMetricValue(check.threshold)} |`;
}

function buildChecksSummaryByKind(allChecks, allFailures) {
    const failedKeys = new Set(
        allFailures.map((failure) => `${failure.kind}|${failure.key}|${failure.metric}`)
    );
    const kindSummary = new Map();
    for (const check of allChecks) {
        const key = `${check.kind}|${check.key}|${check.metric}`;
        const isFailed = failedKeys.has(key);
        const current = kindSummary.get(check.kind) || { total: 0, failed: 0 };
        current.total += 1;
        if (isFailed) {
            current.failed += 1;
        }
        kindSummary.set(check.kind, current);
    }
    return kindSummary;
}

function buildBudgetReportMarkdown(reportInput) {
    const checksSummaryByKind = buildChecksSummaryByKind(reportInput.allChecks, reportInput.allFailures);
    const lines = [
        "# Performance Budget Report",
        "",
        `- Generated at: \`${new Date().toISOString()}\``,
        `- Result: \`${reportInput.allFailures.length > 0 ? "FAIL" : "PASS"}\``,
        `- Total checks: \`${reportInput.allChecks.length}\``,
        `- Failed checks: \`${reportInput.allFailures.length}\``,
        "",
        "## Inputs",
        "",
        `- Budget file: \`${reportInput.budgetFile}\``,
        `- Browser metrics: \`${reportInput.browserFile}\``,
        `- HTTP metrics: \`${reportInput.httpFile}\``
    ];

    if (reportInput.manifestFile) {
        lines.push(`- Contour manifest: \`${reportInput.manifestFile}\``);
    }
    if (reportInput.baselineManifestFile) {
        lines.push(`- Baseline contour manifest: \`${reportInput.baselineManifestFile}\``);
    }
    if (reportInput.baselineBrowserFile) {
        lines.push(`- Baseline browser metrics: \`${reportInput.baselineBrowserFile}\``);
    }
    if (reportInput.baselineHttpFile) {
        lines.push(`- Baseline HTTP metrics: \`${reportInput.baselineHttpFile}\``);
    }

    lines.push(
        "",
        "## Check Groups",
        "",
        "| Kind | Passed | Failed | Total |",
        "|---|---:|---:|---:|"
    );

    for (const [kind, summary] of checksSummaryByKind.entries()) {
        const passed = summary.total - summary.failed;
        lines.push(`| ${kind} | ${passed} | ${summary.failed} | ${summary.total} |`);
    }

    lines.push("", "## Failed Checks", "");

    if (reportInput.allFailures.length === 0) {
        lines.push("No failed checks.");
    } else {
        lines.push(
            "| Kind | Key | Metric | Actual | Threshold |",
            "|---|---|---|---:|---:|"
        );
        for (const failure of reportInput.allFailures) {
            lines.push(formatCheckMarkdownRow(failure));
        }
    }

    return `${lines.join("\n")}\n`;
}

function writeBudgetReportMarkdown(reportFilePath, reportInput) {
    if (!reportFilePath) {
        return null;
    }
    fs.mkdirSync(path.dirname(reportFilePath), { recursive: true });
    const markdown = buildBudgetReportMarkdown(reportInput);
    fs.writeFileSync(reportFilePath, markdown, "utf8");
    return reportFilePath;
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    const workdir = process.cwd();
    const artifactsDir = toAbsolute(workdir, options.artifactsDir);
    const budgetFile = toAbsolute(workdir, options.budgetFile);
    const reportMarkdownFile = toAbsolute(workdir, options.reportMarkdownFile);
    const hasExplicitBrowserFile = Boolean(options.browserFile);
    const hasExplicitHttpFile = Boolean(options.httpFile);
    if (hasExplicitBrowserFile !== hasExplicitHttpFile && !options.manifestFile) {
        throw new Error(
            "Provide both '--browser-json' and '--http-tsv' together, or use '--manifest' for a paired artifact selection."
        );
    }
    const hasExplicitBaselineBrowserFile = Boolean(options.baselineBrowserFile);
    const hasExplicitBaselineHttpFile = Boolean(options.baselineHttpFile);
    if (hasExplicitBaselineBrowserFile !== hasExplicitBaselineHttpFile && !options.baselineManifestFile) {
        throw new Error(
            "Provide both '--baseline-browser-json' and '--baseline-http-tsv' together, or use '--baseline-manifest' for a paired baseline artifact selection."
        );
    }

    let manifestFile = options.manifestFile ? toAbsolute(workdir, options.manifestFile) : null;
    let browserFile = hasExplicitBrowserFile ? toAbsolute(workdir, options.browserFile) : null;
    let httpFile = hasExplicitHttpFile ? toAbsolute(workdir, options.httpFile) : null;
    let baselineManifestFile = options.baselineManifestFile ? toAbsolute(workdir, options.baselineManifestFile) : null;
    let baselineBrowserFile = hasExplicitBaselineBrowserFile ? toAbsolute(workdir, options.baselineBrowserFile) : null;
    let baselineHttpFile = hasExplicitBaselineHttpFile ? toAbsolute(workdir, options.baselineHttpFile) : null;

    if (!manifestFile && (!browserFile || !httpFile)) {
        manifestFile = findLatestContourManifest(artifactsDir);
    }

    if (manifestFile) {
        const manifestFiles = readContourManifest(manifestFile, workdir);
        browserFile = browserFile ?? manifestFiles.browserFile;
        httpFile = httpFile ?? manifestFiles.httpFile;
    }

    if (baselineManifestFile) {
        const baselineManifestFiles = readContourManifest(baselineManifestFile, workdir);
        baselineBrowserFile = baselineBrowserFile ?? baselineManifestFiles.browserFile;
        baselineHttpFile = baselineHttpFile ?? baselineManifestFiles.httpFile;
    }

    browserFile = browserFile ?? findLatestFile(artifactsDir, "browser-metrics-", ".json");
    httpFile = httpFile ?? findLatestFile(artifactsDir, "http-metrics-", ".tsv");

    const budgetConfig = readJson(budgetFile);
    const browserMetrics = readJson(browserFile);
    const httpMetricsByEndpoint = parseHttpMetrics(httpFile);
    const baselineBrowserMetrics = baselineBrowserFile ? readJson(baselineBrowserFile) : null;
    const baselineHttpMetricsByEndpoint = baselineHttpFile ? parseHttpMetrics(baselineHttpFile) : null;

    const browserResult = checkBrowserBudgets(browserMetrics, budgetConfig);
    const httpResult = checkHttpBudgets(httpMetricsByEndpoint, budgetConfig);
    const browserRegressionResult = baselineBrowserMetrics
        ? checkBrowserRegressionBudgets(browserMetrics, baselineBrowserMetrics, budgetConfig)
        : { checks: [], failures: [] };
    const httpRegressionResult = baselineHttpMetricsByEndpoint
        ? checkHttpRegressionBudgets(httpMetricsByEndpoint, baselineHttpMetricsByEndpoint, budgetConfig)
        : { checks: [], failures: [] };

    console.log("Performance budget check");
    console.log(`Budget file: ${budgetFile}`);
    if (manifestFile) {
        console.log(`Contour manifest: ${manifestFile}`);
    }
    console.log(`Browser metrics: ${browserFile}`);
    console.log(`HTTP metrics: ${httpFile}`);
    if (baselineManifestFile) {
        console.log(`Baseline contour manifest: ${baselineManifestFile}`);
    }
    if (baselineBrowserFile) {
        console.log(`Baseline browser metrics: ${baselineBrowserFile}`);
    }
    if (baselineHttpFile) {
        console.log(`Baseline HTTP metrics: ${baselineHttpFile}`);
    }
    console.log("");

    const allChecks = [
        ...browserResult.checks,
        ...httpResult.checks,
        ...browserRegressionResult.checks,
        ...httpRegressionResult.checks
    ];
    const allFailures = [
        ...browserResult.failures,
        ...httpResult.failures,
        ...browserRegressionResult.failures,
        ...httpRegressionResult.failures
    ];
    const failedKey = new Set(allFailures.map((failure) => `${failure.kind}|${failure.key}|${failure.metric}`));

    for (const check of allChecks) {
        const key = `${check.kind}|${check.key}|${check.metric}`;
        printCheckStatus(check, !failedKey.has(key));
    }

    console.log("");
    console.log(`Total checks: ${allChecks.length}`);
    console.log(`Failed checks: ${allFailures.length}`);

    const writtenReportPath = writeBudgetReportMarkdown(reportMarkdownFile, {
        budgetFile: budgetFile,
        manifestFile: manifestFile,
        browserFile: browserFile,
        httpFile: httpFile,
        baselineManifestFile: baselineManifestFile,
        baselineBrowserFile: baselineBrowserFile,
        baselineHttpFile: baselineHttpFile,
        allChecks: allChecks,
        allFailures: allFailures
    });
    if (writtenReportPath) {
        console.log(`Budget report: ${writtenReportPath}`);
    }

    if (allFailures.length > 0) {
        process.exit(1);
    }
}

try {
    main();
} catch (error) {
    console.error(`[ERROR] ${error.message}`);
    process.exit(1);
}
