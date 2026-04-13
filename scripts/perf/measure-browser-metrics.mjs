import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.argv[2] || "http://localhost:5080";
const outDir = process.argv[3] || "artifacts/perf";
const iterations = Number(process.env.PERF_BROWSER_ITERATIONS || "5");
const warmupIterations = Number(process.env.PERF_BROWSER_WARMUP_ITERATIONS || "1");
const navigationAttempts = Math.max(1, Number(process.env.PERF_BROWSER_NAVIGATION_ATTEMPTS || "2"));

const pages = [
    { name: "home", path: "/" },
    { name: "projects-page", path: "/Home/Projects" },
    { name: "lots-page", path: "/Home/Lots" },
    { name: "procedures-page", path: "/Home/Procedures" },
    { name: "contracts-page", path: "/Home/Contracts" },
    { name: "contractors-page", path: "/Home/Contractors" },
    { name: "sla-page", path: "/Home/Sla" },
    { name: "admin-page", path: "/Home/Admin" }
];

function percentile(values, pct) {
    if (!Array.isArray(values) || values.length === 0) {
        return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
    return sorted[index];
}

function average(values) {
    if (!Array.isArray(values) || values.length === 0) {
        return 0;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toFixed(value) {
    return Number(value || 0).toFixed(1);
}

function shouldIgnoreConsoleError(messageText) {
    const message = String(messageText || "");
    if (!message) {
        return true;
    }

    if (/favicon\.ico/i.test(message) && /404|not found/i.test(message)) {
        return true;
    }

    // External CDN/network noise should not fail runtime-error budget:
    // same-origin request failures are gated separately via avgFailedSameOrigin.
    if (/failed to load resource:\s*net::ERR_(ABORTED|CONNECTION_CLOSED|CONNECTION_REFUSED|CONNECTION_RESET|INTERNET_DISCONNECTED|NAME_NOT_RESOLVED|TIMED_OUT)/i.test(message)) {
        return true;
    }

    return false;
}

function topMessageCounts(messages, limit = 5) {
    if (!Array.isArray(messages) || messages.length === 0) {
        return [];
    }

    const counts = new Map();
    for (const message of messages) {
        const key = String(message || "").trim();
        if (!key) {
            continue;
        }
        counts.set(key, (counts.get(key) || 0) + 1);
    }

    return [...counts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, limit)
        .map(([message, count]) => ({ message, count }));
}

function isTimeoutError(error) {
    if (!error) {
        return false;
    }

    if (String(error.name || "").toLowerCase() === "timeouterror") {
        return true;
    }

    return /timeout\s+\d+ms\s+exceeded/i.test(String(error.message || ""));
}

async function navigateWithRetry(page, url, contextLabel) {
    for (let attempt = 1; attempt <= navigationAttempts; attempt += 1) {
        try {
            await page.goto(url, {
                waitUntil: "load",
                timeout: 60_000
            });

            return;
        } catch (error) {
            const isLastAttempt = attempt >= navigationAttempts;
            if (!isTimeoutError(error) || isLastAttempt) {
                throw error;
            }

            // Allow transient local host slowness and browser context warmup.
            await page.waitForTimeout(300);
            console.warn(`[perf:browser] retrying navigation (${contextLabel}), attempt ${attempt + 1}/${navigationAttempts}`);
        }
    }
}

async function measurePage(browser, pageConfig) {
    const samples = [];

    for (let index = 0; index < warmupIterations; index += 1) {
        const context = await browser.newContext();
        const page = await context.newPage();

        await navigateWithRetry(
            page,
            `${baseUrl}${pageConfig.path}`,
            `${pageConfig.name} warmup ${index + 1}`);
        await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(100);
        await context.close();
    }

    for (let index = 0; index < iterations; index += 1) {
        const context = await browser.newContext();
        const page = await context.newPage();

        const requestStats = {
            totalRequests: 0,
            failedRequests: 0,
            failedRequestsSameOrigin: 0,
            failedRequestsExternal: 0,
            jsRequests: 0,
            cssRequests: 0
        };
        const runtimeErrorStats = {
            consoleErrors: 0,
            pageErrors: 0,
            consoleErrorMessages: [],
            pageErrorMessages: []
        };

        page.on("requestfinished", request => {
            requestStats.totalRequests += 1;
            const url = request.url();
            const sameOrigin = url.startsWith(baseUrl);
            if (!sameOrigin) {
                return;
            }

            if (url.includes(".js")) {
                requestStats.jsRequests += 1;
            }
            if (url.includes(".css")) {
                requestStats.cssRequests += 1;
            }
        });

        page.on("requestfailed", request => {
            requestStats.failedRequests += 1;
            const sameOrigin = request.url().startsWith(baseUrl);
            if (sameOrigin) {
                requestStats.failedRequestsSameOrigin += 1;
                return;
            }

            requestStats.failedRequestsExternal += 1;
        });

        page.on("console", message => {
            if (message.type() !== "error") {
                return;
            }

            const messageText = message.text();
            if (shouldIgnoreConsoleError(messageText)) {
                return;
            }

            runtimeErrorStats.consoleErrors += 1;
            runtimeErrorStats.consoleErrorMessages.push(messageText);
        });

        page.on("pageerror", error => {
            runtimeErrorStats.pageErrors += 1;
            runtimeErrorStats.pageErrorMessages.push(error?.message ?? "Unknown page error");
        });

        await navigateWithRetry(
            page,
            `${baseUrl}${pageConfig.path}`,
            `${pageConfig.name} sample ${index + 1}`);
        await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(150);

        const navigation = await page.evaluate(() => {
            const [entry] = performance.getEntriesByType("navigation");
            const nav = entry || {};

            return {
                domContentLoadedMs: Number(nav.domContentLoadedEventEnd || 0),
                loadMs: Number(nav.loadEventEnd || 0),
                domInteractiveMs: Number(nav.domInteractive || 0),
                transferSizeBytes: Number(nav.transferSize || 0),
                encodedBodySizeBytes: Number(nav.encodedBodySize || 0),
                decodedBodySizeBytes: Number(nav.decodedBodySize || 0)
            };
        });

        await context.close();

        samples.push({
            ...navigation,
            ...requestStats,
            ...runtimeErrorStats
        });
    }

    const domContentLoadedValues = samples.map(sample => sample.domContentLoadedMs);
    const loadValues = samples.map(sample => sample.loadMs);
    const domInteractiveValues = samples.map(sample => sample.domInteractiveMs);
    const requestValues = samples.map(sample => sample.totalRequests);
    const jsRequestValues = samples.map(sample => sample.jsRequests);
    const cssRequestValues = samples.map(sample => sample.cssRequests);
    const failedRequestValues = samples.map(sample => sample.failedRequests);
    const failedSameOriginValues = samples.map(sample => sample.failedRequestsSameOrigin);
    const failedExternalValues = samples.map(sample => sample.failedRequestsExternal);
    const runtimeConsoleErrorsValues = samples.map(sample => sample.consoleErrors);
    const runtimePageErrorsValues = samples.map(sample => sample.pageErrors);
    const runtimeTotalErrorsValues = samples.map(sample => sample.consoleErrors + sample.pageErrors);
    const transferValues = samples.map(sample => sample.transferSizeBytes);
    const encodedValues = samples.map(sample => sample.encodedBodySizeBytes);
    const decodedValues = samples.map(sample => sample.decodedBodySizeBytes);

    return {
        page: pageConfig.name,
        path: pageConfig.path,
        iterations,
        warmupIterations,
        domContentLoadedMs: {
            p50: percentile(domContentLoadedValues, 50),
            p95: percentile(domContentLoadedValues, 95),
            avg: average(domContentLoadedValues)
        },
        loadMs: {
            p50: percentile(loadValues, 50),
            p95: percentile(loadValues, 95),
            avg: average(loadValues)
        },
        domInteractiveMs: {
            p50: percentile(domInteractiveValues, 50),
            p95: percentile(domInteractiveValues, 95),
            avg: average(domInteractiveValues)
        },
        requestCount: {
            avg: average(requestValues),
            p95: percentile(requestValues, 95)
        },
        staticRequests: {
            avgJs: average(jsRequestValues),
            avgCss: average(cssRequestValues),
            avgFailed: average(failedRequestValues),
            avgFailedSameOrigin: average(failedSameOriginValues),
            avgFailedExternal: average(failedExternalValues)
        },
        runtimeErrors: {
            avgConsoleErrors: average(runtimeConsoleErrorsValues),
            avgPageErrors: average(runtimePageErrorsValues),
            avgTotalErrors: average(runtimeTotalErrorsValues),
            topConsoleMessages: topMessageCounts(samples.flatMap(sample => sample.consoleErrorMessages)),
            topPageMessages: topMessageCounts(samples.flatMap(sample => sample.pageErrorMessages))
        },
        transferBytes: {
            avg: average(transferValues),
            avgEncoded: average(encodedValues),
            avgDecoded: average(decodedValues)
        }
    };
}

async function main() {
    await fs.mkdir(outDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
    const jsonPath = path.join(outDir, `browser-metrics-${timestamp}.json`);
    const mdPath = path.join(outDir, `browser-metrics-${timestamp}.md`);

    const browser = await chromium.launch({ headless: true });
    const results = [];
    try {
        for (const pageConfig of pages) {
            // eslint-disable-next-line no-await-in-loop
            const measured = await measurePage(browser, pageConfig);
            results.push(measured);
        }
    } finally {
        await browser.close();
    }

    await fs.writeFile(jsonPath, JSON.stringify({
        generatedAtUtc: new Date().toISOString(),
        baseUrl,
        iterations,
        warmupIterations,
        results
    }, null, 2), "utf8");

    const lines = [];
    lines.push("# Browser Performance Snapshot");
    lines.push("");
    lines.push(`Base URL: \`${baseUrl}\``);
    lines.push("");
    lines.push(`Iterations per page: \`${iterations}\``);
    lines.push(`Warmup iterations per page: \`${warmupIterations}\``);
    lines.push("");
    lines.push("| Page | DOMContentLoaded p50 (ms) | Load p50 (ms) | DOM Interactive p50 (ms) | Avg requests | Avg JS | Avg CSS | Avg console errors | Avg page errors | Avg transfer (bytes) |");
    lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
    for (const result of results) {
        lines.push(
            `| ${result.page} | ${toFixed(result.domContentLoadedMs.p50)} | ${toFixed(result.loadMs.p50)} | ${toFixed(result.domInteractiveMs.p50)} | ${toFixed(result.requestCount.avg)} | ${toFixed(result.staticRequests.avgJs)} | ${toFixed(result.staticRequests.avgCss)} | ${toFixed(result.runtimeErrors.avgConsoleErrors)} | ${toFixed(result.runtimeErrors.avgPageErrors)} | ${toFixed(result.transferBytes.avg)} |`
        );
    }
    lines.push("");
    lines.push(`Raw json: \`${jsonPath}\``);
    lines.push("");

    await fs.writeFile(mdPath, `${lines.join("\n")}\n`, "utf8");

    console.log(`Browser metrics report: ${mdPath}`);
    console.log(`Browser metrics raw json: ${jsonPath}`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
