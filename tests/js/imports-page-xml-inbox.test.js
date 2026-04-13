"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const xmlInboxModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-xml-inbox.js"));

test("imports xml inbox: createXmlInboxService validates required dependencies", () => {
    assert.throws(
        function () {
            xmlInboxModule.createXmlInboxService({});
        },
        /apiClient/);
});

test("imports xml inbox: loadXmlInbox renders rows and updates status", async () => {
    const calls = {
        statuses: [],
        renderModels: []
    };

    const service = xmlInboxModule.createXmlInboxService({
        apiClient: {
            getXmlInbox: async function () {
                return [{ id: "xml-1" }, { id: "xml-2" }];
            },
            queueXmlInboxItem: async function () {
                throw new Error("unexpected");
            },
            retryXmlInboxItem: async function () {
                throw new Error("unexpected");
            }
        },
        xmlInboxEndpoint: "/api/imports/source-data/xml/inbox",
        xmlHelpers: {
            normalizeRows: function (payload) {
                return Array.isArray(payload) ? payload : [];
            },
            buildQueueRequest: function () {
                throw new Error("unexpected");
            },
            buildLoadSuccessStatus: function (rowsCount) {
                return `loaded:${rowsCount}`;
            },
            buildQueueSuccessStatus: function () {
                throw new Error("unexpected");
            },
            buildRetrySuccessStatus: function () {
                throw new Error("unexpected");
            }
        },
        tableModels: {
            buildXmlInboxModel: function (rows) {
                return {
                    headers: ["h1"],
                    rows: rows
                };
            }
        },
        setXmlStatus: function (message, isError) {
            calls.statuses.push({ message: message, isError: Boolean(isError) });
        },
        renderTableModel: function (model) {
            calls.renderModels.push(model);
        }
    });

    const rows = await service.loadXmlInbox();

    assert.equal(rows.length, 2);
    assert.equal(calls.renderModels.length, 1);
    assert.equal(calls.renderModels[0].rows.length, 2);
    assert.deepEqual(calls.statuses, [
        { message: "Загрузка XML-очереди...", isError: false },
        { message: "loaded:2", isError: false }
    ]);
});

test("imports xml inbox: loadXmlInbox handles errors and returns empty array", async () => {
    const statuses = [];
    const service = xmlInboxModule.createXmlInboxService({
        apiClient: {
            getXmlInbox: async function () {
                throw new Error("network down");
            },
            queueXmlInboxItem: async function () {},
            retryXmlInboxItem: async function () {}
        },
        xmlInboxEndpoint: "/api/imports/source-data/xml/inbox",
        xmlHelpers: {
            normalizeRows: function () {
                return [];
            },
            buildQueueRequest: function () {
                throw new Error("unexpected");
            },
            buildLoadSuccessStatus: function () {
                return "ok";
            },
            buildQueueSuccessStatus: function () {
                throw new Error("unexpected");
            },
            buildRetrySuccessStatus: function () {
                throw new Error("unexpected");
            }
        },
        tableModels: {
            buildXmlInboxModel: function () {
                return { headers: [], rows: [] };
            }
        },
        setXmlStatus: function (message, isError) {
            statuses.push({ message: message, isError: Boolean(isError) });
        },
        renderTableModel: function () {}
    });

    const rows = await service.loadXmlInbox();
    assert.deepEqual(rows, []);
    assert.equal(statuses.length, 2);
    assert.equal(statuses[1].isError, true);
    assert.match(statuses[1].message, /network down/);
});

test("imports xml inbox: queueXmlInboxItem queues item, refreshes inbox and returns normalized file name", async () => {
    const calls = {
        queuePayloads: [],
        statuses: [],
        renders: []
    };

    const service = xmlInboxModule.createXmlInboxService({
        apiClient: {
            getXmlInbox: async function () {
                return [{ id: "xml-queued" }];
            },
            queueXmlInboxItem: async function (endpoint, payload) {
                calls.queuePayloads.push({ endpoint: endpoint, payload: payload });
                return { id: "xml-queued", status: "Received" };
            },
            retryXmlInboxItem: async function () {
                throw new Error("unexpected");
            }
        },
        xmlInboxEndpoint: "/api/imports/source-data/xml/inbox",
        xmlHelpers: {
            normalizeRows: function (payload) {
                return payload;
            },
            buildQueueRequest: function (formValues) {
                assert.equal(formValues.sourceSystem, "ExpressPlanning");
                return {
                    payload: { sourceSystem: "ExpressPlanning", xmlContent: "<a />" },
                    normalizedFileName: "generated.xml"
                };
            },
            buildLoadSuccessStatus: function (rowsCount) {
                return `loaded:${rowsCount}`;
            },
            buildQueueSuccessStatus: function (created) {
                return `queued:${created.id}`;
            },
            buildRetrySuccessStatus: function () {
                throw new Error("unexpected");
            }
        },
        tableModels: {
            buildXmlInboxModel: function (rows) {
                return {
                    headers: ["h1"],
                    rows: rows
                };
            }
        },
        setXmlStatus: function (message, isError) {
            calls.statuses.push({ message: message, isError: Boolean(isError) });
        },
        renderTableModel: function (model) {
            calls.renders.push(model);
        }
    });

    const result = await service.queueXmlInboxItem({
        sourceSystem: "ExpressPlanning",
        xmlContent: "<a />"
    });

    assert.equal(result.normalizedFileName, "generated.xml");
    assert.equal(calls.queuePayloads.length, 1);
    assert.deepEqual(calls.queuePayloads[0].payload, {
        sourceSystem: "ExpressPlanning",
        xmlContent: "<a />"
    });
    assert.equal(calls.renders.length, 1);
    assert.deepEqual(calls.statuses, [
        { message: "queued:xml-queued", isError: false },
        { message: "Загрузка XML-очереди...", isError: false },
        { message: "loaded:1", isError: false }
    ]);
});

test("imports xml inbox: retryXmlInboxItem retries item and refreshes inbox", async () => {
    const calls = {
        retriedIds: [],
        statuses: []
    };

    const service = xmlInboxModule.createXmlInboxService({
        apiClient: {
            getXmlInbox: async function () {
                return [];
            },
            queueXmlInboxItem: async function () {
                throw new Error("unexpected");
            },
            retryXmlInboxItem: async function (endpoint, itemId) {
                calls.retriedIds.push({ endpoint: endpoint, itemId: itemId });
            }
        },
        xmlInboxEndpoint: "/api/imports/source-data/xml/inbox",
        xmlHelpers: {
            normalizeRows: function (payload) {
                return payload;
            },
            buildQueueRequest: function () {
                throw new Error("unexpected");
            },
            buildLoadSuccessStatus: function () {
                return "loaded:0";
            },
            buildQueueSuccessStatus: function () {
                throw new Error("unexpected");
            },
            buildRetrySuccessStatus: function (itemId) {
                return `retried:${itemId}`;
            }
        },
        tableModels: {
            buildXmlInboxModel: function () {
                return {
                    headers: [],
                    rows: []
                };
            }
        },
        setXmlStatus: function (message, isError) {
            calls.statuses.push({ message: message, isError: Boolean(isError) });
        },
        renderTableModel: function () {}
    });

    await service.retryXmlInboxItem("xml-42");

    assert.deepEqual(calls.retriedIds, [{
        endpoint: "/api/imports/source-data/xml/inbox",
        itemId: "xml-42"
    }]);
    assert.deepEqual(calls.statuses, [
        { message: "retried:xml-42", isError: false },
        { message: "Загрузка XML-очереди...", isError: false },
        { message: "loaded:0", isError: false }
    ]);
});
