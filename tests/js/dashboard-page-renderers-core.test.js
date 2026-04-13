"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const coreModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/dashboard-page-renderers-core.js"));

function createMockElement(tagName) {
    const classes = new Set();
    return {
        tagName: String(tagName || "div").toUpperCase(),
        textContent: "",
        innerHTML: "",
        href: "",
        className: "",
        children: [],
        style: {
            values: {},
            setProperty: function (name, value) {
                this.values[name] = value;
            }
        },
        classList: {
            toggle: function (value, force) {
                if (force) {
                    classes.add(value);
                    return true;
                }

                classes.delete(value);
                return false;
            },
            contains: function (value) {
                return classes.has(value);
            }
        },
        appendChild: function (child) {
            this.children.push(child);
            return child;
        }
    };
}

function createHelpers() {
    return {
        localizeStatus: function (value) {
            return "status:" + value;
        },
        localizePriority: function (value) {
            return String(value || "normal");
        },
        formatDate: function (value) {
            return value ? "date:" + value : "н/д";
        }
    };
}

test("dashboard renderers core: validates dependencies", () => {
    assert.throws(
        function () {
            coreModule.createCore({});
        },
        /dashboard helpers/i);

    assert.throws(
        function () {
            coreModule.createCore({
                dashboardHelpers: createHelpers()
            });
        },
        /createElement function/i);
});

test("dashboard renderers core: renders statuses and tasks with safe defaults", () => {
    const statusElement = createMockElement("p");
    const analyticsStatusElement = createMockElement("p");
    const tasksElement = createMockElement("ul");
    const lotStatusesElement = createMockElement("ul");
    const core = coreModule.createCore({
        dashboardHelpers: createHelpers(),
        createElement: createMockElement,
        statusElement: statusElement,
        analyticsStatusElement: analyticsStatusElement,
        tasksElement: tasksElement,
        lotStatusesElement: lotStatusesElement
    });

    core.setStatus("ok", false);
    assert.equal(statusElement.textContent, "ok");
    assert.equal(statusElement.classList.contains("dashboard-status--error"), false);

    core.setAnalyticsStatus("failed", true);
    assert.equal(analyticsStatusElement.textContent, "failed");
    assert.equal(analyticsStatusElement.classList.contains("dashboard-status--error"), true);

    core.renderStatusList(lotStatusesElement, [{ status: "Draft", count: 2 }]);
    assert.equal(lotStatusesElement.children.length, 1);
    assert.equal(lotStatusesElement.children[0].children[0].textContent, "status:Draft");
    assert.equal(lotStatusesElement.children[0].children[1].textContent, "2");

    core.renderTasks([
        {
            module: "Contracts",
            title: "Task",
            description: "desc",
            dueDate: "2026-04-12",
            priority: "High",
            actionUrl: "   "
        }
    ]);

    assert.equal(tasksElement.children.length, 1);
    assert.equal(tasksElement.children[0].children[3].children[1].href, "#");
    assert.equal(tasksElement.children[0].children[3].children[1].textContent, "Открыть");
});
