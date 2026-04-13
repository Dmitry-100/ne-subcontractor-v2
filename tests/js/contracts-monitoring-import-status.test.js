"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const moduleUnderTest = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-monitoring-import-status.js"));

test("resolveImportMode normalizes unsupported values to strict", () => {
    assert.equal(moduleUnderTest.resolveImportMode("skip"), "skip");
    assert.equal(moduleUnderTest.resolveImportMode("  SKIP "), "skip");
    assert.equal(moduleUnderTest.resolveImportMode("strict"), "strict");
    assert.equal(moduleUnderTest.resolveImportMode("random"), "strict");
    assert.equal(moduleUnderTest.resolveImportMode(null), "strict");
});

test("buildConflictPreview returns first items and keeps stable format", () => {
    const preview = moduleUnderTest.buildConflictPreview([
        { sourceRowNumber: 4, code: "AMBIGUOUS_TARGET" },
        { sourceRowNumber: 6, code: "ROW_NOT_FOUND" },
        { sourceRowNumber: 8, code: "DUPLICATE" }
    ], 2);

    assert.equal(preview, "#4: AMBIGUOUS_TARGET; #6: ROW_NOT_FOUND");
});

test("buildImportStatuses returns strict-conflict error state", () => {
    const status = moduleUnderTest.buildImportStatuses({
        totalRows: 10,
        updatedRows: 0,
        conflictRows: 3,
        applied: false,
        conflicts: [
            { sourceRowNumber: 2, code: "AMBIGUOUS_TARGET" }
        ]
    }, 10);

    assert.equal(status.isError, true);
    assert.match(status.mdrStatusMessage, /Изменения не применены/);
    assert.match(status.mdrStatusMessage, /#2: AMBIGUOUS_TARGET/);
    assert.match(status.monitoringStatusMessage, /не изменены/);
});

test("buildImportStatuses returns partial-success and success states", () => {
    const partial = moduleUnderTest.buildImportStatuses({
        totalRows: 10,
        updatedRows: 7,
        conflictRows: 3,
        applied: true,
        conflicts: [
            { sourceRowNumber: 3, code: "ROW_NOT_FOUND" }
        ]
    }, 10);

    assert.equal(partial.isError, false);
    assert.match(partial.mdrStatusMessage, /Конфликтные строки пропущены/);
    assert.match(partial.monitoringStatusMessage, /частично/);

    const success = moduleUnderTest.buildImportStatuses({
        totalRows: 5,
        updatedRows: 5,
        conflictRows: 0,
        applied: true
    }, 5);

    assert.equal(success.isError, false);
    assert.equal(success.mdrStatusMessage, "Импорт MDR: строк 5, обновлено 5, конфликтов 0.");
    assert.equal(success.monitoringStatusMessage, "Импорт MDR выполнен успешно.");
});

test("validateImportPrerequisites enforces selected contract, editable status and file", () => {
    assert.throws(() => moduleUnderTest.validateImportPrerequisites({
        selectedContract: null,
        isEditableStatus: false,
        file: null
    }), /Сначала выберите договор/);

    assert.throws(() => moduleUnderTest.validateImportPrerequisites({
        selectedContract: { id: "1" },
        isEditableStatus: false,
        file: { name: "mdr.xlsx" }
    }), /Импорт MDR доступен только/);

    assert.throws(() => moduleUnderTest.validateImportPrerequisites({
        selectedContract: { id: "1" },
        isEditableStatus: true,
        file: null
    }), /Выберите файл импорта MDR/);

    assert.doesNotThrow(() => moduleUnderTest.validateImportPrerequisites({
        selectedContract: { id: "1" },
        isEditableStatus: true,
        file: { name: "mdr.xlsx" }
    }));
});
