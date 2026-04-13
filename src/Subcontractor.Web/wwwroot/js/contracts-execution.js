"use strict";

(function () {
    function canEditMilestones(status) {
        return status === "Signed" || status === "Active";
    }

    function formatExecutionSummary(summary) {
        if (!summary) {
            return {
                text: "Метрики исполнения пока не загружены.",
                hasWarning: false
            };
        }

        const total = Number(summary.milestonesTotal ?? 0);
        const completed = Number(summary.milestonesCompleted ?? 0);
        const overdue = Number(summary.overdueMilestones ?? 0);
        const progress = Number(summary.progressPercent ?? 0).toFixed(1);
        const nextPlannedDate = summary.nextPlannedDate
            ? new Date(summary.nextPlannedDate).toLocaleDateString("ru-RU")
            : "н/д";

        return {
            text: `Прогресс: ${progress}% | Выполнено: ${completed}/${total} | Просрочено: ${overdue} | Ближайшая плановая дата: ${nextPlannedDate}`,
            hasWarning: overdue > 0
        };
    }

    async function loadExecutionSummary(options) {
        const selectedContract = options?.selectedContract || null;
        const apiClient = options?.apiClient;
        const setExecutionSummary = options?.setExecutionSummary;
        const setExecutionStatus = options?.setExecutionStatus;
        const showStatusMessage = Boolean(options?.showStatusMessage);

        if (!selectedContract) {
            setExecutionSummary?.(null);
            return;
        }

        try {
            const summary = await apiClient.getExecutionSummary(selectedContract.id);
            setExecutionSummary?.(summary);
            if (showStatusMessage) {
                setExecutionStatus?.("Сводка исполнения загружена.", false);
            }
        } catch (error) {
            setExecutionSummary?.(null);
            setExecutionStatus?.(`Не удалось загрузить сводку исполнения: ${error.message}`, true);
        }
    }

    async function loadMilestones(options) {
        const selectedContract = options?.selectedContract || null;
        const executionGridInstance = options?.executionGridInstance || null;
        const apiClient = options?.apiClient;
        const setExecutionStatus = options?.setExecutionStatus;
        const showStatusMessage = Boolean(options?.showStatusMessage);

        if (!executionGridInstance) {
            return;
        }

        if (!selectedContract) {
            executionGridInstance.option("dataSource", []);
            return;
        }

        try {
            const payload = await apiClient.getMilestones(selectedContract.id);
            const milestones = Array.isArray(payload) ? payload : [];
            executionGridInstance.option("dataSource", milestones);
            if (showStatusMessage) {
                setExecutionStatus?.(`Загружено этапов: ${milestones.length}.`, false);
            }
        } catch (error) {
            executionGridInstance.option("dataSource", []);
            setExecutionStatus?.(`Не удалось загрузить этапы: ${error.message}`, true);
        }
    }

    async function loadExecutionData(options) {
        await loadExecutionSummary(options);
        await loadMilestones(options);
    }

    async function persistMilestones(options) {
        const selectedContract = options?.selectedContract || null;
        const executionGridInstance = options?.executionGridInstance || null;
        const apiClient = options?.apiClient;
        const buildMilestonesPayload = options?.buildMilestonesPayload;
        const setExecutionStatus = options?.setExecutionStatus;
        const message = String(options?.message || "Этапы сохранены.");
        const reloadMilestones = options?.reloadMilestones;
        const reloadExecutionSummary = options?.reloadExecutionSummary;
        const canEdit = typeof options?.canEditMilestones === "function"
            ? options.canEditMilestones
            : canEditMilestones;

        if (!selectedContract || !executionGridInstance) {
            return;
        }

        if (!canEdit(selectedContract.status)) {
            if (typeof reloadMilestones === "function") {
                await reloadMilestones(false);
            }

            setExecutionStatus?.("Для текущего статуса договора этапы доступны только для чтения.", true);
            return;
        }

        const items = executionGridInstance.option("dataSource");
        const payload = {
            items: buildMilestonesPayload(items)
        };

        const updated = await apiClient.saveMilestones(selectedContract.id, payload);
        executionGridInstance.option("dataSource", Array.isArray(updated) ? updated : []);

        if (typeof reloadExecutionSummary === "function") {
            await reloadExecutionSummary(false);
        }

        setExecutionStatus?.(message, false);
    }

    window.ContractsExecution = {
        canEditMilestones: canEditMilestones,
        formatExecutionSummary: formatExecutionSummary,
        loadExecutionData: loadExecutionData,
        loadExecutionSummary: loadExecutionSummary,
        loadMilestones: loadMilestones,
        persistMilestones: persistMilestones
    };
})();
