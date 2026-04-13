"use strict";

(function () {
    const CONTROL_SELECTORS = {
        searchInput: "[data-registry-search]",
        refreshButton: "[data-registry-refresh]",
        statusElement: "[data-registry-status]",
        tableWrap: "[data-registry-table-wrap]",
        table: "[data-registry-table]",
        rawWrap: "[data-registry-raw-wrap]",
        rawElement: "[data-registry-raw]"
    };

    function resolveControls(root) {
        const controls = {};
        const entries = Object.entries(CONTROL_SELECTORS);
        for (let index = 0; index < entries.length; index += 1) {
            const entry = entries[index];
            const controlKey = entry[0];
            const selector = entry[1];
            controls[controlKey] = root.querySelector(selector);
        }

        return controls;
    }

    function createBootstrapContext(options) {
        const settings = options || {};
        const doc = settings.document || (typeof document !== "undefined" ? document : null);

        if (!doc || typeof doc.querySelector !== "function") {
            throw new Error("Registry bootstrap requires a document with querySelector.");
        }

        const root = doc.querySelector("[data-registry]");
        if (!root) {
            return null;
        }

        const endpoint = root.getAttribute("data-api-endpoint");
        if (!endpoint) {
            return null;
        }

        return {
            endpoint: endpoint,
            controls: resolveControls(root)
        };
    }

    const exportsObject = {
        createBootstrapContext: createBootstrapContext
    };

    if (typeof window !== "undefined") {
        window.RegistryPageBootstrap = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
