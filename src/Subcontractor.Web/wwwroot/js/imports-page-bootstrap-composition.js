"use strict";

(function () {
    function createBootstrapContextCore(options) {
        const settings = options || {};
        const hostDocument = settings.hostDocument || null;
        const hostWindow = settings.hostWindow || null;
        const logError = typeof settings.logError === "function" ? settings.logError : function () {};
        const resolveControls = settings.resolveControls;
        const resolveModuleRoots = settings.resolveModuleRoots;
        const controlSelectors = settings.controlSelectors;
        const moduleRequirements = settings.moduleRequirements;

        if (typeof resolveControls !== "function" || typeof resolveModuleRoots !== "function") {
            throw new Error("createBootstrapContextCore: resolveControls/resolveModuleRoots are required.");
        }

        const moduleRoot = hostDocument.querySelector("[data-imports-module]");
        if (!moduleRoot) {
            return null;
        }

        const endpoint = moduleRoot.getAttribute("data-batches-api-endpoint") || "/api/imports/source-data/batches";
        const queuedEndpoint = `${endpoint}/queued`;
        const xmlInboxEndpoint = moduleRoot.getAttribute("data-xml-inbox-api-endpoint") || "/api/imports/source-data/xml/inbox";
        const lotRecommendationsEndpoint =
            moduleRoot.getAttribute("data-lot-recommendations-api-endpoint") || "/api/lots/recommendations/import-batches";

        const controls = resolveControls(moduleRoot, controlSelectors);
        if (!controls) {
            return null;
        }

        const moduleRoots = resolveModuleRoots(hostWindow, moduleRequirements, logError);
        if (!moduleRoots) {
            return null;
        }

        return {
            endpoint: endpoint,
            queuedEndpoint: queuedEndpoint,
            xmlInboxEndpoint: xmlInboxEndpoint,
            lotRecommendationsEndpoint: lotRecommendationsEndpoint,
            controls: controls,
            moduleRoots: moduleRoots
        };
    }

    const exportsObject = {
        createBootstrapContextCore: createBootstrapContextCore
    };

    if (typeof window !== "undefined") {
        window.ImportsPageBootstrapComposition = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
