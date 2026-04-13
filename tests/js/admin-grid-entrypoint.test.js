"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const adminGridModulePath = path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/admin-grid.js");

function createStatusElement() {
    const toggled = [];

    return {
        textContent: "",
        toggled: toggled,
        classList: {
            toggle: function (className, value) {
                toggled.push({ className: className, value: value });
            }
        }
    };
}

function createControls(statusElements) {
    return {
        usersStatusElement: statusElements.usersStatusElement,
        rolesStatusElement: statusElements.rolesStatusElement,
        referenceStatusElement: statusElements.referenceStatusElement,
        usersSearchInput: { id: "users-search" },
        usersSearchApplyButton: { id: "users-search-apply" },
        usersSearchResetButton: { id: "users-search-reset" },
        referenceTypeCodeInput: { id: "reference-type" },
        referenceActiveOnlyCheckbox: { id: "reference-active-only" },
        referenceLoadButton: { id: "reference-load" },
        referenceOpenApiLink: { id: "reference-link" },
        usersGridElement: { id: "users-grid" },
        rolesGridElement: { id: "roles-grid" },
        referenceGridElement: { id: "reference-grid" }
    };
}

function loadAdminGridWithGlobals(windowMock, documentMock) {
    delete require.cache[adminGridModulePath];
    global.window = windowMock;
    global.document = documentMock;
    require(adminGridModulePath);

    return function cleanup() {
        delete global.window;
        delete global.document;
    };
}

async function waitForBootstrapSettled() {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise(function (resolve) {
        setImmediate(resolve);
    });
}

test("admin grid entrypoint: returns early when AdminBootstrap is missing", async () => {
    let cleanup = function () {};
    try {
        cleanup = loadAdminGridWithGlobals({}, {});
        await waitForBootstrapSettled();
    } finally {
        cleanup();
    }
});

test("admin grid entrypoint: returns early when bootstrap context is null", async () => {
    const events = {
        bootstrapCalls: 0
    };

    const windowMock = {
        AdminBootstrap: {
            createBootstrapContext: function () {
                events.bootstrapCalls += 1;
                return null;
            }
        }
    };

    let cleanup = function () {};
    try {
        cleanup = loadAdminGridWithGlobals(windowMock, { id: "doc" });
        await waitForBootstrapSettled();
    } finally {
        cleanup();
    }

    assert.equal(events.bootstrapCalls, 1);
});

