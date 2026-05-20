"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const projectsGridsModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/projects-grids.js"));

test("projects grids: validates required dependencies", () => {
    assert.throws(function () {
        projectsGridsModule.createGrid({});
    }, /jQueryImpl/i);

    assert.throws(function () {
        projectsGridsModule.createGrid({
            jQueryImpl: function () {},
            gridElement: { id: "projects-grid" },
            store: {}
        });
    }, /setStatus/i);
});

test("projects grids: creates grid and wires toolbar/error handlers", () => {
    const events = {
        config: null,
        refreshCalls: 0,
        statusCalls: []
    };
    const gridInstance = {
        refresh: function () {
            events.refreshCalls += 1;
        }
    };

    const grid = projectsGridsModule.createGrid({
        jQueryImpl: function () {
            return {
                dxDataGrid: function (configOrCommand) {
                    if (typeof configOrCommand === "string") {
                        return gridInstance;
                    }

                    events.config = configOrCommand;
                    return this;
                }
            };
        },
        gridElement: { id: "projects-grid" },
        store: { key: "projects-store" },
        setStatus: function (message, isError) {
            events.statusCalls.push({ message: message, isError: isError });
        }
    });

    assert.equal(grid, gridInstance);
    assert.equal(events.config.dataSource.key, "projects-store");
    assert.equal(events.config.searchPanel.placeholder, "Поиск проектов...");
    assert.equal(events.config.remoteOperations?.paging, true);
    assert.equal(events.config.columns.length, 4);

    const toolbar = { toolbarOptions: { items: [] } };
    events.config.onToolbarPreparing(toolbar);
    assert.equal(toolbar.toolbarOptions.items.length, 1);
    toolbar.toolbarOptions.items[0].options.onClick();
    assert.equal(events.refreshCalls, 1);

    const editorEvent = {
        parentType: "dataRow",
        dataField: "code",
        row: { isNewRow: false },
        editorOptions: {}
    };
    events.config.onEditorPreparing(editorEvent);
    assert.equal(editorEvent.editorOptions.readOnly, true);

    events.config.onInitNewRow();
    events.config.onDataErrorOccurred({ error: { message: "Ошибка синхронизации" } });

    assert.deepEqual(events.statusCalls, [
        { message: "Создание нового проекта...", isError: false },
        { message: "Ошибка синхронизации", isError: true }
    ]);
});

test("projects grids: creates read-only Express source-data grid with imported table columns", () => {
    const events = {
        config: null,
        refreshCalls: 0,
        statusCalls: []
    };
    const gridInstance = {
        refresh: function () {
            events.refreshCalls += 1;
        }
    };

    const grid = projectsGridsModule.createSourceDataGrid({
        jQueryImpl: function () {
            return {
                dxDataGrid: function (configOrCommand) {
                    if (typeof configOrCommand === "string") {
                        return gridInstance;
                    }

                    events.config = configOrCommand;
                    return this;
                }
            };
        },
        gridElement: { id: "projects-source-data-grid" },
        store: { key: "projects-source-store" },
        setStatus: function (message, isError) {
            events.statusCalls.push({ message: message, isError: isError });
        }
    });

    assert.equal(grid, gridInstance);
    assert.equal(events.config.dataSource.key, "projects-source-store");
    assert.equal(events.config.editing?.allowAdding, false);
    assert.deepEqual(
        events.config.columns.map(function (column) { return column.caption; }),
        [
            "проект номер",
            "Комплекс/проект",
            "Проект",
            "Объект",
            "Проектная дисциплина",
            "Дисциплина-ресурс",
            "Филиал_исп",
            "ГИП",
            "Загр НИ, чел-час",
            "Start",
            "Finish",
            "Статус валидации"
        ]);
    assert.equal(events.config.selection?.mode, "multiple");

    const toolbar = { toolbarOptions: { items: [] } };
    events.config.onToolbarPreparing(toolbar);
    assert.equal(toolbar.toolbarOptions.items[0].options.text, "Сформировать заявку на закупку");
    assert.equal(toolbar.toolbarOptions.items[1].options.text, "Обновить");
    toolbar.toolbarOptions.items[1].options.onClick();
    assert.equal(events.refreshCalls, 1);

    events.config.onDataErrorOccurred({ error: { message: "Ошибка загрузки Express" } });
    assert.deepEqual(events.statusCalls, [
        { message: "Ошибка загрузки Express", isError: true }
    ]);
});

test("projects grids: source-data procurement action receives selected rows", () => {
    const selectedRows = [{ id: "row-1" }, { id: "row-2" }];
    const calls = [];
    const gridInstance = {
        getSelectedRowsData: function () {
            return selectedRows;
        },
        refresh: function () {}
    };
    let config = null;

    projectsGridsModule.createSourceDataGrid({
        jQueryImpl: function () {
            return {
                dxDataGrid: function (configOrCommand) {
                    if (typeof configOrCommand === "string") {
                        return gridInstance;
                    }

                    config = configOrCommand;
                    return this;
                }
            };
        },
        gridElement: { id: "projects-source-data-grid" },
        store: { key: "projects-source-store" },
        setStatus: function () {},
        onCreateProcurementRequest: function (rows) {
            calls.push(rows);
        }
    });

    const toolbar = { toolbarOptions: { items: [] } };
    config.onToolbarPreparing(toolbar);
    toolbar.toolbarOptions.items[0].options.onClick();

    assert.deepEqual(calls, [selectedRows]);
});
