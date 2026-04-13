"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ContractsWorkflowEvents requires ${name}.`);
        }
    }

    function createEvents(options) {
        const settings = options || {};
        const getSelectedContract = settings.getSelectedContract;
        const setTransitionStatus = settings.setTransitionStatus;
        const getTargetStatus = settings.getTargetStatus;
        const getReason = settings.getReason;
        const clearReason = settings.clearReason;
        const getStatusRank = settings.getStatusRank;
        const localizeStatus = settings.localizeStatus;
        const transitionContract = settings.transitionContract;
        const onTransitionCompleted = settings.onTransitionCompleted;
        const loadHistory = settings.loadHistory;

        requireFunction(getSelectedContract, "getSelectedContract");
        requireFunction(setTransitionStatus, "setTransitionStatus");
        requireFunction(getTargetStatus, "getTargetStatus");
        requireFunction(getReason, "getReason");
        requireFunction(clearReason, "clearReason");
        requireFunction(getStatusRank, "getStatusRank");
        requireFunction(localizeStatus, "localizeStatus");
        requireFunction(transitionContract, "transitionContract");
        requireFunction(onTransitionCompleted, "onTransitionCompleted");
        requireFunction(loadHistory, "loadHistory");

        return {
            onApplyClick: function () {
                const selectedContract = getSelectedContract();
                if (!selectedContract) {
                    setTransitionStatus("Сначала выберите договор.", true);
                    return;
                }

                const targetStatus = String(getTargetStatus() || "");
                if (!targetStatus) {
                    setTransitionStatus("Выберите целевой статус.", true);
                    return;
                }

                const currentRank = getStatusRank(selectedContract.status);
                const targetRank = getStatusRank(targetStatus);
                const reason = String(getReason() || "").trim();

                if (targetRank < currentRank && !reason) {
                    setTransitionStatus("Для отката статуса необходимо указать причину.", true);
                    return;
                }

                transitionContract(selectedContract.id, {
                    targetStatus: targetStatus,
                    reason: reason || null
                }).then(function (history) {
                    const fromStatus = history.fromStatus ? localizeStatus(history.fromStatus) : "не задан";
                    setTransitionStatus(`Переход выполнен: ${fromStatus} -> ${localizeStatus(history.toStatus)}.`, false);
                    clearReason();
                    return onTransitionCompleted(selectedContract.id);
                }).catch(function (error) {
                    setTransitionStatus(error.message || "Ошибка выполнения перехода.", true);
                });
            },
            onHistoryRefreshClick: function () {
                loadHistory(true);
            }
        };
    }

    const exportsObject = {
        createEvents: createEvents
    };

    if (typeof window !== "undefined") {
        window.ContractsWorkflowEvents = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
