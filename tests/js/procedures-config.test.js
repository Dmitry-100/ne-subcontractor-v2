"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const proceduresConfigModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/procedures-config.js"));

test("procedures config: createConfig returns status, transitions and lookups", () => {
    const config = proceduresConfigModule.createConfig();

    assert.equal(config.statusOrder[0], "Created");
    assert.equal(config.statusOrder.at(-1), "Canceled");
    assert.deepEqual(config.transitionMap.Created, ["DocumentsPreparation", "Canceled"]);
    assert.equal(config.statusCaptions.OnApproval, "На согласовании");
    assert.equal(config.approvalModes.length, 2);
    assert.deepEqual(config.approvalModeLookup, [
        { value: "InSystem", text: "В системе" },
        { value: "External", text: "Внешнее" }
    ]);
    assert.equal(config.statusLookup.some(function (item) {
        return item.value === "DecisionMade" && item.text === "Решение принято";
    }), true);
});

test("procedures config: createConfig returns fresh copies", () => {
    const first = proceduresConfigModule.createConfig();
    const second = proceduresConfigModule.createConfig();

    first.statusOrder.push("Unexpected");
    first.transitionMap.Created.push("Unexpected");
    first.statusCaptions.Created = "Изменено";

    assert.equal(second.statusOrder.includes("Unexpected"), false);
    assert.equal(second.transitionMap.Created.includes("Unexpected"), false);
    assert.equal(second.statusCaptions.Created, "Создана");
});
