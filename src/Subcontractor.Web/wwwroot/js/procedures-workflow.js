"use strict";

(function () {
    function createWorkflow(options) {
        const settings = options || {};
        const statusOrder = Array.isArray(settings.statusOrder) ? settings.statusOrder : [];
        const localizeStatus = typeof settings.localizeStatus === "function"
            ? settings.localizeStatus
            : function (value) { return value || "—"; };

        const statusRank = statusOrder.reduce(function (map, status, index) {
            map[status] = index + 1;
            return map;
        }, {});

        function reasonRequired(currentStatus, targetStatus) {
            if (targetStatus === "Canceled") {
                return true;
            }

            const currentRank = statusRank[currentStatus];
            const targetRank = statusRank[targetStatus];
            return Number.isFinite(currentRank) && Number.isFinite(targetRank) && targetRank < currentRank;
        }

        function validateTransitionRequest(selectedProcedure, targetStatus, reason) {
            if (!selectedProcedure) {
                return {
                    isValid: false,
                    errorMessage: "Сначала выберите процедуру."
                };
            }

            if (!targetStatus) {
                return {
                    isValid: false,
                    errorMessage: "Сначала выберите целевой статус."
                };
            }

            const normalizedReason = typeof reason === "string" ? reason.trim() : "";
            if (reasonRequired(selectedProcedure.status, targetStatus) && !normalizedReason) {
                return {
                    isValid: false,
                    errorMessage: "Для отката или отмены необходимо указать причину."
                };
            }

            return {
                isValid: true,
                payload: {
                    targetStatus: targetStatus,
                    reason: normalizedReason || null
                }
            };
        }

        function buildTransitionSuccessMessage(fromStatus, targetStatus) {
            return `Переход выполнен: ${localizeStatus(fromStatus)} -> ${localizeStatus(targetStatus)}.`;
        }

        function buildProcedureSelectionSummary(procedure) {
            if (!procedure) {
                return "Выберите процедуру в таблице, чтобы выполнить переход.";
            }

            return `Выбрано: ${procedure.objectName} · Статус: ${localizeStatus(procedure.status)} · Лот: ${procedure.lotId}`;
        }

        function buildShortlistSelectionSummary(procedure) {
            if (!procedure) {
                return "Выберите процедуру в таблице, чтобы сформировать рекомендации по списку кандидатов.";
            }

            return `Процедура: ${procedure.objectName} · Статус: ${localizeStatus(procedure.status)}`;
        }

        function buildRecommendationsStatus(recommendations) {
            const items = Array.isArray(recommendations) ? recommendations : [];
            const recommendedCount = items.filter(function (item) {
                return Boolean(item?.isRecommended);
            }).length;

            return `Кандидатов: ${items.length}. Рекомендовано: ${recommendedCount}.`;
        }

        function buildApplyResultStatus(applyResult) {
            const includedCandidates = Number(applyResult?.includedCandidates ?? 0);
            const totalCandidates = Number(applyResult?.totalCandidates ?? 0);
            return `Рекомендации применены. Включено: ${includedCandidates} из ${totalCandidates} кандидатов.`;
        }

        return {
            reasonRequired: reasonRequired,
            validateTransitionRequest: validateTransitionRequest,
            buildTransitionSuccessMessage: buildTransitionSuccessMessage,
            buildProcedureSelectionSummary: buildProcedureSelectionSummary,
            buildShortlistSelectionSummary: buildShortlistSelectionSummary,
            buildRecommendationsStatus: buildRecommendationsStatus,
            buildApplyResultStatus: buildApplyResultStatus
        };
    }

    const exportsObject = {
        createWorkflow: createWorkflow
    };

    if (typeof window !== "undefined") {
        window.ProceduresWorkflow = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
