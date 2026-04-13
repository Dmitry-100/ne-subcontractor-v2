"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const runtimeModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/dashboard-page-runtime.js"));

function createStatusElement() {
    return {
        textContent: "",
        classList: {
            addCalls: [],
            toggle: function () {},
            add: function (value) {
                this.addCalls.push(value);
            }
        }
    };
}

function createModuleRoot() {
    const elements = new Map();
    return {
        querySelector: function (selector) {
            if (!elements.has(selector)) {
                elements.set(selector, {
                    selector: selector,
                    textContent: "",
                    classList: {
                        add: function () {},
                        toggle: function () {}
                    }
                });
            }

            return elements.get(selector);
        }
    };
}

async function flushAsync() {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise(function (resolve) {
        setImmediate(resolve);
    });
}

test("dashboard runtime: validates required dependencies", () => {
    assert.throws(function () {
        runtimeModule.initializeDashboardPage({
            window: {
                fetch: async function () {
                    return { ok: true, json: async function () { return {}; } };
                }
            },
            document: {
                createElement: function () {
                    return {};
                }
            }
        });
    }, /context/i);
});

test("dashboard runtime: sets status error when renderer module is missing", () => {
    const statusElement = createStatusElement();
    const refreshButton = {
        disabled: false,
        addEventListener: function () {}
    };

    const result = runtimeModule.initializeDashboardPage({
        window: {
            fetch: async function () {
                return { ok: true, json: async function () { return {}; } };
            }
        },
        document: {
            createElement: function () {
                return {};
            }
        },
        context: {
            moduleRoot: createModuleRoot(),
            endpoint: "/api/dashboard/summary",
            analyticsEndpoint: "/api/analytics/kpi",
            controls: {
                statusElement: statusElement,
                refreshButton: refreshButton,
                tasksElement: {},
                lotStatusesElement: {},
                procedureStatusesElement: {},
                contractStatusesElement: {}
            },
            moduleRoots: {
                dashboardHelpersRoot: {
                    createHelpers: function () {
                        return {
                            parseErrorBody: function () { return "err"; }
                        };
                    }
                },
                dashboardFormattersRoot: {
                    createFormatters: function () {
                        return {
                            toFiniteNumber: function (value) { return Number(value || 0); }
                        };
                    }
                }
            }
        }
    });

    assert.equal(result, null);
    assert.equal(statusElement.textContent, "Не удалось инициализировать модуль дашборда: renderer-скрипт не загружен.");
    assert.deepEqual(statusElement.classList.addCalls, ["dashboard-status--error"]);
});

