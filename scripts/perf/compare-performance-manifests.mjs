#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DEFAULT_BUDGET_FILE = "scripts/perf/perf-budget.json";

function parseArgs(argv) {
    const options = {
        manifestFile: null,
        baselineManifestFile: null,
        outputFile: null,
        budgetFile: DEFAULT_BUDGET_FILE
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        const nextValue = argv[index + 1];
        if (token === "--manifest" && nextValue) {
            options.manifestFile = nextValue;
            index += 1;
            continue;
        }
        if (token === "--baseline-manifest" && nextValue) {
            options.baselineManifestFile = nextValue;
            index += 1;
            continue;
        }
        if (token === "--out" && nextValue) {
            options.outputFile = nextValue;
            index += 1;
            continue;
        }
        if (token === "--budget" && nextValue) {
            options.budgetFile = nextValue;
            index += 1;
            continue;
        }
        if (token === "--help" || token === "-h") {
            printHelpAndExit(0);
        }
    }

    if (!options.manifestFile || !options.baselineManifestFile || !options.outputFile) {
        printHelpAndExit(1);
    }

    return options;
}

function printHelpAndExit(exitCode) {
    console.log("Usage: node scripts/perf/compare-performance-manifests.mjs [options]");
    console.log("");
    console.log("Options:");
    console.log("  --manifest <path>           Current perf contour manifest");
    console.log("  --baseline-manifest <path>  Baseline perf contour manifest");
    console.log("  --out <path>                Output markdown report file");
    console.log(`  --budget <path>             Budget config JSON file (default: ${DEFAULT_BUDGET_FILE})`);
    process.exit(exitCode);
}

function toAbsolute(workdir, maybePath) {
    return path.isAbsolute(maybePath) ? maybePath : path.join(workdir, maybePath);
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolvePathFromManifest(manifestPath, value, workdir) {
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
    const browserFile = resolvePathFromManifest(
        manifestPath,
        manifest.browserMetricsJson ?? manifest.browserFile ?? null,
        workdir
    );
    const httpFile = resolvePathFromManifest(
        manifestPath,
        manifest.httpMetricsTsv ?? manifest.httpFile ?? null,
        workdir
    );

    if (!browserFile || !httpFile) {
        throw new Error(`Invalid contour manifest '${manifestPath}'. Missing browser/http artifact references.`);
    }

    return {
        manifest,
        browserFile,
        httpFile
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
        return new Map();
    }

    const grouped = new Map();
    for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
        const columns = lines[rowIndex].split("\t");
        if (columns.length < 7) {
            continue;
        }

        const endpoint = columns[0];
        const iteration = columns[2];
        const timeTotal = Number(columns[3]);
        if (iteration === "cold" || !Number.isFinite(timeTotal)) {
            continue;
        }

        const current = grouped.get(endpoint) ?? [];
        current.push(timeTotal * 1000);
        grouped.set(endpoint, current);
    }

    return grouped;
}

function computePercentDelta(currentValue, baselineValue) {
    if (!Number.isFinite(currentValue) || !Number.isFinite(baselineValue)) {
        return NaN;
    }
    if (baselineValue === 0) {
        return currentValue === 0 ? 0 : NaN;
    }
    return ((currentValue - baselineValue) / baselineValue) * 100;
}

function toValidTrimTopCount(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 0;
    }

    const floored = Math.floor(numeric);
    return floored > 0 ? floored : 0;
}

function applyWarmSampleTrim(samples, trimTopCount) {
    const safeSamples = Array.isArray(samples)
        ? samples.filter((value) => Number.isFinite(value))
        : [];
    const trim = toValidTrimTopCount(trimTopCount);
    if (trim <= 0 || safeSamples.length <= trim) {
        return safeSamples;
    }

    const sorted = [...safeSamples].sort((left, right) => left - right);
    return sorted.slice(0, sorted.length - trim);
}

