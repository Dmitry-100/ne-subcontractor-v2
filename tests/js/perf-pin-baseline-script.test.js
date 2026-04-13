"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const pinScriptPath = path.resolve(__dirname, "../../scripts/perf/pin-performance-baseline.sh");

function createTempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

test("pin baseline script: copies source manifest to baseline alias and writes meta", () => {
    const tempDir = createTempDir("perf-pin-baseline-");
    try {
        const sourceManifest = path.join(tempDir, "perf-contour-latest.json");
        writeJson(sourceManifest, {
            browserMetricsJson: "browser.json",
            httpMetricsTsv: "http.tsv"
        });

        const outDir = path.join(tempDir, "perf");
        const result = spawnSync("bash", [pinScriptPath, sourceManifest, outDir], {
            encoding: "utf8"
        });

        assert.equal(result.status, 0, `Expected success.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);

        const targetManifest = path.join(outDir, "perf-contour-baseline.json");
        const metaFile = path.join(outDir, "perf-contour-baseline.meta.json");
        assert.equal(fs.existsSync(targetManifest), true, "Expected baseline alias manifest to be created.");
        assert.equal(fs.existsSync(metaFile), true, "Expected baseline meta json to be created.");

        const sourceText = fs.readFileSync(sourceManifest, "utf8");
        const targetText = fs.readFileSync(targetManifest, "utf8");
        assert.equal(targetText, sourceText, "Expected baseline alias manifest to match source manifest exactly.");

        const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
        assert.equal(meta.sourceManifest, sourceManifest);
        assert.equal(meta.targetManifest, path.join(outDir, "perf-contour-baseline.json"));
        assert.ok(typeof meta.pinnedAtUtc === "string" && meta.pinnedAtUtc.length > 0);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test("pin baseline script: fails when source manifest is missing", () => {
    const tempDir = createTempDir("perf-pin-baseline-missing-");
    try {
        const missingSource = path.join(tempDir, "missing.json");
        const outDir = path.join(tempDir, "perf");
        const result = spawnSync("bash", [pinScriptPath, missingSource, outDir], {
            encoding: "utf8"
        });

        assert.notEqual(result.status, 0, "Expected non-zero exit code for missing source manifest.");
        assert.match(`${result.stdout}\n${result.stderr}`, /Source manifest not found/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
