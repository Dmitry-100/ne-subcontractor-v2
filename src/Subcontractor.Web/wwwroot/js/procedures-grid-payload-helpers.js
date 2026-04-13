"use strict";

(function () {
    function resolveModule(globalName, requirePath, requiredMembers) {
        let moduleObject = null;

        if (typeof window !== "undefined" && window[globalName]) {
            moduleObject = window[globalName];
        } else if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            moduleObject = require(requirePath);
        }

        if (!moduleObject || typeof moduleObject !== "object") {
            throw new Error(`Не удалось загрузить модуль payload helpers: ${globalName}.`);
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

    const normalizationModule = resolveModule(
        "ProceduresGridPayloadNormalization",
        "./procedures-grid-payload-normalization.js",
        ["createHelpers"]);

    function createHelpers(options) {
        const settings = options || {};
        const normalizationHelpers = normalizationModule.createHelpers({
            approvalModes: settings.approvalModes
        });

        function supportsShortlistWorkspace(procedure) {
            return Boolean(procedure) && procedure.status !== "Canceled" && procedure.status !== "Completed";
        }

        function normalizeMaxIncluded(value) {
            const parsed = Number.parseInt(String(value || ""), 10);
            if (!Number.isFinite(parsed)) {
                return 5;
            }

            return Math.min(30, Math.max(1, parsed));
        }

        function normalizeAdjustmentReason(value) {
            const text = String(value ?? "").trim();
            return text.length > 0 ? text : null;
        }

        return Object.assign({}, normalizationHelpers, {
            normalizeAdjustmentReason: normalizeAdjustmentReason,
            normalizeMaxIncluded: normalizeMaxIncluded,
            supportsShortlistWorkspace: supportsShortlistWorkspace
        });
    }

    const exportsObject = {
        createHelpers: createHelpers
    };

    if (typeof window !== "undefined") {
        window.ProceduresGridPayloadHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
