"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const registryColumnsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-registry-columns.js"));

test("contracts registry columns: form items include core editable fields", () => {
    const formItems = registryColumnsModule.createFormItems();

    assert.equal(formItems.length, 10);
    assert.ok(formItems.includes("contractNumber"));
    assert.ok(formItems.includes("lotId"));
    assert.ok(formItems.includes("procedureId"));
    assert.ok(formItems.includes("contractorId"));
    assert.ok(formItems.includes("endDate"));
});

test("contracts registry columns: status column uses provided lookup", () => {
    const lookup = [
        { value: "Draft", text: "Черновик" },
        { value: "Active", text: "Действует" }
    ];
    const columns = registryColumnsModule.createColumns(lookup);

    const statusColumn = columns.find(function (column) {
        return column.dataField === "status";
    });
    const contractNumberColumn = columns.find(function (column) {
        return column.dataField === "contractNumber";
    });

    assert.equal(columns.length, 13);
    assert.equal(statusColumn.lookup.dataSource, lookup);
    assert.equal(statusColumn.allowEditing, false);
    assert.equal(contractNumberColumn.validationRules[0].type, "required");
});