test("admin grid entrypoint: composes bootstrap/runtime/grids/wiring modules", async () => {
    const events = {
        bootstrapCalls: 0,
        bootstrapArgs: null,
        apiOptions: null,
        wiringOptions: null,
        runtimeOptions: null,
        gridsOptions: null,
        loadRolesCalls: 0,
        getRolesCalls: 0,
        wiringInitializeCalls: 0,
        wiringBindEventsCalls: 0,
        usersGridRefreshCalls: 0,
        referenceGridRefreshCalls: 0,
        flow: []
    };

    const statusElements = {
        usersStatusElement: createStatusElement(),
        rolesStatusElement: createStatusElement(),
        referenceStatusElement: createStatusElement()
    };
    const controls = createControls(statusElements);
    const messages = {
        usersLoading: function () { return "users loading"; },
        rolesLoading: function () { return "roles loading"; },
        referenceLoading: function () { return "reference loading"; },
        usersLoaded: function () { return "users loaded"; },
        rolesLoaded: function () { return "roles loaded"; },
        referenceLoaded: function () { return "reference loaded"; },
        userUpdated: function () { return "user updated"; },
        referenceSaved: function () { return "reference saved"; },
        referenceUpdated: function () { return "reference updated"; },
        referenceDeleted: function () { return "reference deleted"; },
        usersOperationError: function () { return "users operation error"; },
        referenceOperationError: function () { return "reference operation error"; },
        bootstrapFailed: function () { return "bootstrap failed"; },
        invalidReferenceType: function () { return "invalid reference type"; }
    };
    const helpers = {
        parseErrorBody: function () { return "parse"; },
        normalizeTypeCode: function (value) { return String(value); },
        buildReferenceItemsUrl: function () { return "/api/reference"; },
        hasOwn: function (source, key) { return Object.prototype.hasOwnProperty.call(source, key); },
        normalizeRoleNames: function () { return []; },
        buildReferencePayload: function () { return {}; },
        toStringList: function (value) { return Array.isArray(value) ? value : []; }
    };
    const apiClient = {
        id: "api-client"
    };
    const runtime = {
        usersStore: { id: "users-store" },
        referenceStore: { id: "reference-store" },
        loadRoles: async function () {
            events.flow.push("runtime.loadRoles");
            events.loadRolesCalls += 1;
        },
        getRoles: function () {
            events.flow.push("runtime.getRoles");
            events.getRolesCalls += 1;
            return [
                { id: "role-admin", name: "Admin", description: "Администратор" }
            ];
        }
    };
    const wiring = {
        initialize: function () {
            events.flow.push("wiring.initialize");
            events.wiringInitializeCalls += 1;
        },
        bindEvents: function () {
            events.flow.push("wiring.bindEvents");
            events.wiringBindEventsCalls += 1;
        },
        getUsersSearch: function () {
            return "ivanov";
        },
        getReferenceContext: function () {
            return {
                typeCode: "PURCHASE_TYPE",
                activeOnly: false
            };
        }
    };

    const usersGridInstance = {
        refresh: async function () {
            events.flow.push("usersGrid.refresh");
            events.usersGridRefreshCalls += 1;
        }
    };
    const referenceGridInstance = {
        refresh: async function () {
            events.flow.push("referenceGrid.refresh");
            events.referenceGridRefreshCalls += 1;
        }
    };

    const windowMock = {
        jQuery: function () {},
        DevExpress: {
            data: {
                CustomStore: function CustomStoreStub() {}
            }
        },
        console: {
            error: function () {}
        },
        AdminBootstrap: {
            createBootstrapContext: function (options) {
                events.bootstrapCalls += 1;
                events.bootstrapArgs = options;
                return {
                    endpoints: {
                        usersEndpoint: "/api/custom/users",
                        rolesEndpoint: "/api/custom/roles",
                        referenceApiRoot: "/api/custom/reference-data"
                    },
                    controls: controls,
                    moduleRoots: {
                        adminMessagesRoot: {
                            createMessages: function () { return messages; }
                        },
                        adminHelpersRoot: {
                            createHelpers: function () { return helpers; }
                        },
                        adminApiRoot: {
                            createApiClient: function (options) {
                                events.apiOptions = options;
                                return apiClient;
                            }
                        },
                        adminRuntimeRoot: {
                            createRuntime: function (options) {
                                events.runtimeOptions = options;
                                return runtime;
                            }
                        },
                        adminGridsRoot: {
                            createGrids: function (options) {
                                events.gridsOptions = options;
                                return {
                                    usersGridInstance: usersGridInstance,
                                    rolesGridInstance: { id: "roles-grid-instance" },
                                    referenceGridInstance: referenceGridInstance
                                };
                            }
                        },
                        adminWiringRoot: {
                            createWiring: function (options) {
                                events.wiringOptions = options;
                                return wiring;
                            }
                        }
                    }
                };
            }
        }
    };

    const documentMock = {
        id: "document"
    };

    let cleanup = function () {};
    try {
        cleanup = loadAdminGridWithGlobals(windowMock, documentMock);
        await waitForBootstrapSettled();
    } finally {
        cleanup();
    }

    assert.equal(events.bootstrapCalls, 1);
    assert.equal(events.bootstrapArgs.document, documentMock);
    assert.equal(events.bootstrapArgs.window, windowMock);
    assert.equal(typeof events.bootstrapArgs.logError, "function");

    assert.deepEqual(events.apiOptions, {
        usersEndpoint: "/api/custom/users",
        rolesEndpoint: "/api/custom/roles",
        referenceApiRoot: "/api/custom/reference-data",
        parseErrorBody: helpers.parseErrorBody
    });

    assert.equal(events.wiringOptions.referenceApiRoot, "/api/custom/reference-data");
    assert.equal(events.wiringOptions.invalidReferenceTypeMessage, "invalid reference type");

    assert.equal(events.runtimeOptions.customStoreCtor, windowMock.DevExpress.data.CustomStore);
    assert.equal(events.runtimeOptions.apiClient, apiClient);
    assert.equal(events.runtimeOptions.messages.usersLoaded, messages.usersLoaded);
    assert.equal(events.runtimeOptions.messages.referenceDeleted, messages.referenceDeleted);

    assert.equal(events.gridsOptions.stores.usersStore, runtime.usersStore);
    assert.equal(events.gridsOptions.stores.referenceStore, runtime.referenceStore);
    assert.deepEqual(events.gridsOptions.rolesDataSource, [
        { id: "role-admin", name: "Admin", description: "Администратор" }
    ]);

    assert.equal(events.loadRolesCalls, 1);
    assert.equal(events.getRolesCalls, 1);
    assert.equal(events.wiringInitializeCalls, 1);
    assert.equal(events.wiringBindEventsCalls, 1);
    assert.equal(events.usersGridRefreshCalls, 1);
    assert.equal(events.referenceGridRefreshCalls, 1);

    assert.equal(statusElements.usersStatusElement.textContent, "users loading");
    assert.equal(statusElements.rolesStatusElement.textContent, "roles loading");
    assert.equal(statusElements.referenceStatusElement.textContent, "reference loading");
    assert.deepEqual(statusElements.usersStatusElement.toggled[0], { className: "admin-status--error", value: false });
    assert.deepEqual(statusElements.rolesStatusElement.toggled[0], { className: "admin-status--error", value: false });
    assert.deepEqual(statusElements.referenceStatusElement.toggled[0], { className: "admin-status--error", value: false });

    assert.deepEqual(events.flow.slice(0, 4), [
        "wiring.initialize",
        "runtime.loadRoles",
        "runtime.getRoles",
        "wiring.bindEvents"
    ]);
    assert.deepEqual(events.flow.slice(4).sort(), [
        "referenceGrid.refresh",
        "usersGrid.refresh"
    ]);
});

