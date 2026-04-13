"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`createOrchestrationServices: required function '${name}' is missing.`);
        }
    }

    function createOrchestrationServices(options) {
        const settings = options || {};
        const controls = settings.controls || null;
        const roots = settings.roots || null;
        const stateStore = settings.stateStore || null;
        const endpoint = settings.endpoint || "";
        const xmlInboxEndpoint = settings.xmlInboxEndpoint || "";
        const lotRecommendationsEndpoint = settings.lotRecommendationsEndpoint || "";
        const loadBatchHistory = settings.loadBatchHistory || null;
        const scheduleTimeout = settings.scheduleTimeout || null;
        const foundation = settings.foundation || null;

        if (!controls ||
            !roots ||
            !stateStore ||
            !endpoint ||
            !xmlInboxEndpoint ||
            !lotRecommendationsEndpoint ||
            !foundation) {
            throw new Error("createOrchestrationServices: required options are missing.");
        }

        requireFunction(loadBatchHistory, "loadBatchHistory");
        requireFunction(scheduleTimeout, "scheduleTimeout");
        requireFunction(foundation.localizeImportStatus, "foundation.localizeImportStatus");
        requireFunction(foundation.setBatchesStatus, "foundation.setBatchesStatus");
        requireFunction(foundation.setTransitionStatus, "foundation.setTransitionStatus");
        requireFunction(foundation.setXmlStatus, "foundation.setXmlStatus");
        requireFunction(foundation.setLotStatus, "foundation.setLotStatus");

        let importsPageLot = null;

        const importsPageWorkflowUi = roots.importsPageWorkflowUiRoot.createWorkflowUiService({
            workflow: foundation.importsPageWorkflow,
            localizeImportStatus: foundation.localizeImportStatus,
            setTransitionStatus: foundation.setTransitionStatus,
            transitionTargetSelect: controls.transitionTargetSelect,
            transitionReasonInput: controls.transitionReasonInput,
            transitionApplyButton: controls.transitionApplyButton,
            historyRefreshButton: controls.historyRefreshButton,
            downloadInvalidReportButton: controls.downloadInvalidReportButton,
            downloadFullReportButton: controls.downloadFullReportButton,
            downloadLotReconciliationReportButton: controls.downloadLotReconciliationReportButton,
            lotBuildButton: controls.lotBuildButton,
            lotApplyButton: controls.lotApplyButton,
            refreshLotActions: function () {
                if (importsPageLot) {
                    importsPageLot.updateActionButtons();
                }
            }
        });
        const setWorkflowActionsEnabled = importsPageWorkflowUi.setWorkflowActionsEnabled;
        const renderTransitionTargets = importsPageWorkflowUi.renderTransitionTargets;

        const importsPageBatches = roots.importsPageBatchesRoot.createBatchesService({
            apiClient: foundation.apiClient,
            endpoint: endpoint,
            workflow: foundation.importsPageWorkflow,
            lotState: roots.importsPageLotStateRoot,
            getSelectedBatch: stateStore.getSelectedBatch,
            setSelectedBatch: stateStore.setSelectedBatch,
            getLotRecommendations: function () {
                return importsPageLot ? importsPageLot.getRecommendations() : null;
            },
            getLotRecommendationsBatchId: function () {
                return importsPageLot ? importsPageLot.getRecommendationsBatchId() : null;
            },
            clearDetailsPoll: stateStore.clearDetailsPoll,
            setDetailsPollHandle: stateStore.setDetailsPollHandle,
            scheduleTimeout: scheduleTimeout,
            localizeImportStatus: foundation.localizeImportStatus,
            setBatchesStatus: foundation.setBatchesStatus,
            setTransitionStatus: foundation.setTransitionStatus,
            onBatchesLoaded: foundation.importsPageBatchTables.renderBatchesTable,
            onDetailsLoaded: function (details) {
                controls.detailsElement.hidden = false;
                controls.detailsTitleElement.textContent = `Пакет: ${details.fileName}`;
                controls.detailsSummaryElement.textContent = foundation.importsPageWorkflow.buildBatchDetailsSummary(details);
                foundation.importsPageBatchTables.renderInvalidRows(details);
                renderTransitionTargets(details.status);
                setWorkflowActionsEnabled(true);
            },
            onDetailsError: function (error) {
                foundation.setBatchesStatus(`Не удалось загрузить детали пакета: ${error.message}`, true);
                setWorkflowActionsEnabled(false);
                if (importsPageLot) {
                    importsPageLot.clearRecommendations("Выберите пакет для построения рекомендаций.");
                }
            },
            onAfterDetailsLoaded: function (context) {
                if (importsPageLot) {
                    importsPageLot.onDetailsLoaded(context);
                }
            },
            onLoadBatchHistory: loadBatchHistory,
            onAutoRefreshError: function (error) {
                foundation.setBatchesStatus(`Ошибка автообновления: ${error.message}`, true);
            }
        });

        const importsPageXmlInbox = roots.importsPageXmlInboxRoot.createXmlInboxService({
            apiClient: foundation.apiClient,
            xmlInboxEndpoint: xmlInboxEndpoint,
            xmlHelpers: foundation.importsPageXml,
            tableModels: foundation.importsPageTableModels,
            setXmlStatus: foundation.setXmlStatus,
            xmlTable: controls.xmlTable
        });

        const importsPageLotTables = roots.importsPageLotTablesRoot.createLotTablesService({
            lotState: roots.importsPageLotStateRoot,
            getRecommendations: stateStore.getLotRecommendations,
            getSelectionsByKey: stateStore.getLotSelectionsByKey,
            formatNumber: foundation.importsPageHelpers.formatNumber,
            formatDateRange: foundation.importsPageHelpers.formatDateRange,
            lotGroupsTable: controls.lotGroupsTable,
            lotSelectedTable: controls.lotSelectedTable
        });

        importsPageLot = roots.importsPageLotOrchestrationRoot.createLotOrchestrationService({
            lotState: roots.importsPageLotStateRoot,
            apiClient: foundation.apiClient,
            lotRecommendationsEndpoint: lotRecommendationsEndpoint,
            getSelectedBatchId: stateStore.getSelectedBatchId,
            getRecommendations: stateStore.getLotRecommendations,
            setRecommendations: stateStore.setLotRecommendations,
            getRecommendationsBatchId: stateStore.getLotRecommendationsBatchId,
            setRecommendationsBatchId: stateStore.setLotRecommendationsBatchId,
            getSelectionsByKey: stateStore.getLotSelectionsByKey,
            setSelectionsByKey: stateStore.setLotSelectionsByKey,
            renderLotGroupsTable: importsPageLotTables.renderLotGroupsTable,
            renderLotSelectedTable: importsPageLotTables.renderLotSelectedTable,
            setLotStatus: foundation.setLotStatus,
            setActionButtons: function (state) {
                controls.lotBuildButton.disabled = !state.canBuild;
                controls.lotApplyButton.disabled = !state.canApply;
            }
        });

        const importsPageInteractions = roots.importsPageInteractionsRoot.createInteractionsService({
            lotGroupsTable: controls.lotGroupsTable,
            lotSelectedTable: controls.lotSelectedTable,
            batchesTable: controls.batchesTable,
            xmlTable: controls.xmlTable,
            onSetGroupSelected: function (groupKey, isSelected) {
                importsPageLot.setGroupSelected(groupKey, isSelected);
            },
            onSetGroupLotCode: function (groupKey, lotCode) {
                importsPageLot.setGroupLotCode(groupKey, lotCode);
            },
            onSetGroupLotName: function (groupKey, lotName) {
                importsPageLot.setGroupLotName(groupKey, lotName);
            },
            onOpenBatch: async function (batchId) {
                await importsPageBatches.loadBatchDetails(batchId);
            },
            onRetryXml: async function (itemId) {
                await importsPageXmlInbox.retryXmlInboxItem(itemId);
            },
            onRetryXmlError: function (error) {
                foundation.setXmlStatus(`Ошибка повторной обработки: ${error.message}`, true);
            }
        });

        return {
            setWorkflowActionsEnabled: setWorkflowActionsEnabled,
            importsPageBatches: importsPageBatches,
            importsPageXmlInbox: importsPageXmlInbox,
            importsPageLot: importsPageLot,
            importsPageInteractions: importsPageInteractions
        };
    }

    const exportsObject = {
        createOrchestrationServices: createOrchestrationServices
    };

    if (typeof window !== "undefined") {
        window.ImportsPageServicesWiringOrchestration = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
