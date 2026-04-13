"use strict";

(function () {
    function isNodeLike(value) {
        return Boolean(value) && typeof value === "object";
    }

    function supportsTextContent(value) {
        return isNodeLike(value) && typeof value.textContent !== "undefined";
    }

    function createSelectionController(options) {
        const settings = options || {};

        const selectedElement = settings.selectedElement || null;
        const shortlistSelectedElement = settings.shortlistSelectedElement || null;
        const buildProcedureSelectionSummary = settings.buildProcedureSelectionSummary || null;
        const buildShortlistSelectionSummary = settings.buildShortlistSelectionSummary || null;
        const setTransitionStatus = settings.setTransitionStatus || null;
        const onHistoryResetFailed = settings.onHistoryResetFailed || null;

        if (!supportsTextContent(selectedElement) ||
            !supportsTextContent(shortlistSelectedElement) ||
            typeof buildProcedureSelectionSummary !== "function" ||
            typeof buildShortlistSelectionSummary !== "function" ||
            typeof setTransitionStatus !== "function") {
            throw new Error("createSelectionController: required dependencies are missing.");
        }

        if (onHistoryResetFailed && typeof onHistoryResetFailed !== "function") {
            throw new Error("createSelectionController: onHistoryResetFailed must be a function.");
        }

        let selectedProcedure = null;
        let transitionController = null;
        let shortlistWorkspace = null;

        function setTransitionController(controller) {
            if (!controller ||
                typeof controller.onSelectionChanged !== "function" ||
                typeof controller.loadHistory !== "function") {
                throw new Error("createSelectionController: transition controller contract is invalid.");
            }

            transitionController = controller;
        }

        function setShortlistWorkspace(workspace) {
            if (!workspace || typeof workspace.onSelectionChanged !== "function") {
                throw new Error("createSelectionController: shortlist workspace contract is invalid.");
            }

            shortlistWorkspace = workspace;
        }

        function getSelectedProcedure() {
            return selectedProcedure;
        }

        function renderSelection(procedure) {
            selectedElement.textContent = buildProcedureSelectionSummary(procedure);
            shortlistSelectedElement.textContent = buildShortlistSelectionSummary(procedure);
        }

        async function syncTransitionController(procedure) {
            if (!transitionController) {
                return;
            }

            transitionController.onSelectionChanged(procedure);

            if (!procedure) {
                try {
                    await transitionController.loadHistory(null);
                } catch (error) {
                    if (onHistoryResetFailed) {
                        onHistoryResetFailed();
                    }
                }

                return;
            }

            try {
                await transitionController.loadHistory(procedure.id);
            } catch (error) {
                setTransitionStatus(`Не удалось загрузить историю статусов: ${error.message}`, true);
            }
        }

        async function syncShortlistWorkspace(procedure) {
            if (!shortlistWorkspace) {
                return;
            }

            await shortlistWorkspace.onSelectionChanged(procedure);
        }

        async function applySelection(procedure) {
            const previousProcedure = selectedProcedure;
            selectedProcedure = procedure || null;
            renderSelection(selectedProcedure);

            if (!previousProcedure && !selectedProcedure) {
                return;
            }

            await Promise.all([
                syncTransitionController(selectedProcedure),
                syncShortlistWorkspace(selectedProcedure)
            ]);
        }

        return {
            setTransitionController: setTransitionController,
            setShortlistWorkspace: setShortlistWorkspace,
            getSelectedProcedure: getSelectedProcedure,
            applySelection: applySelection
        };
    }

    const exportsObject = {
        createSelectionController: createSelectionController
    };

    if (typeof window !== "undefined") {
        window.ProceduresSelection = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