function formatNumber(value, digits = 2) {
    if (!Number.isFinite(value)) {
        return "n/a";
    }
    return value.toFixed(digits);
}

function formatPercent(value) {
    if (!Number.isFinite(value)) {
        return "n/a";
    }
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
}

function formatDeltaByMetric(value, metric) {
    if (metric === "warm.p95.ms.regression.absDelta") {
        if (!Number.isFinite(value)) {
            return "n/a";
        }
        const sign = value > 0 ? "+" : "";
        return `${sign}${value.toFixed(2)} ms`;
    }

    return formatPercent(value);
}

function formatThresholdByMetric(value, metric) {
    if (metric === "warm.p95.ms.regression.absDelta") {
        return Number.isFinite(value) ? `${value.toFixed(2)} ms` : "n/a";
    }

    return formatPercent(value);
}

function buildThresholdResolver(defaultThresholds, scopedThresholds, metricKey) {
    return (scopeKey) => {
        const scoped = scopedThresholds?.[scopeKey] ?? {};
        const scopedValue = scoped?.[metricKey];
        if (Number.isFinite(scopedValue)) {
            return scopedValue;
        }
        const defaultValue = defaultThresholds?.[metricKey];
        return Number.isFinite(defaultValue) ? defaultValue : NaN;
    };
}

function mergeNestedBudgets(defaultBudget, overrideBudget) {
    return {
        ...(defaultBudget || {}),
        ...(overrideBudget || {})
    };
}

function statusFromDelta(deltaPct, thresholdPct) {
    if (!Number.isFinite(deltaPct)) {
        return "N/A";
    }
    if (!Number.isFinite(thresholdPct)) {
        return "INFO";
    }
    return deltaPct > thresholdPct ? "REGRESSION" : "OK";
}

function buildBrowserRows(currentBrowser, baselineBrowser, budgetConfig) {
    const currentByPage = new Map((currentBrowser.results || []).map((row) => [row.page, row]));
    const baselineByPage = new Map((baselineBrowser.results || []).map((row) => [row.page, row]));
    const pages = [...currentByPage.keys()].filter((page) => baselineByPage.has(page)).sort();

    const regressionBudget = budgetConfig.regression?.browser || {};
    const defaultBudget = regressionBudget.default || {};
    const pageBudgets = regressionBudget.pages || {};
    const resolveRequestThreshold = buildThresholdResolver(defaultBudget, pageBudgets, "requestCountRegressionPctMax");
    const resolveDomThreshold = buildThresholdResolver(defaultBudget, pageBudgets, "domContentLoadedP50RegressionPctMax");
    const resolveLoadThreshold = buildThresholdResolver(defaultBudget, pageBudgets, "loadP50RegressionPctMax");

    const rows = [];
    let checksTotal = 0;
    let regressionsTotal = 0;

    for (const page of pages) {
        const current = currentByPage.get(page);
        const baseline = baselineByPage.get(page);
        const baselineRequest = Number(baseline?.requestCount?.avg ?? NaN);
        const currentRequest = Number(current?.requestCount?.avg ?? NaN);
        const baselineDom = Number(baseline?.domContentLoadedMs?.p50 ?? NaN);
        const currentDom = Number(current?.domContentLoadedMs?.p50 ?? NaN);
        const baselineLoad = Number(baseline?.loadMs?.p50 ?? NaN);
        const currentLoad = Number(current?.loadMs?.p50 ?? NaN);

        const requestDelta = computePercentDelta(currentRequest, baselineRequest);
        const domDelta = computePercentDelta(currentDom, baselineDom);
        const loadDelta = computePercentDelta(currentLoad, baselineLoad);

        const requestThreshold = resolveRequestThreshold(page);
        const domThreshold = resolveDomThreshold(page);
        const loadThreshold = resolveLoadThreshold(page);

        const requestStatus = statusFromDelta(requestDelta, requestThreshold);
        const domStatus = statusFromDelta(domDelta, domThreshold);
        const loadStatus = statusFromDelta(loadDelta, loadThreshold);

        const statuses = [requestStatus, domStatus, loadStatus];
        checksTotal += statuses.filter((status) => status !== "N/A").length;
        regressionsTotal += statuses.filter((status) => status === "REGRESSION").length;

        rows.push({
            page,
            baselineRequest,
            currentRequest,
            requestDelta,
            requestThreshold,
            requestStatus,
            baselineDom,
            currentDom,
            domDelta,
            domThreshold,
            domStatus,
            baselineLoad,
            currentLoad,
            loadDelta,
            loadThreshold,
            loadStatus
        });
    }

    return {
        rows,
        checksTotal,
        regressionsTotal
    };
}