test("dashboard runtime: loads summary and analytics and wires refresh button", async () => {
    const events = {
        fetchCalls: [],
        summaries: [],
        analytics: [],
        statuses: [],
        analyticsStatuses: [],
        disclosureRoots: [],
        refreshHandler: null
    };

    const statusElement = createStatusElement();
    const refreshButton = {
        disabled: false,
        addEventListener: function (name, callback) {
            if (name === "click") {
                events.refreshHandler = callback;
            }
        }
    };

    const context = {
        moduleRoot: createModuleRoot(),
        endpoint: "/api/dashboard/summary",
        analyticsEndpoint: "/api/analytics/kpi",
        controls: {
            statusElement: statusElement,
            refreshButton: refreshButton,
            tasksElement: {},
            lotStatusesElement: {},
            procedureStatusesElement: {},
            contractStatusesElement: {}
        },
        moduleRoots: {
            dashboardHelpersRoot: {
                createHelpers: function () {
                    return {
                        parseErrorBody: function () {
                            return "parse error";
                        }
                    };
                }
            },
            dashboardFormattersRoot: {
                createFormatters: function () {
                    return {
                        toFiniteNumber: function (value) { return Number(value || 0); }
                    };
                }
            }
        }
    };

    const windowMock = {
        fetch: async function (url, options) {
            events.fetchCalls.push({ url: url, options: options });
            if (url === "/api/analytics/kpi") {
                return {
                    ok: true,
                    json: async function () {
                        return { source: "analytics" };
                    }
                };
            }

            return {
                ok: true,
                json: async function () {
                    return { source: "summary" };
                }
            };
        },
        DashboardPageRenderers: {
            createRenderers: function () {
                return {
                    applySummary: function (value) {
                        events.summaries.push(value);
                    },
                    applyAnalytics: function (value) {
                        events.analytics.push(value);
                    },
                    setStatus: function (message, isError) {
                        events.statuses.push({ message: message, isError: isError });
                    },
                    setAnalyticsStatus: function (message, isError) {
                        events.analyticsStatuses.push({ message: message, isError: isError });
                    }
                };
            }
        }
    };

    runtimeModule.initializeDashboardPage({
        window: windowMock,
        document: {
            createElement: function (tagName) {
                return { tagName: tagName };
            }
        },
        context: context,
        bootstrapRoot: {
            initializeDisclosureHints: function (moduleRoot) {
                events.disclosureRoots.push(moduleRoot);
            }
        }
    });

    await flushAsync();

    assert.equal(events.fetchCalls.length, 2);
    assert.deepEqual(events.fetchCalls[0], {
        url: "/api/dashboard/summary",
        options: {
            credentials: "include",
            method: "GET",
            headers: {
                Accept: "application/json"
            }
        }
    });
    assert.deepEqual(events.fetchCalls[1].url, "/api/analytics/kpi");
    assert.deepEqual(events.summaries, [{ source: "summary" }]);
    assert.deepEqual(events.analytics, [{ source: "analytics" }]);
    assert.deepEqual(events.statuses, [{ message: "Дашборд загружен.", isError: false }]);
    assert.deepEqual(events.analyticsStatuses, [{ message: "Аналитический контур обновлён.", isError: false }]);
    assert.deepEqual(events.disclosureRoots, [context.moduleRoot]);
    assert.equal(typeof events.refreshHandler, "function");

    events.refreshHandler();
    await flushAsync();
    assert.equal(events.fetchCalls.length, 4);
});

test("dashboard runtime: analytics still loads when summary endpoint fails", async () => {
    const events = {
        summaries: [],
        analytics: [],
        statuses: [],
        analyticsStatuses: []
    };

    const statusElement = createStatusElement();
    const refreshButton = {
        disabled: false,
        addEventListener: function () {}
    };

    runtimeModule.initializeDashboardPage({
        window: {
            fetch: async function (url) {
                if (url === "/api/dashboard/summary") {
                    return {
                        ok: false,
                        status: 500,
                        text: async function () {
                            return "{\"detail\":\"summary failed\"}";
                        }
                    };
                }

                return {
                    ok: true,
                    json: async function () {
                        return { source: "analytics" };
                    }
                };
            },
            DashboardPageRenderers: {
                createRenderers: function () {
                    return {
                        applySummary: function (value) {
                            events.summaries.push(value);
                        },
                        applyAnalytics: function (value) {
                            events.analytics.push(value);
                        },
                        setStatus: function (message, isError) {
                            events.statuses.push({ message: message, isError: isError });
                        },
                        setAnalyticsStatus: function (message, isError) {
                            events.analyticsStatuses.push({ message: message, isError: isError });
                        }
                    };
                }
            }
        },
        document: {
            createElement: function () {
                return {};
            }
        },
        context: {
            moduleRoot: createModuleRoot(),
            endpoint: "/api/dashboard/summary",
            analyticsEndpoint: "/api/analytics/kpi",
            controls: {
                statusElement: statusElement,
                refreshButton: refreshButton,
                tasksElement: {},
                lotStatusesElement: {},
                procedureStatusesElement: {},
                contractStatusesElement: {}
            },
            moduleRoots: {
                dashboardHelpersRoot: {
                    createHelpers: function () {
                        return {
                            parseErrorBody: function (value) {
                                return value.includes("summary failed")
                                    ? "summary failed"
                                    : "unknown";
                            }
                        };
                    }
                },
                dashboardFormattersRoot: {
                    createFormatters: function () {
                        return {
                            toFiniteNumber: function (value) {
                                return Number(value || 0);
                            }
                        };
                    }
                }
            }
        }
    });

    await flushAsync();

    assert.deepEqual(events.summaries, []);
    assert.deepEqual(events.analytics, [{ source: "analytics" }]);
    assert.deepEqual(events.statuses, [{ message: "Не удалось загрузить дашборд: summary failed", isError: true }]);
    assert.deepEqual(events.analyticsStatuses, [{ message: "Аналитический контур обновлён.", isError: false }]);
});
