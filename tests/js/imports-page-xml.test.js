"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const xmlModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/imports-page-xml.js"));

function createXmlHelpers() {
    return xmlModule.createXmlHelpers({
        buildDefaultXmlFileName: function () {
            return "default-file.xml";
        }
    });
}

test("imports xml: createXmlHelpers validates dependencies", () => {
    assert.throws(() => xmlModule.createXmlHelpers({}), /отсутствуют обязательные зависимости/);
});

test("imports xml: normalizeRows returns array only", () => {
    const xmlHelpers = createXmlHelpers();
    assert.deepEqual(xmlHelpers.normalizeRows([{ id: 1 }]), [{ id: 1 }]);
    assert.deepEqual(xmlHelpers.normalizeRows(null), []);
});

test("imports xml: buildQueueRequest validates xml and normalizes defaults", () => {
    const xmlHelpers = createXmlHelpers();

    assert.throws(() => xmlHelpers.buildQueueRequest({
        sourceSystem: "s",
        externalDocumentId: "e",
        fileName: "f.xml",
        xmlContent: " "
    }), /XML-содержимое обязательно/);

    const request = xmlHelpers.buildQueueRequest({
        sourceSystem: "  ",
        externalDocumentId: "  ",
        fileName: "  ",
        xmlContent: " <root /> "
    });

    assert.equal(request.normalizedFileName, "default-file.xml");
    assert.deepEqual(request.payload, {
        sourceSystem: "ExpressPlanning",
        externalDocumentId: null,
        fileName: "default-file.xml",
        xmlContent: "<root />"
    });
});

test("imports xml: queue request preserves explicit values", () => {
    const xmlHelpers = createXmlHelpers();
    const request = xmlHelpers.buildQueueRequest({
        sourceSystem: "ExtSystem",
        externalDocumentId: "DOC-42",
        fileName: "inbox.xml",
        xmlContent: "<a/>"
    });

    assert.equal(request.normalizedFileName, "inbox.xml");
    assert.deepEqual(request.payload, {
        sourceSystem: "ExtSystem",
        externalDocumentId: "DOC-42",
        fileName: "inbox.xml",
        xmlContent: "<a/>"
    });
});

test("imports xml: status messages are deterministic", () => {
    const xmlHelpers = createXmlHelpers();

    assert.equal(xmlHelpers.buildLoadSuccessStatus(5), "Загружено элементов XML: 5.");
    assert.equal(
        xmlHelpers.buildQueueSuccessStatus({ id: "xml-1", status: "Received" }),
        "XML поставлен в очередь: xml-1. Статус: Received.");
    assert.equal(
        xmlHelpers.buildRetrySuccessStatus("xml-2"),
        "XML xml-2 перемещён в очередь повторной обработки.");
});
