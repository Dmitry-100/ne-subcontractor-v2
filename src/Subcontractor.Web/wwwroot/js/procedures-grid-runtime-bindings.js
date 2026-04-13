"use strict";

(function () {
    function requireObject(value, name) {
        if (!value || typeof value !== "object") {
            throw new Error(`Procedures grid runtime bindings require ${name}.`);
        }
    }

    function createCompositionContext(options) {
        const settings = options || {};
        const controls = settings.controls;
        const moduleRoots = settings.moduleRoots;
        const proceduresConfig = settings.proceduresConfig;

        requireObject(controls, "controls");
        requireObject(moduleRoots, "moduleRoots");
        requireObject(proceduresConfig, "proceduresConfig");

        return {
            proceduresServicesRoot: moduleRoots.proceduresServicesRoot,
            proceduresGridsRoot: moduleRoots.proceduresGridsRoot,
            proceduresStoreRoot: moduleRoots.proceduresStoreRoot,
            proceduresRegistryEventsRoot: moduleRoots.proceduresRegistryEventsRoot,
            proceduresShortlistRoot: moduleRoots.proceduresShortlistRoot,
            proceduresSelectionRoot: moduleRoots.proceduresSelectionRoot,
            proceduresTransitionRoot: moduleRoots.proceduresTransitionRoot,
            gridElement: controls.gridElement,
            historyGridElement: controls.historyGridElement,
            selectedElement: controls.selectedElement,
            targetSelect: controls.targetSelect,
            reasonInput: controls.reasonInput,
            applyButton: controls.applyButton,
            historyRefreshButton: controls.historyRefreshButton,
            shortlistSelectedElement: controls.shortlistSelectedElement,
            shortlistMaxIncludedInput: controls.shortlistMaxIncludedInput,
            shortlistAdjustmentReasonInput: controls.shortlistAdjustmentReasonInput,
            shortlistBuildButton: controls.shortlistBuildButton,
            shortlistApplyButton: controls.shortlistApplyButton,
            shortlistAdjustmentsRefreshButton: controls.shortlistAdjustmentsRefreshButton,
            shortlistGridElement: controls.shortlistGridElement,
            shortlistAdjustmentsGridElement: controls.shortlistAdjustmentsGridElement,
            transitionMap: proceduresConfig.transitionMap
        };
    }

    const exportsObject = {
        createCompositionContext: createCompositionContext
    };

    if (typeof window !== "undefined") {
        window.ProceduresGridRuntimeBindings = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
