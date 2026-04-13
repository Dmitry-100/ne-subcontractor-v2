"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const panelGridModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-execution-panel-grid.js"));

test("execution panel grid: exposes expected form schema", () => {
    const formItems = panelGridModule.createFormItems();

    assert.equal(formItems.length, 6);
    assert.equal(formItems[0], "title");
    assert.equal(formItems[2], "plannedDate");
    assert.equal(formItems[4], "progressPercent");
    assert.equal(formItems[5].dataField, "notes");
    assert.equal(formItems[5].editorType, "dxTextArea");
});

test("execution panel grid: exposes expected columns schema", () => {
    const columns = panelGridModule.createColumns();

    assert.equal(columns.length, 8);
    assert.equal(columns[1].dataField, "title");
    assert.equal(columns[1].validationRules[0].type, "required");
    assert.equal(columns[3].dataField, "plannedDate");
    assert.equal(columns[3].validationRules[0].type, "required");
    assert.equal(columns[6].dataField, "isOverdue");
    assert.equal(columns[6].allowEditing, false);
});

test("execution panel grid: builds default grid config", () => {
    const config = panelGridModule.createGridConfig();

    assert.deepEqual(config.pager.allowedPageSizes, [10, 20, 40]);
    assert.equal(config.editing.mode, "popup");
    assert.equal(config.editing.popup.title, "Этап исполнения");
    assert.equal(config.editing.form.items.length, 6);
    assert.equal(config.columns.length, 8);
});
