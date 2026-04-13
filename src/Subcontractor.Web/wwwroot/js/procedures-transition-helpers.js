"use strict";

(function () {
    function isNodeLike(value) {
        return Boolean(value) && typeof value === "object";
    }

    function isEventTarget(value) {
        return isNodeLike(value) && typeof value.addEventListener === "function";
    }

    function supportsDisabled(value) {
        return isNodeLike(value) && typeof value.disabled !== "undefined";
    }

    function supportsValue(value) {
        return isNodeLike(value) && typeof value.value !== "undefined";
    }

    function hasOptionsCollection(value) {
        return isNodeLike(value) &&
            isNodeLike(value.options) &&
            typeof value.options.length !== "undefined";
    }

    function clearTargetOptions(targetSelect) {
        targetSelect.innerHTML = "";

        if (Array.isArray(targetSelect.options)) {
            targetSelect.options.length = 0;
        }
    }

    function validateControls(controls) {
        const settings = controls || {};
        const targetSelect = settings.targetSelect || null;
        const reasonInput = settings.reasonInput || null;
        const applyButton = settings.applyButton || null;
        const historyRefreshButton = settings.historyRefreshButton || null;
        const historyGrid = settings.historyGrid || null;

        if (!isNodeLike(targetSelect) ||
            typeof targetSelect.innerHTML === "undefined" ||
            !hasOptionsCollection(targetSelect) ||
            typeof targetSelect.appendChild !== "function" ||
            !supportsDisabled(targetSelect) ||
            !supportsValue(targetSelect) ||
            !supportsValue(reasonInput) ||
            !isEventTarget(applyButton) ||
            !supportsDisabled(applyButton) ||
            !isEventTarget(historyRefreshButton) ||
            !supportsDisabled(historyRefreshButton) ||
            !historyGrid ||
            typeof historyGrid.option !== "function") {
            throw new Error("createTransitionController: required controls are missing.");
        }
    }

    function validateDependencies(dependencies) {
        const settings = dependencies || {};
        const endpoint = settings.endpoint || "";
        const apiClient = settings.apiClient || null;
        const transitionMap = settings.transitionMap || null;
        const localizeStatus = settings.localizeStatus || null;
        const validateTransitionRequest = settings.validateTransitionRequest || null;
        const buildTransitionSuccessMessage = settings.buildTransitionSuccessMessage || null;
        const getSelectedProcedure = settings.getSelectedProcedure || null;
        const setTransitionStatus = settings.setTransitionStatus || null;
        const refreshGridAndReselect = settings.refreshGridAndReselect || null;
        const createOption = settings.createOption || null;

        if (!endpoint ||
            !apiClient ||
            typeof apiClient.getProcedureHistory !== "function" ||
            typeof apiClient.transitionProcedure !== "function") {
            throw new Error("createTransitionController: api dependencies are invalid.");
        }

        if (!transitionMap ||
            typeof localizeStatus !== "function" ||
            typeof validateTransitionRequest !== "function" ||
            typeof buildTransitionSuccessMessage !== "function" ||
            typeof getSelectedProcedure !== "function" ||
            typeof setTransitionStatus !== "function" ||
            typeof refreshGridAndReselect !== "function" ||
            typeof createOption !== "function") {
            throw new Error("createTransitionController: callbacks are required.");
        }
    }

    function renderTargets(settings, procedure) {
        const targetSelect = settings.targetSelect;
        const applyButton = settings.applyButton;
        const historyRefreshButton = settings.historyRefreshButton;
        const transitionMap = settings.transitionMap;
        const localizeStatus = settings.localizeStatus;
        const createOption = settings.createOption;

        clearTargetOptions(targetSelect);

        if (!procedure) {
            targetSelect.disabled = true;
            applyButton.disabled = true;
            historyRefreshButton.disabled = true;
            return;
        }

        const targets = transitionMap[procedure.status] || [];
        if (!Array.isArray(targets) || targets.length === 0) {
            targetSelect.disabled = true;
            applyButton.disabled = true;
        } else {
            for (let index = 0; index < targets.length; index += 1) {
                const targetStatus = targets[index];
                const option = createOption(targetStatus, localizeStatus(targetStatus));
                targetSelect.appendChild(option);
            }

            targetSelect.value = String(targets[0] || "");
            targetSelect.disabled = false;
            applyButton.disabled = false;
        }

        historyRefreshButton.disabled = false;
    }

    const exportsObject = {
        renderTargets: renderTargets,
        validateControls: validateControls,
        validateDependencies: validateDependencies
    };

    if (typeof window !== "undefined") {
        window.ProceduresTransitionHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
