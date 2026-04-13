"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const modulesResolver = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-bootstrap-modules.js"));

function createModuleSource() {
    const source = {};

    modulesResolver.moduleDescriptors.forEach(function (descriptor) {
        const moduleObject = {};
        descriptor.requiredMembers.forEach(function (memberName) {
            moduleObject[memberName] = function () { };
        });
        source[descriptor.globalName] = moduleObject;
    });

    return source;
}

test("contracts bootstrap modules: resolves all module descriptors", () => {
    const source = createModuleSource();
    const status = {
        textContent: "",
        classList: {
            added: false,
            add: function () {
                this.added = true;
            }
        }
    };

    const modules = modulesResolver.resolveModules({
        source: source,
        statusElement: status,
        setStatusError: function (statusElement, message) {
            statusElement.textContent = message;
            statusElement.classList.add("contracts-status--error");
        }
    });

    assert.ok(modules);
    assert.equal(Object.keys(modules).length, modulesResolver.moduleDescriptors.length);
    assert.equal(status.classList.added, false);
});

test("contracts bootstrap modules: reports first missing module with same diagnostics", () => {
    const source = createModuleSource();
    delete source.ContractsDraftEvents;

    const status = {
        textContent: "",
        classList: {
            added: false,
            add: function () {
                this.added = true;
            }
        }
    };

    const modules = modulesResolver.resolveModules({
        source: source,
        statusElement: status,
        setStatusError: function (statusElement, message) {
            statusElement.textContent = message;
            statusElement.classList.add("contracts-status--error");
        }
    });

    assert.equal(modules, null);
    assert.match(status.textContent, /draft-events/i);
    assert.equal(status.classList.added, true);
});
