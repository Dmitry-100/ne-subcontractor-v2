"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const projectsApiModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/projects-api.js"));

test("projects api: createApiClient validates required options", () => {
    assert.throws(function () {
        projectsApiModule.createApiClient({});
    }, /endpoint/i);

    assert.throws(function () {
        projectsApiModule.createApiClient({
            endpoint: "/api/projects",
            fetchImpl: async function () {}
        });
    }, /parseErrorBody/i);
});

test("projects api: request uses credentials/include and parses json", async () => {
    const calls = [];
    const client = projectsApiModule.createApiClient({
        endpoint: "/api/projects",
        parseErrorBody: function () { return "x"; },
        fetchImpl: async function (url, options) {
            calls.push({ url: url, options: options });
            return {
                ok: true,
                status: 200,
                text: async function () {
                    return "[{\"id\":\"p-1\"}]";
                }
            };
        }
    });

    const projects = await client.getProjects();
    assert.deepEqual(projects, [{ id: "p-1" }]);
    assert.equal(calls[0].url, "/api/projects");
    assert.equal(calls[0].options.credentials, "include");
    assert.equal(calls[0].options.headers.Accept, "application/json");
});

test("projects api: getProjects builds url with encoded search", async () => {
    const urls = [];
    const client = projectsApiModule.createApiClient({
        endpoint: "/api/projects",
        parseErrorBody: function () { return "x"; },
        fetchImpl: async function (url) {
            urls.push(url);
            return {
                ok: true,
                status: 200,
                text: async function () {
                    return "[]";
                }
            };
        }
    });

    await client.getProjects("  Проект 01  ");
    assert.deepEqual(urls, ["/api/projects?search=%D0%9F%D1%80%D0%BE%D0%B5%D0%BA%D1%82%2001"]);
});

test("projects api: getProjects appends paging params when provided", async () => {
    const urls = [];
    const client = projectsApiModule.createApiClient({
        endpoint: "/api/projects",
        parseErrorBody: function () { return "x"; },
        fetchImpl: async function (url) {
            urls.push(url);
            return {
                ok: true,
                status: 200,
                text: async function () {
                    return "{\"items\":[],\"totalCount\":0,\"skip\":0,\"take\":15}";
                }
            };
        }
    });

    await client.getProjects("Alpha", {
        skip: 30,
        take: 15,
        requireTotalCount: true
    });

    assert.deepEqual(urls, ["/api/projects?search=Alpha&skip=30&take=15&requireTotalCount=true"]);
});

test("projects api: mutation endpoints use expected methods and body", async () => {
    const calls = [];
    const client = projectsApiModule.createApiClient({
        endpoint: "/api/projects",
        parseErrorBody: function () { return "x"; },
        fetchImpl: async function (url, options) {
            calls.push({ url: url, options: options });
            return {
                ok: true,
                status: 204,
                text: async function () {
                    return "";
                }
            };
        }
    });

    await client.createProject({ code: "P-1", name: "Проект", gipUserId: null });
    await client.updateProject("p-1", { name: "Проект 2", gipUserId: "u-1" });
    const deleted = await client.deleteProject("p-1");

    assert.equal(deleted, null);
    assert.equal(calls[0].url, "/api/projects");
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[0].options.headers["Content-Type"], "application/json");
    assert.equal(calls[1].url, "/api/projects/p-1");
    assert.equal(calls[1].options.method, "PUT");
    assert.equal(calls[2].url, "/api/projects/p-1");
    assert.equal(calls[2].options.method, "DELETE");
});

test("projects api: request throws parseErrorBody result on non-2xx response", async () => {
    const client = projectsApiModule.createApiClient({
        endpoint: "/api/projects",
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
            await client.getProjects();
        },
        /err:400/);
});
