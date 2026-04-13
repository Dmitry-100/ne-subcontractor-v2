"use strict";

(function () {
    function createHelpers(options) {
        const settings = options || {};
        const statusCaptions = settings.statusCaptions || {};
        const contractorStatusCaptions = settings.contractorStatusCaptions || {};
        const reliabilityClassCaptions = settings.reliabilityClassCaptions || {};

        function localizeStatus(status) {
            return statusCaptions[String(status || "")] || String(status || "");
        }

        function localizeContractorStatus(status) {
            return contractorStatusCaptions[String(status || "")] || String(status || "");
        }

        function localizeReliabilityClass(value) {
            return reliabilityClassCaptions[String(value || "")] || String(value || "");
        }

        function localizeBoolean(value) {
            return value ? "Да" : "Нет";
        }

        return {
            localizeBoolean: localizeBoolean,
            localizeContractorStatus: localizeContractorStatus,
            localizeReliabilityClass: localizeReliabilityClass,
            localizeStatus: localizeStatus
        };
    }

    const exportsObject = {
        createHelpers: createHelpers
    };

    if (typeof window !== "undefined") {
        window.ProceduresGridLocalizationHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
