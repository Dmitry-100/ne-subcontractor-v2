"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const adminGridsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/admin-grids.js"));

function createJQueryStub(captured) {
    return function jQueryStub(element) {
        return {
            dxDataGrid: function (config) {
                const instance = {
                    element: element,
                    refreshCalls: 0,
                    optionCalls: [],
                    refresh: function () {
                        this.refreshCalls += 1;
                    },
                    option: function (key, value) {
                        this.optionCalls.push({ key: key, value: value });
                    }
                };

                captured.push({
                    element: element,
                    config: config,
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

function findColumn(columns, dataField) {
    return columns.find(function (column) {
        return column.dataField === dataField;
    });
}

function createValidOptions(overrides) {
    const base = {
        jQueryImpl: function () {},
        elements: {
            usersGridElement: { id: "users-grid" },
            rolesGridElement: { id: "roles-grid" },
            referenceGridElement: { id: "reference-grid" }
        },
        stores: {
            usersStore: { id: "users-store" },
            referenceStore: { id: "reference-store" }
        },
        rolesDataSource: [],
        callbacks: {
            toStringList: function (value) {
                return Array.isArray(value) ? value : [];
            },
            onUsersDataError: function () {},
            onReferenceDataError: function () {}
        }
    };

    return {
        ...base,
        ...(overrides || {})
    };
}

test("admin grids: validates required dependencies", () => {
    assert.throws(function () {
        adminGridsModule.createGrids({});
    }, /jQueryImpl/i);

    assert.throws(function () {
        adminGridsModule.createGrids(createValidOptions({
            stores: {
                referenceStore: {}
            }
        }));
    }, /usersStore/i);

    assert.throws(function () {
        adminGridsModule.createGrids(createValidOptions({
            rolesDataSource: null
        }));
    }, /rolesDataSource/i);

    assert.throws(function () {
        adminGridsModule.createGrids(createValidOptions({
            callbacks: {}
        }));
    }, /toStringList/i);
});

test("admin grids: creates roles/users/reference grids and wires callbacks", () => {
    const captured = [];
    const usersErrors = [];
    const referenceErrors = [];

    const options = createValidOptions({
        jQueryImpl: createJQueryStub(captured),
        rolesDataSource: [
            { id: "role-1", name: "Admin", description: "Администратор" },
            { id: "role-2", name: "Manager", description: "Менеджер" }
        ],
        callbacks: {
            toStringList: function (value) {
                if (Array.isArray(value)) {
                    return value;
                }

                if (!value) {
                    return [];
                }

                return [String(value)];
            },
            onUsersDataError: function (error) {
                usersErrors.push(error);
            },
            onReferenceDataError: function (error) {
                referenceErrors.push(error);
            }
        }
    });

    const grids = adminGridsModule.createGrids(options);
    assert.ok(grids.rolesGridInstance);
    assert.ok(grids.usersGridInstance);
    assert.ok(grids.referenceGridInstance);
    assert.equal(captured.length, 3);

    const rolesConfig = captured[0].config;
    const usersConfig = captured[1].config;
    const referenceConfig = captured[2].config;

    assert.equal(rolesConfig.keyExpr, "id");
    assert.equal(rolesConfig.columns.length, 3);
    assert.equal(usersConfig.searchPanel.placeholder, "Поиск среди загруженных пользователей...");
    assert.equal(referenceConfig.searchPanel.placeholder, "Поиск по коду или названию...");

    const rolesColumn = findColumn(usersConfig.columns, "roles");
    assert.equal(rolesColumn.customizeText({ value: ["Admin", "Manager"] }), "Admin, Manager");

    const usersEditorOptions = {};
    usersConfig.onEditorPreparing({
        parentType: "dataRow",
        dataField: "login",
        editorOptions: usersEditorOptions
    });
    assert.equal(usersEditorOptions.readOnly, true);

    const usersToolbar = { toolbarOptions: { items: [] } };
    usersConfig.onToolbarPreparing(usersToolbar);
    assert.equal(usersToolbar.toolbarOptions.items.length, 1);
    usersToolbar.toolbarOptions.items[0].options.onClick();
    assert.equal(grids.usersGridInstance.refreshCalls, 1);

    const usersDataError = { message: "Ошибка пользователей" };
    usersConfig.onDataErrorOccurred({ error: usersDataError });
    assert.deepEqual(usersErrors, [usersDataError]);

    const referenceEditorOptions = {};
    referenceConfig.onEditorPreparing({
        parentType: "dataRow",
        dataField: "itemCode",
        row: { isNewRow: false },
        editorOptions: referenceEditorOptions
    });
    assert.equal(referenceEditorOptions.readOnly, true);

    const referenceToolbar = { toolbarOptions: { items: [] } };
    referenceConfig.onToolbarPreparing(referenceToolbar);
    assert.equal(referenceToolbar.toolbarOptions.items.length, 1);
    referenceToolbar.toolbarOptions.items[0].options.onClick();
    assert.equal(grids.referenceGridInstance.refreshCalls, 1);

    const referenceDataError = { message: "Ошибка справочника" };
    referenceConfig.onDataErrorOccurred({ error: referenceDataError });
    assert.deepEqual(referenceErrors, [referenceDataError]);
});
