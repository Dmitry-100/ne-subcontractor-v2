"use strict";

(function () {
    function requireString(value, name) {
        if (typeof value !== "string" || value.trim().length === 0) {
            throw new Error(`AdminApi requires ${name}.`);
        }
    }

    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`AdminApi requires ${name}.`);
        }
    }

    function createApiClient(options) {
        const settings = options || {};
        const usersEndpoint = settings.usersEndpoint;
        const rolesEndpoint = settings.rolesEndpoint;
        const referenceApiRoot = settings.referenceApiRoot;
        const parseErrorBody = settings.parseErrorBody;
        const fetchImpl = settings.fetchImpl || (typeof fetch === "function" ? fetch.bind(globalThis) : null);

        requireString(usersEndpoint, "usersEndpoint");
        requireString(rolesEndpoint, "rolesEndpoint");
        requireString(referenceApiRoot, "referenceApiRoot");
        requireFunction(parseErrorBody, "parseErrorBody");
        requireFunction(fetchImpl, "fetchImpl");

        async function request(url, optionsValue) {
            const hasBody = optionsValue && typeof optionsValue.body === "string";
            const headers = {
                Accept: "application/json"
            };

            if (hasBody) {
                headers["Content-Type"] = "application/json";
            }

            const response = await fetchImpl(url, {
                credentials: "include",
                ...optionsValue,
                headers
            });

            if (!response.ok) {
                const bodyText = await response.text();
                throw new Error(parseErrorBody(bodyText, response.status));
            }

            if (response.status === 204) {
                return null;
            }

            return response.json();
        }

        function buildUsersUrl(search) {
            const normalizedSearch = String(search ?? "").trim();
            if (!normalizedSearch) {
                return usersEndpoint;
            }

            return `${usersEndpoint}?search=${encodeURIComponent(normalizedSearch)}`;
        }

        function buildReferenceItemsUrl(typeCode, activeOnly) {
            const encodedTypeCode = encodeURIComponent(typeCode);
            const activeOnlyText = activeOnly ? "true" : "false";
            return `${referenceApiRoot}/${encodedTypeCode}/items?activeOnly=${activeOnlyText}`;
        }

        async function getRoles() {
            return request(rolesEndpoint, { method: "GET" });
        }

        async function getUsers(search) {
            return request(buildUsersUrl(search), { method: "GET" });
        }

        async function updateUserRoles(userId, payload) {
            return request(`${usersEndpoint}/${userId}/roles`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });
        }

        async function getReferenceItems(typeCode, activeOnly) {
            return request(buildReferenceItemsUrl(typeCode, activeOnly), { method: "GET" });
        }

        async function upsertReferenceItem(typeCode, payload) {
            return request(`${referenceApiRoot}/${encodeURIComponent(typeCode)}/items`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });
        }

        async function deleteReferenceItem(typeCode, itemCode) {
            return request(
                `${referenceApiRoot}/${encodeURIComponent(typeCode)}/items/${encodeURIComponent(itemCode)}`,
                { method: "DELETE" });
        }

        return {
            getRoles: getRoles,
            getUsers: getUsers,
            updateUserRoles: updateUserRoles,
            getReferenceItems: getReferenceItems,
            upsertReferenceItem: upsertReferenceItem,
            deleteReferenceItem: deleteReferenceItem,
            buildReferenceItemsUrl: buildReferenceItemsUrl
        };
    }

    const exportsObject = {
        createApiClient: createApiClient
    };

    if (typeof window !== "undefined") {
        window.AdminApi = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