test("admin grid entrypoint: bootstrap error updates all status blocks", async () => {
    const statusElements = {
        usersStatusElement: createStatusElement(),
        rolesStatusElement: createStatusElement(),
        referenceStatusElement: createStatusElement()
    };
    const controls = createControls(statusElements);

    const messages = {
        usersLoading: function () { return "users loading"; },
        rolesLoading: function () { return "roles loading"; },
        referenceLoading: function () { return "reference loading"; },
        usersLoaded: function () { return "users loaded"; },
        rolesLoaded: function () { return "roles loaded"; },
        referenceLoaded: function () { return "reference loaded"; },
        userUpdated: function () { return "user updated"; },
        referenceSaved: function () { return "reference saved"; },
        referenceUpdated: function () { return "reference updated"; },
        referenceDeleted: function () { return "reference deleted"; },
        usersOperationError: function () { return "users operation error"; },
        referenceOperationError: function () { return "reference operation error"; },
        bootstrapFailed: function () { return "bootstrap failed"; },
        invalidReferenceType: function () { return "invalid reference type"; }
    };

    const windowMock = {
        jQuery: function () {},
        DevExpress: {
            data: {
                CustomStore: function CustomStoreStub() {}
            }
        },
        console: {
            error: function () {}
        },
        AdminBootstrap: {
            createBootstrapContext: function () {
                return {
                    endpoints: {
                        usersEndpoint: "/api/users",
                        rolesEndpoint: "/api/roles",
                        referenceApiRoot: "/api/reference"
                    },
                    controls: controls,
                    moduleRoots: {
                        adminMessagesRoot: {
                            createMessages: function () { return messages; }
                        },
                        adminHelpersRoot: {
                            createHelpers: function () {
                                return {
                                    parseErrorBody: function () {},
                                    normalizeTypeCode: function (value) { return String(value); },
                                    buildReferenceItemsUrl: function () { return "/api/reference"; },
                                    hasOwn: function () { return false; },
                                    normalizeRoleNames: function () { return []; },
                                    buildReferencePayload: function () { return {}; },
                                    toStringList: function () { return []; }
                                };
                            }
                        },
                        adminApiRoot: {
                            createApiClient: function () { return {}; }
                        },
                        adminRuntimeRoot: {
                            createRuntime: function () {
                                return {
                                    usersStore: {},
                                    referenceStore: {},
                                    loadRoles: async function () {
                                        throw new Error("runtime failed");
                                    },
                                    getRoles: function () {
                                        return [];
                                    }
                                };
                            }
                        },
                        adminGridsRoot: {
                            createGrids: function () {
                                return {
                                    usersGridInstance: { refresh: async function () {} },
                                    rolesGridInstance: {},
                                    referenceGridInstance: { refresh: async function () {} }
                                };
                            }
                        },
                        adminWiringRoot: {
                            createWiring: function () {
                                return {
                                    initialize: function () {},
                                    bindEvents: function () {},
                                    getUsersSearch: function () { return ""; },
                                    getReferenceContext: function () { return { typeCode: "PURCHASE_TYPE", activeOnly: false }; }
                                };
                            }
                        }
                    }
                };
            }
        }
    };

    let cleanup = function () {};
    try {
        cleanup = loadAdminGridWithGlobals(windowMock, { id: "doc" });
        await waitForBootstrapSettled();
    } finally {
        cleanup();
    }

    assert.equal(statusElements.usersStatusElement.textContent, "runtime failed");
    assert.equal(statusElements.rolesStatusElement.textContent, "runtime failed");
    assert.equal(statusElements.referenceStatusElement.textContent, "runtime failed");

    const usersLastToggle = statusElements.usersStatusElement.toggled.at(-1);
    const rolesLastToggle = statusElements.rolesStatusElement.toggled.at(-1);
    const referenceLastToggle = statusElements.referenceStatusElement.toggled.at(-1);

    assert.deepEqual(usersLastToggle, { className: "admin-status--error", value: true });
    assert.deepEqual(rolesLastToggle, { className: "admin-status--error", value: true });
    assert.deepEqual(referenceLastToggle, { className: "admin-status--error", value: true });
});

