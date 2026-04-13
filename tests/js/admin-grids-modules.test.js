"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const rolesModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/admin-grids-roles.js"));
const usersModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/admin-grids-users.js"));
const referenceModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/admin-grids-reference.js"));

function createJQueryStub(captured) {
    return function jQueryStub(element) {
        return {
            dxDataGrid: function (config) {
                const instance = {
                    element: element,
                    refreshCalls: 0,
                    refresh: function () {
                        this.refreshCalls += 1;
                    }
                };

                captured.push({
                    config: config,
                    element: element,
                    instance: instance
                });

                return {
                    dxDataGrid: function (method) {
                        if (method !== "instance") {
                            throw new Error("Unsupported dxDataGrid method in test stub.");
                        }

                        return instance;
                    }
                };
            }
        };
    };
}

test("admin grids modules: roles grid factory builds role columns", () => {
    const captured = [];
    const grid = rolesModule.createGrid({
        element: { id: "roles-grid" },
        jQueryImpl: createJQueryStub(captured),
        rolesDataSource: [{ id: "r1", name: "Admin" }]
    });

    assert.ok(grid);
    assert.equal(captured.length, 1);
    assert.equal(captured[0].config.columns.length, 3);
    assert.equal(captured[0].config.keyExpr, "id");
});

test("admin grids modules: users grid factory wires formatter and toolbar refresh", () => {
    const captured = [];
    const errors = [];
    const grid = usersModule.createGrid({
        element: { id: "users-grid" },
        jQueryImpl: createJQueryStub(captured),
        usersStore: { id: "users-store" },
        rolesDataSource: [{ name: "Admin" }],
        toStringList: function (value) { return Array.isArray(value) ? value : []; },
        onUsersDataError: function (error) { errors.push(error); }
    });

    const config = captured[0].config;
    const rolesColumn = config.columns.find(function (column) { return column.dataField === "roles"; });
    assert.equal(rolesColumn.customizeText({ value: ["Admin"] }), "Admin");

    const toolbar = { toolbarOptions: { items: [] } };
    config.onToolbarPreparing(toolbar);
    toolbar.toolbarOptions.items[0].options.onClick();
    assert.equal(grid.refreshCalls, 1);

    const sampleError = { message: "users-fail" };
    config.onDataErrorOccurred({ error: sampleError });
    assert.deepEqual(errors, [sampleError]);
});

test("admin grids modules: reference grid factory keeps itemCode read-only for existing row", () => {
    const captured = [];
    const errors = [];
    const grid = referenceModule.createGrid({
        element: { id: "reference-grid" },
        jQueryImpl: createJQueryStub(captured),
        referenceStore: { id: "reference-store" },
        onReferenceDataError: function (error) { errors.push(error); }
    });

    const config = captured[0].config;
    const editorOptions = {};
    config.onEditorPreparing({
        parentType: "dataRow",
        dataField: "itemCode",
        row: { isNewRow: false },
        editorOptions: editorOptions
    });
    assert.equal(editorOptions.readOnly, true);

    const toolbar = { toolbarOptions: { items: [] } };
    config.onToolbarPreparing(toolbar);
    toolbar.toolbarOptions.items[0].options.onClick();
    assert.equal(grid.refreshCalls, 1);

    const sampleError = { message: "ref-fail" };
    config.onDataErrorOccurred({ error: sampleError });
    assert.deepEqual(errors, [sampleError]);
});
