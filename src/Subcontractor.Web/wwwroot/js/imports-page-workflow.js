"use strict";

(function () {
    function createWorkflow(options) {
        const settings = options || {};
        const transitions = settings.transitions || {};
        const localizeImportStatus = typeof settings.localizeImportStatus === "function"
            ? settings.localizeImportStatus
            : function (status) { return String(status || ""); };

        function getTransitionTargets(currentStatus) {
            const key = String(currentStatus || "").trim();
            const targets = transitions[key];
            return Array.isArray(targets) ? targets.slice() : [];
        }

        function buildTransitionStatus(currentStatus) {
            const targets = getTransitionTargets(currentStatus);
            if (targets.length === 0) {
                if (currentStatus === "Uploaded" || currentStatus === "Processing") {
                    return {
                        targets: targets,
                        message: "Пакет поставлен в очередь на асинхронную валидацию. Переходы недоступны до завершения обработки.",
                        isError: false
                    };
                }

                if (currentStatus === "Failed") {
                    return {
                        targets: targets,
                        message: "Обработка пакета завершилась ошибкой. Загрузите исправленные исходные данные повторно.",
                        isError: true
                    };
                }

                return {
                    targets: targets,
                    message: "Для текущего статуса переходы процесса недоступны.",
                    isError: false
                };
            }

            return {
                targets: targets,
                message: `Выберите целевой статус и примените переход из «${localizeImportStatus(currentStatus)}».`,
                isError: false
            };
        }

        function shouldAutoRefreshDetails(status) {
            return status === "Uploaded" || status === "Processing";
        }

        function validateTransitionRequest(args) {
            const options = args || {};
            const selectedBatchId = String(options.selectedBatchId || "").trim();
            if (!selectedBatchId) {
                throw new Error("Сначала выберите пакет.");
            }

            const targetStatus = String(options.targetStatus || "").trim();
            if (!targetStatus) {
                throw new Error("Сначала выберите целевой статус.");
            }

            const reason = String(options.reason || "").trim();
            if (targetStatus === "Rejected" && reason.length === 0) {
                throw new Error("Для перехода в статус «Отклонён» требуется причина.");
            }

            return {
                targetStatus: targetStatus,
                payload: {
                    targetStatus: targetStatus,
                    reason: reason || null
                }
            };
        }

        function buildBatchDetailsSummary(details) {
            const source = details || {};
            return `Статус: ${source.status}. Строк: ${source.totalRows}. Валидных: ${source.validRows}. Невалидных: ${source.invalidRows}.`;
        }

        return {
            getTransitionTargets: getTransitionTargets,
            buildTransitionStatus: buildTransitionStatus,
            shouldAutoRefreshDetails: shouldAutoRefreshDetails,
            validateTransitionRequest: validateTransitionRequest,
            buildBatchDetailsSummary: buildBatchDetailsSummary
        };
    }

    const exportsObject = {
        createWorkflow: createWorkflow
    };

    if (typeof window !== "undefined") {
        window.ImportsPageWorkflow = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
