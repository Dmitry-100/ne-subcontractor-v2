"use strict";

(function () {
    const REQUIRED_MODULE_ROOT_NAMES = [
        "proceduresConfigRoot",
        "proceduresServicesRoot",
        "proceduresGridHelpersRoot",
        "proceduresApiRoot",
        "proceduresWorkflowRoot",
        "proceduresGridColumnsRoot",
        "proceduresGridsRoot",
        "proceduresStoreRoot",
        "proceduresRegistryEventsRoot",
        "proceduresDataRoot",
        "proceduresShortlistRoot",
        "proceduresSelectionRoot",
        "proceduresTransitionRoot"
    ];

    function ensureWindowDependencies(hostWindow) {
        if (!hostWindow || !hostWindow.jQuery || !hostWindow.DevExpress || !hostWindow.DevExpress.data) {
            throw new Error("initializeProceduresGrid: window dependencies are missing.");
        }
    }

    function resolveRuntimeOptions(options) {
        const settings = options || {};
        const hostWindow = settings.window || null;
        const endpoint = settings.endpoint || "/api/procedures";
        const controls = settings.controls || {};
        const moduleRoots = settings.moduleRoots || {};

        ensureWindowDependencies(hostWindow);

        const resolvedModuleRoots = {};
        for (let index = 0; index < REQUIRED_MODULE_ROOT_NAMES.length; index += 1) {
            const name = REQUIRED_MODULE_ROOT_NAMES[index];
            resolvedModuleRoots[name] = moduleRoots[name] || null;
        }

        const hasMissingModuleRoot = REQUIRED_MODULE_ROOT_NAMES.some(function (name) {
            return !resolvedModuleRoots[name];
        });

        if (hasMissingModuleRoot) {
            throw new Error("initializeProceduresGrid: module roots are incomplete.");
        }

        return {
            hostWindow: hostWindow,
            endpoint: endpoint,
            controls: controls,
            moduleRoots: resolvedModuleRoots
        };
    }

    function createStatusSetter(element, errorClassName) {
        return function (message, isError) {
            if (!element) {
                return;
            }

            element.textContent = message;
            if (element.classList && typeof element.classList.toggle === "function") {
                element.classList.toggle(errorClassName, Boolean(isError));
            }
        };
    }

    function createUiState(options) {
        const settings = options || {};
        const hostWindow = settings.hostWindow || null;
        const controls = settings.controls || {};
        const gridHelpers = settings.gridHelpers || null;
        const urlFilterState = settings.urlFilterState || null;

        if (!hostWindow || !hostWindow.location || typeof hostWindow.location.assign !== "function") {
            throw new Error("createUiState: hostWindow location is required.");
        }

        if (!gridHelpers ||
            typeof gridHelpers.appendFilterHint !== "function" ||
            typeof gridHelpers.buildUrlWithoutFilters !== "function") {
            throw new Error("createUiState: gridHelpers contract is invalid.");
        }

        if (!urlFilterState || typeof urlFilterState !== "object") {
            throw new Error("createUiState: urlFilterState is required.");
        }

        return {
            appendFilterHint: function (message) {
                return gridHelpers.appendFilterHint(message, urlFilterState);
            },
            clearUrlFilters: function () {
                hostWindow.location.assign(gridHelpers.buildUrlWithoutFilters(hostWindow.location.href));
            },
            setStatus: createStatusSetter(controls.statusElement, "procedures-status--error"),
            setTransitionStatus: createStatusSetter(controls.transitionStatusElement, "procedures-transition-status--error"),
            setShortlistStatus: createStatusSetter(controls.shortlistStatusElement, "procedures-shortlist-status--error"),
            setShortlistAdjustmentsStatus: createStatusSetter(controls.shortlistAdjustmentsStatusElement, "procedures-shortlist-status--error")
        };
    }

    const exportsObject = {
        resolveRuntimeOptions: resolveRuntimeOptions,
        createUiState: createUiState
    };

    if (typeof window !== "undefined") {
        window.ProceduresGridRuntimeFoundation = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