function buildHttpRows(currentHttpByEndpoint, baselineHttpByEndpoint, budgetConfig) {
    const currentEndpoints = new Set(currentHttpByEndpoint.keys());
    const endpoints = [...currentEndpoints].filter((endpoint) => baselineHttpByEndpoint.has(endpoint)).sort();

    const regressionBudget = budgetConfig.regression?.http || {};
    const regressionDefaultBudget = regressionBudget.default || {};
    const regressionEndpointBudgets = regressionBudget.endpoints || {};
    const absoluteHttpBudget = budgetConfig.http || {};
    const absoluteDefaultBudget = absoluteHttpBudget.default || {};
    const absoluteEndpointBudgets = absoluteHttpBudget.endpoints || {};

    const rows = [];
    let checksTotal = 0;
    let regressionsTotal = 0;

    for (const endpoint of endpoints) {
        const absoluteBudget = mergeNestedBudgets(absoluteDefaultBudget, absoluteEndpointBudgets[endpoint]);
        const regressionScopedBudget = mergeNestedBudgets(regressionDefaultBudget, regressionEndpointBudgets[endpoint]);
        const budget = mergeNestedBudgets(absoluteBudget, regressionScopedBudget);

        const baselineP95 = percentile(
            applyWarmSampleTrim(baselineHttpByEndpoint.get(endpoint) || [], budget.p95TrimTopCount),
            95);
        const currentP95 = percentile(
            applyWarmSampleTrim(currentHttpByEndpoint.get(endpoint) || [], budget.p95TrimTopCount),
            95);

        const baselineMinForPct = Number.isFinite(budget.p95RegressionBaselineMinMs)
            ? Number(budget.p95RegressionBaselineMinMs)
            : null;
        const useAbsoluteDeltaBudget = Number.isFinite(budget.p95RegressionAbsDeltaMaxMs)
            && Number.isFinite(currentP95)
            && Number.isFinite(baselineP95)
            && Number.isFinite(baselineMinForPct)
            && baselineP95 < baselineMinForPct;

        let delta = NaN;
        let threshold = NaN;
        let status = "N/A";
        let metric = "warm.p95.ms.regression.pct";

        if (useAbsoluteDeltaBudget) {
            metric = "warm.p95.ms.regression.absDelta";
            delta = currentP95 - baselineP95;
            threshold = Number(budget.p95RegressionAbsDeltaMaxMs);
            status = statusFromDelta(delta, threshold);
        } else if (!Number.isFinite(baselineMinForPct) ||
            !Number.isFinite(baselineP95) ||
            baselineP95 >= baselineMinForPct) {
            delta = computePercentDelta(currentP95, baselineP95);
            threshold = Number(budget.p95RegressionPctMax);
            status = statusFromDelta(delta, threshold);
        }

        if (status !== "N/A") {
            checksTotal += 1;
            if (status === "REGRESSION") {
                regressionsTotal += 1;
            }
        }

        rows.push({
            endpoint,
            baselineP95,
            currentP95,
            metric,
            delta,
            threshold,
            status
        });
    }

    return {
        rows,
        checksTotal,
        regressionsTotal
    };
}