test("admin grid entrypoint: reference refresh failure is isolated to reference status", async () => {
    const statusElements = {
        usersStatusElement: createStatusElement(),
        rolesStatusElement: createStatusElement(),
        referenceStatusElement: createStatusElement()
    };
    const controls = createControls(statusElements);

    const messages = {
        usersLoading: function () { return "users loading"; },
        rolesLoading: function () { return "roles loading"; },
        referenceLoading: function () { return "reference loading"; },
        usersLoaded: function () { return "users loaded"; },
        rolesLoaded: function () { return "roles loaded"; },
        referenceLoaded: function () { return "reference loaded"; },
        userUpdated: function () { return "user updated"; },
        referenceSaved: function () { return "reference saved"; },
        referenceUpdated: function () { return "reference updated"; },
        referenceDeleted: function () { return "reference deleted"; },
        usersOperationError: function () { return "users operation error"; },
        referenceOperationError: function () { return "reference operation error"; },
        bootstrapFailed: function () { return "bootstrap failed"; },
        invalidReferenceType: function () { return "invalid reference type"; }
    };

    const windowMock = {
        jQuery: function () {},
        DevExpress: {
            data: {
                CustomStore: function CustomStoreStub() {}
            }
        },
        console: {
            error: function () {}
        },
        AdminBootstrap: {
            createBootstrapContext: function () {
                return {
                    endpoints: {
                        usersEndpoint: "/api/users",
                        rolesEndpoint: "/api/roles",
                        referenceApiRoot: "/api/reference"
                    },
                    controls: controls,
                    moduleRoots: {
                        adminMessagesRoot: {
                            createMessages: function () { return messages; }
                        },
                        adminHelpersRoot: {
                            createHelpers: function () {
                                return {
                                    parseErrorBody: function () {},
                                    normalizeTypeCode: function (value) { return String(value); },
                                    buildReferenceItemsUrl: function () { return "/api/reference"; },
                                    hasOwn: function () { return false; },
                                    normalizeRoleNames: function () { return []; },
                                    buildReferencePayload: function () { return {}; },
                                    toStringList: function () { return []; }
                                };
                            }
                        },
                        adminApiRoot: {
                            createApiClient: function () { return {}; }
                        },
                        adminRuntimeRoot: {
                            createRuntime: function () {
                                return {
                                    usersStore: {},
                                    referenceStore: {},
                                    loadRoles: async function () {},
                                    getRoles: function () {
                                        return [];
                                    }
                                };
                            }
                        },
                        adminGridsRoot: {
                            createGrids: function () {
                                return {
                                    usersGridInstance: {
                                        refresh: async function () {}
                                    },
                                    rolesGridInstance: {},
                                    referenceGridInstance: {
                                        refresh: async function () {
                                            throw new Error("reference refresh failed");
                                        }
                                    }
                                };
                            }
                        },
                        adminWiringRoot: {
                            createWiring: function () {
                                return {
                                    initialize: function () {},
                                    bindEvents: function () {},
                                    getUsersSearch: function () { return ""; },
                                    getReferenceContext: function () { return { typeCode: "PURCHASE_TYPE", activeOnly: false }; }
                                };
                            }
                        }
                    }
                };
            }
        }
    };

    let cleanup = function () {};
    try {
        cleanup = loadAdminGridWithGlobals(windowMock, { id: "doc" });
        await waitForBootstrapSettled();
    } finally {
        cleanup();
    }

    assert.equal(statusElements.referenceStatusElement.textContent, "reference refresh failed");
    assert.deepEqual(statusElements.referenceStatusElement.toggled.at(-1), {
        className: "admin-status--error",
        value: true
    });
    assert.deepEqual(statusElements.usersStatusElement.toggled.at(-1), {
        className: "admin-status--error",
        value: false
    });
    assert.deepEqual(statusElements.rolesStatusElement.toggled.at(-1), {
        className: "admin-status--error",
        value: false
    });
});

