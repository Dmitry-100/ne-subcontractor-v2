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
