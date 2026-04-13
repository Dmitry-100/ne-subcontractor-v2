"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const draftModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-draft.js"));

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

function createInput(value) {
    return {
        value: value || ""
    };
}

function createButton() {
    return {
        handlers: {},
        addEventListener: function (eventName, handler) {
            this.handlers[eventName] = handler;
        }
    };
}

test("draft controller: wires events module with payload readers and status handlers", () => {
    const draftStatusElement = createStatusElement();
    const draftProcedureIdInput = createInput("guid-1");
    const draftNumberInput = createInput("SC-100");
    const draftSigningDateInput = createInput("2026-04-11");
    const draftStartDateInput = createInput("2026-04-12");
    const draftEndDateInput = createInput("2026-04-20");
    const draftCreateButton = createButton();
    const events = {
        createEventsCalls: [],
        clickCalls: 0
    };

    const controller = draftModule.createController({
        elements: {
            draftStatusElement: draftStatusElement,
            draftProcedureIdInput: draftProcedureIdInput,
            draftNumberInput: draftNumberInput,
            draftSigningDateInput: draftSigningDateInput,
            draftStartDateInput: draftStartDateInput,
            draftEndDateInput: draftEndDateInput,
            draftCreateButton: draftCreateButton
        },
        apiClient: {
            createDraftFromProcedure: function () {
                return Promise.resolve({
                    id: "contract-1",
                    contractNumber: "SC-100"
                });
            }
        },
        isGuid: function (value) {
            return value === "guid-1";
        },
        toNullableDate: function (value) {
            return value || null;
        },
        onDraftCreated: function () {
            return Promise.resolve();
        },
        eventsModule: {
            createEvents: function (options) {
                events.createEventsCalls.push(options);
                return {
                    onCreateDraftClick: function () {
                        events.clickCalls += 1;
                    }
                };
            }
        }
    });

    controller.init();

    assert.equal(events.createEventsCalls.length, 1);
    assert.equal(typeof draftCreateButton.handlers.click, "function");

    const options = events.createEventsCalls[0];
    assert.equal(options.readProcedureId(), "guid-1");
    assert.deepEqual(options.readPayload(), {
        contractNumber: "SC-100",
        signingDate: "2026-04-11",
        startDate: "2026-04-12",
        endDate: "2026-04-20"
    });

    options.setDraftStatus("status-ok", false);
    assert.equal(draftStatusElement.textContent, "status-ok");
    assert.deepEqual(draftStatusElement.classList.toggles.at(-1), {
        name: "contracts-draft-status--error",
        value: false
    });

    options.clearDraftInputs();
    assert.equal(draftProcedureIdInput.value, "");
    assert.equal(draftNumberInput.value, "");
    assert.equal(draftSigningDateInput.value, "");
    assert.equal(draftStartDateInput.value, "");
    assert.equal(draftEndDateInput.value, "");

    draftCreateButton.handlers.click();
    assert.equal(events.clickCalls, 1);
});