function renderBrowserTable(rows) {
    const lines = [
        "| Page | Req (base) | Req (cur) | Δ Req | Threshold | Status | DOM p50 (base ms) | DOM p50 (cur ms) | Δ DOM | Threshold | Status | Load p50 (base ms) | Load p50 (cur ms) | Δ Load | Threshold | Status |",
        "|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---|"
    ];

    for (const row of rows) {
        lines.push(
            `| ${row.page} | ${formatNumber(row.baselineRequest, 1)} | ${formatNumber(row.currentRequest, 1)} | ${formatPercent(row.requestDelta)} | ${formatPercent(row.requestThreshold)} | ${row.requestStatus} | ${formatNumber(row.baselineDom, 1)} | ${formatNumber(row.currentDom, 1)} | ${formatPercent(row.domDelta)} | ${formatPercent(row.domThreshold)} | ${row.domStatus} | ${formatNumber(row.baselineLoad, 1)} | ${formatNumber(row.currentLoad, 1)} | ${formatPercent(row.loadDelta)} | ${formatPercent(row.loadThreshold)} | ${row.loadStatus} |`
        );
    }

    return lines.join("\n");
}

function renderHttpTable(rows) {
    const lines = [
        "| Endpoint | Warm p95 (base ms) | Warm p95 (cur ms) | Rule | Δ p95 | Threshold | Status |",
        "|---|---:|---:|---|---:|---:|---|"
    ];

    for (const row of rows) {
        lines.push(
            `| ${row.endpoint} | ${formatNumber(row.baselineP95, 2)} | ${formatNumber(row.currentP95, 2)} | ${row.metric} | ${formatDeltaByMetric(row.delta, row.metric)} | ${formatThresholdByMetric(row.threshold, row.metric)} | ${row.status} |`
        );
    }

    return lines.join("\n");
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    const workdir = process.cwd();
    const manifestFile = toAbsolute(workdir, options.manifestFile);
    const baselineManifestFile = toAbsolute(workdir, options.baselineManifestFile);
    const outputFile = toAbsolute(workdir, options.outputFile);
    const budgetFile = toAbsolute(workdir, options.budgetFile);

    const currentManifest = readContourManifest(manifestFile, workdir);
    const baselineManifest = readContourManifest(baselineManifestFile, workdir);
    const currentBrowser = readJson(currentManifest.browserFile);
    const baselineBrowser = readJson(baselineManifest.browserFile);
    const currentHttp = parseHttpMetrics(currentManifest.httpFile);
    const baselineHttp = parseHttpMetrics(baselineManifest.httpFile);
    const budgetConfig = readJson(budgetFile);

    const browser = buildBrowserRows(currentBrowser, baselineBrowser, budgetConfig);
    const http = buildHttpRows(currentHttp, baselineHttp, budgetConfig);
    const totalChecks = browser.checksTotal + http.checksTotal;
    const totalRegressions = browser.regressionsTotal + http.regressionsTotal;
    const overallStatus = totalRegressions > 0 ? "REGRESSION DETECTED" : "OK";

    const report = [
        "# Performance Regression Report",
        "",
        `Generated at: ${new Date().toISOString()}`,
        `Current manifest: ${manifestFile}`,
        `Baseline manifest: ${baselineManifestFile}`,
        `Budget profile: ${budgetFile}`,
        "",
        `Overall status: **${overallStatus}**`,
        `Checks: **${totalChecks}**`,
        `Regressions: **${totalRegressions}**`,
        "",
        "## Browser Regression (baseline -> current)",
        "",
        renderBrowserTable(browser.rows),
        "",
        "## HTTP Warm p95 Regression (baseline -> current)",
        "",
        renderHttpTable(http.rows),
        ""
    ].join("\n");

    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, report, "utf8");

    console.log(`Performance regression report generated: ${outputFile}`);
    console.log(`Overall status: ${overallStatus}. Regressions: ${totalRegressions}/${totalChecks}`);
}

try {
    main();
} catch (error) {
    console.error(`[ERROR] ${error.message}`);
    process.exit(1);
}
