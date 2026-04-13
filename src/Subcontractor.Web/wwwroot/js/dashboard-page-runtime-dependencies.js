"use strict";

(function () {
    function requireObject(value, name) {
        if (!value || typeof value !== "object") {
            throw new Error(`Dashboard runtime requires ${name}.`);
        }
    }

    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`Dashboard runtime requires ${name}.`);
        }
    }

    function setStatusError(statusElement, message) {
        if (!statusElement) {
            return;
        }

        statusElement.textContent = message;
        if (statusElement.classList && typeof statusElement.classList.add === "function") {
            statusElement.classList.add("dashboard-status--error");
        }
    }

    function resolveModule(globalName, requirePath, requiredMembers) {
        let moduleObject = null;

        if (typeof window !== "undefined" && window[globalName]) {
            moduleObject = window[globalName];
        } else if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            moduleObject = require(requirePath);
        }

        if (!moduleObject || typeof moduleObject !== "object") {
            throw new Error(`Не удалось загрузить модуль dashboard runtime: ${globalName}.`);
        }

        const members = Array.isArray(requiredMembers) ? requiredMembers : [];
        const missing = members.filter(function (name) {
            return typeof moduleObject[name] !== "function";
        });

        if (missing.length > 0) {
            throw new Error(`Модуль ${globalName} не содержит обязательные методы: ${missing.join(", ")}.`);
        }

        return moduleObject;
    }

    function createJsonRequester(fetchImpl, parseErrorBody) {
        requireFunction(fetchImpl, "fetch implementation");
        requireFunction(parseErrorBody, "parseErrorBody");

        return async function (url, requestOptions) {
            const response = await fetchImpl(url, {
                credentials: "include",
                ...requestOptions,
                headers: {
                    Accept: "application/json"
                }
            });

            if (!response.ok) {
                const bodyText = await response.text();
                throw new Error(parseErrorBody(bodyText, response.status));
            }

            return response.json();
        };
    }

    const exportsObject = {
        createJsonRequester: createJsonRequester,
        requireObject: requireObject,
        requireFunction: requireFunction,
        resolveModule: resolveModule,
        setStatusError: setStatusError
    };

    if (typeof window !== "undefined") {
        window.DashboardPageRuntimeDependencies = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
