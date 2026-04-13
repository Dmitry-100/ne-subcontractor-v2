"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const foundationModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-grid-runtime-foundation.js"));

function createControls() {
    function createStatusElement() {
        return {
            textContent: "",
            classList: {
                toggles: [],
                toggle: function (name, value) {
                    this.toggles.push({ name: name, value: value });
                }
            }
        };
    }

    return {
        statusElement: createStatusElement(),
        transitionStatusElement: createStatusElement(),
        shortlistStatusElement: createStatusElement(),
        shortlistAdjustmentsStatusElement: createStatusElement()
    };
}

function createCompleteModuleRoots() {
    return {
        proceduresConfigRoot: {},
        proceduresServicesRoot: {},
        proceduresGridHelpersRoot: {},
        proceduresApiRoot: {},
        proceduresWorkflowRoot: {},
        proceduresGridColumnsRoot: {},
        proceduresGridsRoot: {},
        proceduresStoreRoot: {},
        proceduresRegistryEventsRoot: {},
        proceduresDataRoot: {},
        proceduresShortlistRoot: {},
        proceduresSelectionRoot: {},
        proceduresTransitionRoot: {}
    };
}

test("procedures runtime foundation: resolveRuntimeOptions validates host window dependencies", () => {
    assert.throws(() => {
        foundationModule.resolveRuntimeOptions({});
    }, /window dependencies are missing/i);
});

test("procedures runtime foundation: resolveRuntimeOptions validates required module roots", () => {
    assert.throws(() => {
        foundationModule.resolveRuntimeOptions({
            window: {
                jQuery: function () {},
                DevExpress: {
                    data: {}
                }
            },
            moduleRoots: {
                proceduresConfigRoot: {}
            }
        });
    }, /module roots are incomplete/i);
});

test("procedures runtime foundation: resolveRuntimeOptions returns normalized settings", () => {
    const result = foundationModule.resolveRuntimeOptions({
        window: {
            jQuery: function () {},
            DevExpress: {
                data: {}
            }
        },
        endpoint: "/api/custom/procedures",
        controls: { marker: true },
        moduleRoots: createCompleteModuleRoots()
    });

    assert.equal(result.endpoint, "/api/custom/procedures");
    assert.equal(result.controls.marker, true);
    assert.equal(typeof result.moduleRoots.proceduresServicesRoot, "object");
    assert.equal(typeof result.moduleRoots.proceduresGridHelpersRoot, "object");
    assert.equal(typeof result.moduleRoots.proceduresDataRoot, "object");
});

test("procedures runtime foundation: createUiState validates required dependencies", () => {
    assert.throws(() => {
        foundationModule.createUiState({
            hostWindow: {
                location: {
                    href: "https://example.test",
                    assign: function () {}
                }
            },
            controls: createControls(),
            gridHelpers: null,
            urlFilterState: {}
        });
    }, /gridHelpers contract is invalid/i);
});

test("procedures runtime foundation: createUiState builds navigation and status setters", () => {
    const assignments = [];
    const controls = createControls();
    const uiState = foundationModule.createUiState({
        hostWindow: {
            location: {
                href: "https://example.test/Home/Procedures?status=OnApproval",
                assign: function (url) {
                    assignments.push(url);
                }
            }
        },
        controls: controls,
        gridHelpers: {
            appendFilterHint: function (message, state) {
                return `${message} [${state.label}]`;
            },
            buildUrlWithoutFilters: function (url) {
                return `${url.split("?")[0]}?clean=1`;
            }
        },
        urlFilterState: { label: "filtered" }
    });

    assert.equal(uiState.appendFilterHint("Загрузка"), "Загрузка [filtered]");
    uiState.clearUrlFilters();
    assert.deepEqual(assignments, ["https://example.test/Home/Procedures?clean=1"]);

    uiState.setStatus("Статус", true);
    uiState.setTransitionStatus("Переход", false);
    uiState.setShortlistStatus("Шортлист", true);
    uiState.setShortlistAdjustmentsStatus("Журнал", false);

    assert.equal(controls.statusElement.textContent, "Статус");
    assert.equal(controls.transitionStatusElement.textContent, "Переход");
    assert.equal(controls.shortlistStatusElement.textContent, "Шортлист");
    assert.equal(controls.shortlistAdjustmentsStatusElement.textContent, "Журнал");
    assert.deepEqual(
        controls.statusElement.classList.toggles,
        [{ name: "procedures-status--error", value: true }]);
    assert.deepEqual(
        controls.transitionStatusElement.classList.toggles,
        [{ name: "procedures-transition-status--error", value: false }]);
    assert.deepEqual(
        controls.shortlistStatusElement.classList.toggles,
        [{ name: "procedures-shortlist-status--error", value: true }]);
    assert.deepEqual(
        controls.shortlistAdjustmentsStatusElement.classList.toggles,
        [{ name: "procedures-shortlist-status--error", value: false }]);
});
