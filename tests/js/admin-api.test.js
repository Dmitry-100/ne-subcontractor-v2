"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const adminApiModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/admin-api.js"));

test("admin api: createApiClient validates required options", () => {
    assert.throws(function () {
        adminApiModule.createApiClient({});
    }, /usersEndpoint/i);

    assert.throws(function () {
        adminApiModule.createApiClient({
            usersEndpoint: "/api/admin/users",
            rolesEndpoint: "/api/admin/roles",
            referenceApiRoot: "/api/reference-data",
            fetchImpl: async function () {}
        });
    }, /parseErrorBody/i);
});

test("admin api: request uses credentials/include and parses json", async () => {
    const calls = [];
    const client = adminApiModule.createApiClient({
        usersEndpoint: "/api/admin/users",
        rolesEndpoint: "/api/admin/roles",
        referenceApiRoot: "/api/reference-data",
        parseErrorBody: function () { return "x"; },
        fetchImpl: async function (url, options) {
            calls.push({ url: url, options: options });
            return {
                ok: true,
                status: 200,
                json: async function () {
                    return [{ id: "r1" }];
                }
            };
        }
    });

    const roles = await client.getRoles();
    assert.deepEqual(roles, [{ id: "r1" }]);
    assert.equal(calls[0].url, "/api/admin/roles");
    assert.equal(calls[0].options.credentials, "include");
    assert.equal(calls[0].options.headers.Accept, "application/json");
});

test("admin api: getUsers and getReferenceItems build urls", async () => {
    const urls = [];
    const client = adminApiModule.createApiClient({
        usersEndpoint: "/api/admin/users",
        rolesEndpoint: "/api/admin/roles",
        referenceApiRoot: "/api/reference-data",
        parseErrorBody: function () { return "x"; },
        fetchImpl: async function (url) {
            urls.push(url);
            return {
                ok: true,
                status: 200,
                json: async function () {
                    return [];
                }
            };
        }
    });

    await client.getUsers(" Иван Иванов ");
    await client.getReferenceItems("PURCHASE TYPE", false);
    await client.getReferenceItems("PURCHASE TYPE", true);

    assert.deepEqual(urls, [
        "/api/admin/users?search=%D0%98%D0%B2%D0%B0%D0%BD%20%D0%98%D0%B2%D0%B0%D0%BD%D0%BE%D0%B2",
        "/api/reference-data/PURCHASE%20TYPE/items?activeOnly=false",
        "/api/reference-data/PURCHASE%20TYPE/items?activeOnly=true"
    ]);
});

test("admin api: mutation endpoints use expected methods and body", async () => {
    const calls = [];
    const client = adminApiModule.createApiClient({
        usersEndpoint: "/api/admin/users",
        rolesEndpoint: "/api/admin/roles",
        referenceApiRoot: "/api/reference-data",
        parseErrorBody: function () { return "x"; },
        fetchImpl: async function (url, options) {
            calls.push({ url: url, options: options });
            return {
                ok: true,
                status: 204,
                json: async function () {
                    return {};
                }
            };
        }
    });

    await client.updateUserRoles("u-1", { roleNames: ["Admin"], isActive: true });
    await client.upsertReferenceItem("PURCHASE_TYPE", { itemCode: "A", displayName: "A", sortOrder: 0, isActive: true });
    const deleted = await client.deleteReferenceItem("PURCHASE_TYPE", "ITEM_1");

    assert.equal(deleted, null);
    assert.equal(calls[0].url, "/api/admin/users/u-1/roles");
    assert.equal(calls[0].options.method, "PUT");
    assert.equal(calls[0].options.headers["Content-Type"], "application/json");
    assert.equal(calls[1].url, "/api/reference-data/PURCHASE_TYPE/items");
    assert.equal(calls[2].url, "/api/reference-data/PURCHASE_TYPE/items/ITEM_1");
    assert.equal(calls[2].options.method, "DELETE");
});

test("admin api: request throws parseErrorBody result on non-2xx response", async () => {
    const client = adminApiModule.createApiClient({
        usersEndpoint: "/api/admin/users",
        rolesEndpoint: "/api/admin/roles",
        referenceApiRoot: "/api/reference-data",
        parseErrorBody: function (bodyText, statusCode) {
            return `err:${statusCode}:${bodyText}`;
        },
        fetchImpl: async function () {
            return {
                ok: false,
                status: 400,
                text: async function () {
                    return "{\"detail\":\"bad request\"}";
                }
            };
        }
    });

    await assert.rejects(
        async function () {
            await client.getRoles();
        },
        /err:400/);
});
