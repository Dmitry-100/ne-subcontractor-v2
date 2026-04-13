"use strict";

(function () {
    function isNodeLike(value) {
        return Boolean(value) && typeof value === "object";
    }

    function supportsDisabledProperty(value) {
        return isNodeLike(value) && typeof value.disabled !== "undefined";
    }

    function supportsValueProperty(value) {
        return isNodeLike(value) && typeof value.value !== "undefined";
    }

    function supportsTransitionSelect(value) {
        return isNodeLike(value) &&
            typeof value.innerHTML !== "undefined" &&
            typeof value.appendChild === "function" &&
            isNodeLike(value.options);
    }

    function createWorkflowUiService(options) {
        const settings = options || {};
        const workflow = settings.workflow || null;
        const localizeImportStatus = settings.localizeImportStatus;
        const setTransitionStatus = settings.setTransitionStatus;
        const refreshLotActions = settings.refreshLotActions || function () {};
        const transitionTargetSelect = settings.transitionTargetSelect || null;
        const transitionReasonInput = settings.transitionReasonInput || null;
        const transitionApplyButton = settings.transitionApplyButton || null;
        const historyRefreshButton = settings.historyRefreshButton || null;
        const downloadInvalidReportButton = settings.downloadInvalidReportButton || null;
        const downloadFullReportButton = settings.downloadFullReportButton || null;
        const downloadLotReconciliationReportButton = settings.downloadLotReconciliationReportButton || null;
        const lotBuildButton = settings.lotBuildButton || null;
        const lotApplyButton = settings.lotApplyButton || null;
        const applyControlsState = settings.applyControlsState || null;
        const renderTransitionTargetsView = settings.renderTransitionTargetsView || null;
        const createOptionElement = settings.createOptionElement || null;

        if (!workflow || typeof workflow.buildTransitionStatus !== "function") {
            throw new Error("createWorkflowUiService: workflow.buildTransitionStatus is required.");
        }

        if (typeof localizeImportStatus !== "function") {
            throw new Error("createWorkflowUiService: localizeImportStatus is required.");
        }

        if (typeof setTransitionStatus !== "function") {
            throw new Error("createWorkflowUiService: setTransitionStatus is required.");
        }

        if (typeof applyControlsState !== "function") {
            if (!supportsDisabledProperty(downloadInvalidReportButton) ||
                !supportsDisabledProperty(downloadFullReportButton) ||
                !supportsDisabledProperty(downloadLotReconciliationReportButton) ||
                !supportsDisabledProperty(historyRefreshButton) ||
                !supportsTransitionSelect(transitionTargetSelect) ||
                !supportsValueProperty(transitionReasonInput) ||
                !supportsDisabledProperty(transitionApplyButton) ||
                !supportsDisabledProperty(lotBuildButton) ||
                !supportsDisabledProperty(lotApplyButton)) {
                throw new Error("createWorkflowUiService: controls are required when custom applyControlsState is not provided.");
            }
        }

        if (typeof renderTransitionTargetsView !== "function") {
            if (!supportsTransitionSelect(transitionTargetSelect) || !supportsDisabledProperty(transitionApplyButton)) {
                throw new Error("createWorkflowUiService: transition controls are required when custom renderTransitionTargetsView is not provided.");
            }

            if (typeof createOptionElement !== "function" && typeof document === "undefined") {
                throw new Error("createWorkflowUiService: document or createOptionElement is required for default rendering.");
            }
        }

        function resolveTargetCount() {
            if (!supportsTransitionSelect(transitionTargetSelect) || !Array.isArray(transitionTargetSelect.options)) {
                return 0;
            }

            return transitionTargetSelect.options.length;
        }

        function applyControlsDefault(enabled) {
            const state = Boolean(enabled);
            downloadInvalidReportButton.disabled = !state;
            downloadFullReportButton.disabled = !state;
            downloadLotReconciliationReportButton.disabled = !state;
            historyRefreshButton.disabled = !state;
            transitionTargetSelect.disabled = !state;
            transitionReasonInput.disabled = !state;

            if (!state) {
                transitionTargetSelect.innerHTML = "";
                transitionReasonInput.value = "";
                transitionApplyButton.disabled = true;
                lotBuildButton.disabled = true;
                lotApplyButton.disabled = true;
                return;
            }

            transitionApplyButton.disabled = resolveTargetCount() === 0;
        }

        function setWorkflowActionsEnabled(enabled) {
            if (typeof applyControlsState === "function") {
                applyControlsState(Boolean(enabled), resolveTargetCount());
            } else {
                applyControlsDefault(enabled);
            }

            if (enabled) {
                refreshLotActions();
            }
        }

        function renderTransitionTargetsDefault(model) {
            transitionTargetSelect.innerHTML = "";
            model.targets.forEach(function (target) {
                const option = typeof createOptionElement === "function"
                    ? createOptionElement()
                    : document.createElement("option");
                option.value = target.value;
                option.textContent = target.label;
                transitionTargetSelect.appendChild(option);
            });

            transitionApplyButton.disabled = model.targets.length === 0;
        }

        function renderTransitionTargets(currentStatus) {
            const transitionState = workflow.buildTransitionStatus(currentStatus);
            const model = {
                targets: transitionState.targets.map(function (status) {
                    return {
                        value: status,
                        label: localizeImportStatus(status)
                    };
                }),
                message: transitionState.message,
                isError: Boolean(transitionState.isError)
            };

            if (typeof renderTransitionTargetsView === "function") {
                renderTransitionTargetsView(model);
            } else {
                renderTransitionTargetsDefault(model);
            }

            setTransitionStatus(model.message, model.isError);
            return model;
        }

        return {
            setWorkflowActionsEnabled: setWorkflowActionsEnabled,
            renderTransitionTargets: renderTransitionTargets
        };
    }

    const exportsObject = {
        createWorkflowUiService: createWorkflowUiService
    };

    if (typeof window !== "undefined") {
        window.ImportsPageWorkflowUi = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
