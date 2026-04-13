import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

function parseArgs() {
    const options = {
        dir: "artifacts/perf",
        out: "",
        limit: 8
    };

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (arg === "--dir" && index + 1 < args.length) {
            options.dir = args[index + 1];
            index += 1;
            continue;
        }

        if (arg === "--out" && index + 1 < args.length) {
            options.out = args[index + 1];
            index += 1;
            continue;
        }

        if (arg === "--limit" && index + 1 < args.length) {
            options.limit = Number.parseInt(args[index + 1], 10);
            index += 1;
            continue;
        }
    }

    if (!Number.isFinite(options.limit) || options.limit < 1) {
        throw new Error("Trend report requires --limit >= 1.");
    }

    if (!options.out) {
        options.out = path.join(options.dir, "perf-trend-latest.md");
    }

    return options;
}

function resolveArtifactPath(candidatePath, manifestPath) {
    if (!candidatePath) {
        return "";
    }

    if (path.isAbsolute(candidatePath)) {
        return candidatePath;
    }

    const cwdResolvedPath = path.resolve(candidatePath);
    if (fsSync.existsSync(cwdResolvedPath)) {
        return cwdResolvedPath;
    }

    return path.resolve(path.dirname(manifestPath), candidatePath);
}

function toNumber(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return null;
    }

    return parsed;
}

function percentile(values, pct) {
    if (!Array.isArray(values) || values.length === 0) {
        return null;
    }

    const sorted = [...values].sort((left, right) => left - right);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
    return sorted[index];
}

function formatMetric(value) {
    if (!Number.isFinite(value)) {
        return "n/a";
    }

    return `${value.toFixed(1)}`;
}

function formatDelta(currentValue, previousValue) {
    if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) {
        return "n/a";
    }

    const absolute = currentValue - previousValue;
    if (!Number.isFinite(previousValue) || previousValue <= 0) {
        return `${absolute.toFixed(1)} ms`;
    }

    const pct = (absolute / previousValue) * 100;
    const sign = absolute > 0 ? "+" : "";
    return `${sign}${absolute.toFixed(1)} ms (${sign}${pct.toFixed(1)}%)`;
}

async function parseHttpWarmP95(httpTsvPath, endpointName) {
    const contents = await fs.readFile(httpTsvPath, "utf8");
    const rows = contents
        .split(/\r?\n/)
        .slice(1)
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const warmSamplesMs = [];
    for (const row of rows) {
        const [endpoint, , iteration, timeTotal, , , httpCode] = row.split("\t");
        if (endpoint !== endpointName) {
            continue;
        }
        if (String(iteration || "").toLowerCase() === "cold") {
            continue;
        }

        const statusCode = Number.parseInt(httpCode, 10);
        if (!Number.isFinite(statusCode) || statusCode < 200 || statusCode >= 400) {
            continue;
        }

        const valueSeconds = toNumber(timeTotal);
        if (!Number.isFinite(valueSeconds)) {
            continue;
        }

        warmSamplesMs.push(valueSeconds * 1000);
    }

    return percentile(warmSamplesMs, 95);
}

function buildMetricRow(label, key, latest, previous) {
    return `- ${label}: ${formatMetric(previous?.[key])} -> ${formatMetric(latest?.[key])} (${formatDelta(latest?.[key], previous?.[key])})`;
}

