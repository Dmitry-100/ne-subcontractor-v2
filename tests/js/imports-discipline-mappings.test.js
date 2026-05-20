"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const registryModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-discipline-mappings.js"));

function createElement(tagName) {
    return {
        tagName: tagName.toUpperCase(),
        textContent: "",
        className: "",
        children: [],
        attributes: {},
        appendChild: function (child) {
            this.children.push(child);
            return child;
        },
        replaceChildren: function (...children) {
            this.children = children;
        },
        setAttribute: function (name, value) {
            this.attributes[name] = value;
        },
        addEventListener: function (eventName, handler) {
            this[`on${eventName}`] = handler;
        }
    };
}

function createDocument() {
    return {
        createElement: createElement
    };
}

test("imports discipline mappings: renders dictionary as readable table", () => {
    const table = createElement("table");

    registryModule.renderDisciplineMappingsTable({
        document: createDocument(),
        tableElement: table,
        mappings: [
            {
                projectDisciplineGroup: "Технологические направления проектирования",
                projectDisciplineSection: "Производство чугуна и стали",
                projectDisciplineName: "Агломерационное производство",
                resourceDisciplineName: "01.1 Коксоаглодоменный отдел"
            }
        ]
    });

    assert.equal(table.children.length, 2);
    assert.deepEqual(
        table.children[0].children[0].children.map(x => x.textContent),
        ["Группа", "Раздел", "Проектная дисциплина", "Дисциплина-ресурс"]);
    assert.deepEqual(
        table.children[1].children[0].children.map(x => x.textContent),
        [
            "Технологические направления проектирования",
            "Производство чугуна и стали",
            "Агломерационное производство",
            "01.1 Коксоаглодоменный отдел"
        ]);
});

test("imports discipline mappings: loads mappings and updates status", async () => {
    const table = createElement("table");
    const status = createElement("p");
    const refreshButton = createElement("button");
    const calls = [];

    const registry = registryModule.createDisciplineMappingsRegistry({
        document: createDocument(),
        endpoint: "/api/imports/discipline-mappings",
        tableElement: table,
        statusElement: status,
        refreshButton: refreshButton,
        fetchImpl: async function (url, options) {
            calls.push({ url, options });
            return {
                ok: true,
                json: async function () {
                    return [
                        {
                            projectDisciplineGroup: "Группа",
                            projectDisciplineSection: "Раздел",
                            projectDisciplineName: "Проектная дисциплина",
                            resourceDisciplineName: "Ресурс"
                        }
                    ];
                }
            };
        }
    });

    await registry.load();

    assert.equal(calls[0].url, "/api/imports/discipline-mappings");
    assert.equal(calls[0].options.credentials, "include");
    assert.match(status.textContent, /Загружено записей: 1/);
    assert.equal(table.children[1].children[0].children[3].textContent, "Ресурс");
});
