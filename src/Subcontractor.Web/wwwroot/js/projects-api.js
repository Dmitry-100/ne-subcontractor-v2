"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ProjectsApi requires ${name}.`);
        }
    }

    function requireString(value, name) {
        if (typeof value !== "string" || value.trim().length === 0) {
            throw new Error(`ProjectsApi requires ${name}.`);
        }
    }

    async function readResponseBody(response) {
        if (!response || typeof response.text !== "function") {
            return "";
        }

        return response.text();
    }

    function toInteger(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) {
            return null;
        }

        return Math.trunc(number);
    }

    function createApiClient(options) {
        const settings = options || {};
        const endpoint = settings.endpoint;
        const sourceDataEndpoint = settings.sourceDataEndpoint || `${endpoint}/source-data/latest`;
        const proceduresFromSourceDataEndpoint = settings.proceduresFromSourceDataEndpoint || "/api/procedures/from-source-data";
        const filesEndpoint = settings.filesEndpoint || "/api/files";
        const parseErrorBody = settings.parseErrorBody;
        const fetchImpl = settings.fetchImpl || (typeof fetch === "function" ? fetch.bind(globalThis) : null);

        requireString(endpoint, "endpoint");
        requireFunction(parseErrorBody, "parseErrorBody");
        requireFunction(fetchImpl, "fetchImpl");

        async function request(url, requestOptions) {
            const hasBody = requestOptions && typeof requestOptions.body === "string";
            const headers = {
                Accept: "application/json"
            };

            if (hasBody) {
                headers["Content-Type"] = "application/json";
            }

            const response = await fetchImpl(url, {
                credentials: "include",
                ...requestOptions,
                headers: headers
            });

            if (!response.ok) {
                const bodyText = await readResponseBody(response);
                throw new Error(parseErrorBody(bodyText, response.status));
            }

            if (response.status === 204) {
                return null;
            }

            const bodyText = await readResponseBody(response);
            if (bodyText.length > 0) {
                return JSON.parse(bodyText);
            }

            if (typeof response.json === "function") {
                return response.json();
            }

            return null;
        }

        function buildProjectsUrl(baseEndpoint, search, paging) {
            const searchText = String(search ?? "").trim();
            const queryParts = [];

            if (searchText) {
                queryParts.push(`search=${encodeURIComponent(searchText)}`);
            }

            const pagingSettings = paging && typeof paging === "object" ? paging : null;
            if (pagingSettings) {
                const skip = toInteger(pagingSettings.skip);
                const take = toInteger(pagingSettings.take);

                if (skip !== null && skip >= 0) {
                    queryParts.push(`skip=${encodeURIComponent(String(skip))}`);
                }

                if (take !== null && take > 0) {
                    queryParts.push(`take=${encodeURIComponent(String(take))}`);
                }

                if (pagingSettings.requireTotalCount) {
                    queryParts.push("requireTotalCount=true");
                }
            }

            if (queryParts.length === 0) {
                return baseEndpoint;
            }

            return `${baseEndpoint}?${queryParts.join("&")}`;
        }

        return {
            getProjects: function (search, paging) {
                return request(buildProjectsUrl(endpoint, search, paging), { method: "GET" });
            },
            getLatestSourceDataRows: function (search, paging) {
                return request(buildProjectsUrl(sourceDataEndpoint, search, paging), { method: "GET" });
            },
            uploadTechnicalAssignment: async function (file) {
                const form = new FormData();
                form.append("file", file);
                return request(filesEndpoint, {
                    method: "POST",
                    body: form
                });
            },
            createProcedureFromSourceData: function (payload) {
                return request(proceduresFromSourceDataEndpoint, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
            },
            createProject: function (payload) {
                return request(endpoint, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
            },
            updateProject: function (projectId, payload) {
                return request(`${endpoint}/${projectId}`, {
                    method: "PUT",
                    body: JSON.stringify(payload)
                });
            },
            deleteProject: function (projectId) {
                return request(`${endpoint}/${projectId}`, {
                    method: "DELETE"
                });
            }
        };
    }

    const exportsObject = {
        createApiClient: createApiClient
    };

    if (typeof window !== "undefined") {
        window.ProjectsApi = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