async function loadRunMetrics(manifestPath) {
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    const browserPath = resolveArtifactPath(manifest.browserMetricsJson, manifestPath);
    const httpPath = resolveArtifactPath(manifest.httpMetricsTsv, manifestPath);

    if (!browserPath || !httpPath) {
        throw new Error(`Manifest is missing browser/http artifact fields: ${manifestPath}`);
    }

    const browserMetrics = JSON.parse(await fs.readFile(browserPath, "utf8"));
    const results = Array.isArray(browserMetrics.results) ? browserMetrics.results : [];
    const byPage = new Map(results.map(item => [item.page, item]));

    const homeLoadP50Ms = toNumber(byPage.get("home")?.loadMs?.p50);
    const proceduresLoadP50Ms = toNumber(byPage.get("procedures-page")?.loadMs?.p50);
    const contractsLoadP50Ms = toNumber(byPage.get("contracts-page")?.loadMs?.p50);
    const adminLoadP50Ms = toNumber(byPage.get("admin-page")?.loadMs?.p50);
    const dashboardApiP95Ms = await parseHttpWarmP95(httpPath, "dashboard-summary-api");

    return {
        runId: path.basename(manifestPath, ".json"),
        generatedAtUtc: String(manifest.generatedAtUtc || ""),
        homeLoadP50Ms,
        proceduresLoadP50Ms,
        contractsLoadP50Ms,
        adminLoadP50Ms,
        dashboardApiP95Ms
    };
}

async function main() {
    const options = parseArgs();
    const trendDir = path.resolve(options.dir);
    const trendOutPath = path.resolve(options.out);

    const files = await fs.readdir(trendDir);
    const manifestFiles = files
        .filter(fileName => /^perf-contour-\d{8}-\d{6}\.json$/.test(fileName))
        .sort();

    if (manifestFiles.length === 0) {
        throw new Error(`No contour manifests found in ${trendDir}.`);
    }

    const selectedFiles = manifestFiles.slice(-options.limit);
    const selectedRuns = [];
    for (const fileName of selectedFiles) {
        const manifestPath = path.join(trendDir, fileName);
        // eslint-disable-next-line no-await-in-loop
        const run = await loadRunMetrics(manifestPath);
        selectedRuns.push(run);
    }

    const lines = [];
    lines.push("# Performance Trend Snapshot");
    lines.push("");
    lines.push(`Trend directory: \`${trendDir}\``);
    lines.push(`Runs in report: \`${selectedRuns.length}\` (limit: \`${options.limit}\`)`);
    lines.push("");
    lines.push("| Run | GeneratedAtUtc | Home load p50 (ms) | Procedures load p50 (ms) | Contracts load p50 (ms) | Admin load p50 (ms) | Dashboard API warm p95 (ms) |");
    lines.push("|---|---|---:|---:|---:|---:|---:|");

    for (const run of selectedRuns) {
        lines.push(
            `| ${run.runId} | ${run.generatedAtUtc || "n/a"} | ${formatMetric(run.homeLoadP50Ms)} | ${formatMetric(run.proceduresLoadP50Ms)} | ${formatMetric(run.contractsLoadP50Ms)} | ${formatMetric(run.adminLoadP50Ms)} | ${formatMetric(run.dashboardApiP95Ms)} |`
        );
    }

    if (selectedRuns.length >= 2) {
        const latest = selectedRuns[selectedRuns.length - 1];
        const previous = selectedRuns[selectedRuns.length - 2];
        lines.push("");
        lines.push("## Latest Delta vs Previous Run");
        lines.push("");
        lines.push(buildMetricRow("Home load p50", "homeLoadP50Ms", latest, previous));
        lines.push(buildMetricRow("Procedures load p50", "proceduresLoadP50Ms", latest, previous));
        lines.push(buildMetricRow("Contracts load p50", "contractsLoadP50Ms", latest, previous));
        lines.push(buildMetricRow("Admin load p50", "adminLoadP50Ms", latest, previous));
        lines.push(buildMetricRow("Dashboard API warm p95", "dashboardApiP95Ms", latest, previous));
    } else {
        lines.push("");
        lines.push("## Latest Delta vs Previous Run");
        lines.push("");
        lines.push("- Not enough runs for delta calculation (need at least 2 manifests).");
    }

    lines.push("");
    await fs.mkdir(path.dirname(trendOutPath), { recursive: true });
    await fs.writeFile(trendOutPath, `${lines.join("\n")}\n`, "utf8");

    console.log(`Performance trend report: ${trendOutPath}`);
}

main().catch(error => {
    console.error(error.message || error);
    process.exitCode = 1;
});