test("admin grid entrypoint: defers reference refresh until window load when document is not complete", async () => {
    const events = {
        usersGridRefreshCalls: 0,
        referenceGridRefreshCalls: 0
    };
    const statusElements = {
        usersStatusElement: createStatusElement(),
        rolesStatusElement: createStatusElement(),
        referenceStatusElement: createStatusElement()
    };
    const controls = createControls(statusElements);
    const listeners = [];

    const windowMock = {
        jQuery: function () {},
        DevExpress: {
            data: {
                CustomStore: function CustomStoreStub() {}
            }
        },
        console: {
            error: function () {}
        },
        addEventListener: function (eventName, handler) {
            listeners.push({ eventName: eventName, handler: handler });
        },
        AdminBootstrap: {
            createBootstrapContext: function () {
                return {
                    endpoints: {
                        usersEndpoint: "/api/users",
                        rolesEndpoint: "/api/roles",
                        referenceApiRoot: "/api/reference"
                    },
                    controls: controls,
                    moduleRoots: {
                        adminMessagesRoot: {
                            createMessages: function () {
                                return {
                                    usersLoading: function () { return "users loading"; },
                                    rolesLoading: function () { return "roles loading"; },
                                    referenceLoading: function () { return "reference loading"; },
                                    usersLoaded: function () { return "users loaded"; },
                                    rolesLoaded: function () { return "roles loaded"; },
                                    referenceLoaded: function () { return "reference loaded"; },
                                    userUpdated: function () { return "user updated"; },
                                    referenceSaved: function () { return "reference saved"; },
                                    referenceUpdated: function () { return "reference updated"; },
                                    referenceDeleted: function () { return "reference deleted"; },
                                    usersOperationError: function () { return "users operation error"; },
                                    referenceOperationError: function () { return "reference operation error"; },
                                    bootstrapFailed: function () { return "bootstrap failed"; },
                                    invalidReferenceType: function () { return "invalid reference type"; }
                                };
                            }
                        },
                        adminHelpersRoot: {
                            createHelpers: function () {
                                return {
                                    parseErrorBody: function () {},
                                    normalizeTypeCode: function (value) { return String(value); },
                                    buildReferenceItemsUrl: function () { return "/api/reference"; },
                                    hasOwn: function () { return false; },
                                    normalizeRoleNames: function () { return []; },
                                    buildReferencePayload: function () { return {}; },
                                    toStringList: function () { return []; }
                                };
                            }
                        },
                        adminApiRoot: {
                            createApiClient: function () { return {}; }
                        },
                        adminRuntimeRoot: {
                            createRuntime: function () {
                                return {
                                    usersStore: {},
                                    referenceStore: {},
                                    loadRoles: async function () {},
                                    getRoles: function () {
                                        return [];
                                    }
                                };
                            }
                        },
                        adminGridsRoot: {
                            createGrids: function () {
                                return {
                                    usersGridInstance: {
                                        refresh: async function () {
                                            events.usersGridRefreshCalls += 1;
                                        }
                                    },
                                    rolesGridInstance: {},
                                    referenceGridInstance: {
                                        refresh: async function () {
                                            events.referenceGridRefreshCalls += 1;
                                        }
                                    }
                                };
                            }
                        },
                        adminWiringRoot: {
                            createWiring: function () {
                                return {
                                    initialize: function () {},
                                    bindEvents: function () {},
                                    getUsersSearch: function () { return ""; },
                                    getReferenceContext: function () { return { typeCode: "PURCHASE_TYPE", activeOnly: false }; }
                                };
                            }
                        }
                    }
                };
            }
        }
    };

    const documentMock = {
        id: "doc",
        readyState: "interactive"
    };

    let cleanup = function () {};
    try {
        cleanup = loadAdminGridWithGlobals(windowMock, documentMock);
        await waitForBootstrapSettled();
    } finally {
        cleanup();
    }

    assert.equal(events.usersGridRefreshCalls, 1);
    assert.equal(events.referenceGridRefreshCalls, 0);
    assert.equal(listeners.length, 1);
    assert.equal(listeners[0].eventName, "load");

    await listeners[0].handler();
    await waitForBootstrapSettled();
    assert.equal(events.referenceGridRefreshCalls, 1);
});
