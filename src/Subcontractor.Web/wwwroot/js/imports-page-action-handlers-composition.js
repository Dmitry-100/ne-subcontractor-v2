"use strict";

(function () {
    const extrasRoot =
        typeof window !== "undefined" && window.ImportsPageActionHandlersCompositionExtras
            ? window.ImportsPageActionHandlersCompositionExtras
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./imports-page-action-handlers-composition-extras.js")
                : null;

    if (!extrasRoot || typeof extrasRoot.createExtrasHandlers !== "function") {
        throw new Error("ImportsPageActionHandlersComposition requires extras helpers.");
    }

    function createHandlers(options) {
        const settings = options || {};

        function getActiveSelectedBatch() {
            const selectedBatch = settings.getSelectedBatch();
            if (!selectedBatch || !selectedBatch.id) {
                return null;
            }

            return selectedBatch;
        }

        function disableUploadPreview() {
            settings.uploadButton.disabled = true;
            settings.previewWrap.hidden = true;
            settings.parseSummaryElement.hidden = true;
        }

        function setMappingError(message) {
            settings.setMappingStatus(message, true);
            disableUploadPreview();
        }

        const extrasHandlers = extrasRoot.createExtrasHandlers(settings, getActiveSelectedBatch);

        async function onParseClick() {
            settings.parseButton.disabled = true;
            try {
                await settings.parseSelectedFile();
            } catch (error) {
                settings.setUploadStatus(`Ошибка разбора: ${error.message}`, true);
                setMappingError(`Сопоставление недоступно: ${error.message}`);
            } finally {
                settings.parseButton.disabled = false;
            }
        }

        function onApplyMappingClick() {
            try {
                settings.applyMappingToRows();
            } catch (error) {
                setMappingError(`Ошибка применения сопоставления: ${error.message}`);
            }
        }

        function onHasHeaderChange() {
            const rawRows = settings.getRawRows();
            if (!Array.isArray(rawRows) || rawRows.length === 0) {
                return;
            }

            try {
                settings.rebuildMappingFromRaw(false);
                settings.applyMappingToRows();
            } catch (error) {
                setMappingError(`Ошибка переключения опции заголовка: ${error.message}`);
            }
        }

        function onResetClick() {
            settings.resetWizard();
        }

        async function onUploadClick() {
            settings.uploadButton.disabled = true;
            try {
                await settings.uploadBatch();
            } catch (error) {
                settings.setUploadStatus(`Ошибка загрузки: ${error.message}`, true);
            } finally {
                const parsedRows = settings.getParsedRows();
                if (Array.isArray(parsedRows) && parsedRows.length > 0) {
                    settings.uploadButton.disabled = false;
                }
            }
        }

        async function onTransitionApplyClick() {
            settings.transitionApplyButton.disabled = true;
            try {
                await settings.applyBatchTransition(
                    settings.transitionTargetSelect.value,
                    settings.transitionReasonInput.value);
                settings.transitionReasonInput.value = "";
            } catch (error) {
                settings.setTransitionStatus(`Ошибка перехода: ${error.message}`, true);
            } finally {
                const selectedBatch = getActiveSelectedBatch();
                if (selectedBatch) {
                    settings.transitionApplyButton.disabled = settings.transitionTargetSelect.options.length === 0;
                }
            }
        }

        return {
            onParseClick: onParseClick,
            onApplyMappingClick: onApplyMappingClick,
            onHasHeaderChange: onHasHeaderChange,
            onResetClick: onResetClick,
            onUploadClick: onUploadClick,
            onRefreshBatchesClick: extrasHandlers.onRefreshBatchesClick,
            onXmlQueueClick: extrasHandlers.onXmlQueueClick,
            onXmlRefreshClick: extrasHandlers.onXmlRefreshClick,
            onLotBuildClick: extrasHandlers.onLotBuildClick,
            onLotApplyClick: extrasHandlers.onLotApplyClick,
            onTransitionApplyClick: onTransitionApplyClick,
            onHistoryRefreshClick: extrasHandlers.onHistoryRefreshClick,
            onDownloadInvalidReportClick: extrasHandlers.onDownloadInvalidReportClick,
            onDownloadFullReportClick: extrasHandlers.onDownloadFullReportClick,
            onDownloadLotReconciliationReportClick: extrasHandlers.onDownloadLotReconciliationReportClick,
            bindTableInteractions: settings.bindTableInteractions
        };
    }

    const exportsObject = {
        createHandlers: createHandlers
    };

    if (typeof window !== "undefined") {
        window.ImportsPageActionHandlersComposition = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
