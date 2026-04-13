"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const contractsApiModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/contracts-api.js"));

test("contracts api: createClient validates endpoint", () => {
    assert.throws(function () {
        contractsApiModule.createClient({});
    }, /endpoint/i);
});

test("contracts api: listContracts builds query with paging filters", async () => {
    const calls = [];
    const client = contractsApiModule.createClient({
        endpoint: "/api/contracts",
        parseErrorBody: function () { return "x"; },
        fetchImpl: async function (url, options) {
            calls.push({ url: url, options: options });
            return {
                ok: true,
                status: 200,
                json: async function () {
                    return { items: [], totalCount: 0, skip: 0, take: 15 };
                }
            };
        }
    });

    await client.listContracts({
        search: "Контракт 01",
        status: "Active",
        skip: 30,
        take: 15,
        requireTotalCount: true
    });

    assert.equal(
        calls[0].url,
        "/api/contracts?search=%D0%9A%D0%BE%D0%BD%D1%82%D1%80%D0%B0%D0%BA%D1%82%2001&status=Active&skip=30&take=15&requireTotalCount=true");
    assert.equal(calls[0].options.method, "GET");
    assert.equal(calls[0].options.credentials, "include");
});

test("contracts api: mutation endpoints call expected urls", async () => {
    const calls = [];
    const client = contractsApiModule.createClient({
        endpoint: "/api/contracts",
        parseErrorBody: function () { return "x"; },
        fetchImpl: async function (url, options) {
            calls.push({ url: url, options: options });
            return {
                ok: true,
                status: 204,
                json: async function () { return null; }
            };
        }
    });

    await client.deleteContract("ctr-1");
    await client.transitionContract("ctr-1", { targetStatus: "OnApproval" });

    assert.equal(calls[0].url, "/api/contracts/ctr-1");
    assert.equal(calls[0].options.method, "DELETE");
    assert.equal(calls[1].url, "/api/contracts/ctr-1/transition");
    assert.equal(calls[1].options.method, "POST");
});
