"use strict";

(function () {
    function createExtrasHandlers(settings, getActiveSelectedBatch) {
        function withSelectedBatch(action) {
            const selectedBatch = getActiveSelectedBatch();
            if (!selectedBatch) {
                return null;
            }

            return action(selectedBatch);
        }

        async function withDisabled(control, action) {
            control.disabled = true;
            try {
                return await action();
            } finally {
                control.disabled = false;
            }
        }

        async function onRefreshBatchesClick() {
            await withDisabled(settings.refreshBatchesButton, async function () {
                await settings.loadBatches();
            });
        }

        async function onXmlQueueClick() {
            await withDisabled(settings.xmlQueueButton, async function () {
                try {
                    const queueResult = await settings.queueXmlInboxItem({
                        sourceSystem: settings.xmlSourceInput.value,
                        externalDocumentId: settings.xmlExternalIdInput.value,
                        fileName: settings.xmlFileNameInput.value,
                        xmlContent: settings.xmlContentInput.value
                    });

                    if (queueResult &&
                        typeof queueResult.normalizedFileName === "string" &&
                        queueResult.normalizedFileName.length > 0) {
                        settings.xmlFileNameInput.value = queueResult.normalizedFileName;
                    }
                } catch (error) {
                    settings.setXmlStatus(`Ошибка постановки XML в очередь: ${error.message}`, true);
                }
            });
        }

        async function onXmlRefreshClick() {
            await withDisabled(settings.xmlRefreshButton, async function () {
                await settings.loadXmlInbox();
            });
        }

        async function runLotAction(button, action, errorPrefix) {
            button.disabled = true;
            try {
                await action();
            } catch (error) {
                settings.setLotStatus(`${errorPrefix}: ${error.message}`, true);
            } finally {
                settings.updateLotActionButtons();
            }
        }

        async function onLotBuildClick() {
            await runLotAction(
                settings.lotBuildButton,
                settings.buildLotRecommendations,
                "Ошибка построения рекомендаций");
        }

        async function onLotApplyClick() {
            await runLotAction(
                settings.lotApplyButton,
                settings.applyLotRecommendations,
                "Ошибка создания черновых лотов");
        }

        async function onHistoryRefreshClick() {
            await withSelectedBatch(async function (selectedBatch) {
                await withDisabled(settings.historyRefreshButton, async function () {
                    try {
                        await settings.loadBatchHistory(selectedBatch.id);
                        settings.setTransitionStatus("История обновлена.", false);
                    } catch (error) {
                        settings.setTransitionStatus(`Ошибка обновления истории: ${error.message}`, true);
                    }
                });
            });
        }

        function onDownloadInvalidReportClick() {
            withSelectedBatch(function (selectedBatch) {
                settings.downloadValidationReport(selectedBatch.id, false);
            });
        }

        function onDownloadFullReportClick() {
            withSelectedBatch(function (selectedBatch) {
                settings.downloadValidationReport(selectedBatch.id, true);
            });
        }

        function onDownloadLotReconciliationReportClick() {
            withSelectedBatch(function (selectedBatch) {
                settings.downloadLotReconciliationReport(selectedBatch.id);
            });
        }

        return {
            onRefreshBatchesClick: onRefreshBatchesClick,
            onXmlQueueClick: onXmlQueueClick,
            onXmlRefreshClick: onXmlRefreshClick,
            onLotBuildClick: onLotBuildClick,
            onLotApplyClick: onLotApplyClick,
            onHistoryRefreshClick: onHistoryRefreshClick,
            onDownloadInvalidReportClick: onDownloadInvalidReportClick,
            onDownloadFullReportClick: onDownloadFullReportClick,
            onDownloadLotReconciliationReportClick: onDownloadLotReconciliationReportClick
        };
    }

    const exportsObject = {
        createExtrasHandlers: createExtrasHandlers
    };

    if (typeof window !== "undefined") {
        window.ImportsPageActionHandlersCompositionExtras = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
