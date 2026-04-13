"use strict";

(function () {
    function createFoundationServices(options) {
        const settings = options || {};
        const controls = settings.controls || null;
        const roots = settings.roots || null;
        const config = settings.config || null;
        const endpoint = settings.endpoint || "";
        const getSheetJs = settings.getSheetJs || null;
        const openWindow = settings.openWindow || null;

        if (!roots || !controls || !config || !endpoint || typeof getSheetJs !== "function" || typeof openWindow !== "function") {
            throw new Error("createFoundationServices: required options are missing.");
        }

        const importsPageHelpers = roots.importsPageHelpersRoot.createHelpers({
            fieldDefinitions: config.fieldDefinitions,
            importStatusLabels: config.importStatusLabels
        });
        const apiClient = roots.importsPageApiRoot.createApiClient();

        function localizeImportStatus(status) {
            return importsPageHelpers.localizeImportStatus(status);
        }

        const importsPageStatus = roots.importsPageStatusRoot.createStatusService({
            statusElements: {
                upload: controls.uploadStatusElement,
                batches: controls.batchesStatusElement,
                mapping: controls.mappingStatusElement,
                transition: controls.transitionStatusElement,
                xml: controls.xmlStatusElement,
                lot: controls.lotStatusElement
            }
        });
        const setUploadStatus = importsPageStatus.setUploadStatus;
        const setBatchesStatus = importsPageStatus.setBatchesStatus;
        const setMappingStatus = importsPageStatus.setMappingStatus;
        const setTransitionStatus = importsPageStatus.setTransitionStatus;
        const setXmlStatus = importsPageStatus.setXmlStatus;
        const setLotStatus = importsPageStatus.setLotStatus;

        const importsPageWorkflow = roots.importsPageWorkflowRoot.createWorkflow({
            transitions: config.importStatusTransitions,
            localizeImportStatus: localizeImportStatus
        });

        const importsPageMapping = roots.importsPageMappingRoot.createMappingService({
            fieldDefinitions: config.fieldDefinitions,
            maxImportRows: config.maxImportRows,
            previewRowLimit: config.previewRowLimit,
            deriveColumns: importsPageHelpers.deriveColumns,
            buildAutoMapping: importsPageHelpers.buildAutoMapping,
            isRowEmpty: importsPageHelpers.isRowEmpty,
            mapRawRow: importsPageHelpers.mapRawRow
        });

        const importsPageTableModels = roots.importsPageTableModelsRoot.createTableModels({
            localizeImportStatus: localizeImportStatus
        });

        const importsPageMappingUi = roots.importsPageMappingUiRoot.createMappingUiService({
            fieldDefinitions: config.fieldDefinitions,
            mappingGrid: controls.mappingGrid,
            previewTable: controls.previewTable,
            previewWrap: controls.previewWrap,
            buildPreviewModel: importsPageTableModels.buildPreviewModel,
            previewRowLimit: config.previewRowLimit
        });

        const importsPageBatchTables = roots.importsPageBatchTablesRoot.createBatchTablesService({
            tableModels: importsPageTableModels,
            batchesTable: controls.batchesTable,
            invalidTable: controls.invalidTable,
            invalidWrapElement: controls.invalidWrapElement,
            historyTable: controls.historyTable,
            historyWrapElement: controls.historyWrapElement
        });

        const importsPageXml = roots.importsPageXmlRoot.createXmlHelpers({
            buildDefaultXmlFileName: importsPageHelpers.buildDefaultXmlFileName
        });

        const importsPageUpload = roots.importsPageUploadRoot.createUploadHelpers();
        const importsPageReports = roots.importsPageReportsRoot.createReportsHelpers({
            apiClient: apiClient,
            endpoint: endpoint,
            openWindow: openWindow
        });

        const importsPageWorkbook = roots.importsPageWorkbookRoot.createWorkbookParser({
            getSheetJs: getSheetJs,
            isRowEmpty: importsPageHelpers.isRowEmpty
        });

        const importsPageFileParser = roots.importsPageFileParserRoot.createFileParser({
            parseDelimitedText: importsPageHelpers.parseDelimitedText,
            parseWorkbookFile: importsPageWorkbook.parseWorkbookFile
        });

        return {
            apiClient: apiClient,
            localizeImportStatus: localizeImportStatus,
            setUploadStatus: setUploadStatus,
            setBatchesStatus: setBatchesStatus,
            setMappingStatus: setMappingStatus,
            setTransitionStatus: setTransitionStatus,
            setXmlStatus: setXmlStatus,
            setLotStatus: setLotStatus,
            importsPageHelpers: importsPageHelpers,
            importsPageWorkflow: importsPageWorkflow,
            importsPageMapping: importsPageMapping,
            importsPageTableModels: importsPageTableModels,
            importsPageMappingUi: importsPageMappingUi,
            importsPageBatchTables: importsPageBatchTables,
            importsPageXml: importsPageXml,
            importsPageUpload: importsPageUpload,
            importsPageReports: importsPageReports,
            importsPageWorkbook: importsPageWorkbook,
            importsPageFileParser: importsPageFileParser
        };
    }

    const exportsObject = {
        createFoundationServices: createFoundationServices
    };

    if (typeof window !== "undefined") {
        window.ImportsPageServicesWiringFoundation = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
