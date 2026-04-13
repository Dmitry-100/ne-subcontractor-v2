"use strict";

(function () {
    function resolveImportMode(value) {
        const normalized = String(value || "strict").trim().toLowerCase();
        return normalized === "skip" ? "skip" : "strict";
    }

    function buildConflictPreview(conflicts, maxItems) {
        const limit = Number.isInteger(maxItems) && maxItems > 0 ? maxItems : 3;
        const source = Array.isArray(conflicts) ? conflicts : [];

        return source
            .slice(0, limit)
            .map(function (item) {
                return `#${item.sourceRowNumber}: ${item.code}`;
            })
            .join("; ");
    }

    function buildImportStatuses(result, fallbackTotalRows) {
        const totalRows = Number(result?.totalRows ?? fallbackTotalRows ?? 0);
        const updatedRows = Number(result?.updatedRows ?? 0);
        const conflictRows = Number(result?.conflictRows ?? 0);
        const applied = Boolean(result?.applied);
        const conflicts = Array.isArray(result?.conflicts) ? result.conflicts : [];
        const conflictPreview = buildConflictPreview(conflicts, 3);
        const summary = `Импорт MDR: строк ${totalRows}, обновлено ${updatedRows}, конфликтов ${conflictRows}.`;

        if (!applied && conflictRows > 0) {
            const details = conflictPreview ? ` ${conflictPreview}` : "";
            return {
                mdrStatusMessage: `${summary} Изменения не применены (строгий режим).${details}`,
                monitoringStatusMessage: "Импорт MDR завершился конфликтами. Данные не изменены.",
                isError: true
            };
        }

        if (conflictRows > 0) {
            const details = conflictPreview ? ` ${conflictPreview}` : "";
            return {
                mdrStatusMessage: `${summary} Конфликтные строки пропущены.${details}`,
                monitoringStatusMessage: "Импорт MDR применён частично (конфликтные строки пропущены).",
                isError: false
            };
        }

        return {
            mdrStatusMessage: summary,
            monitoringStatusMessage: "Импорт MDR выполнен успешно.",
            isError: false
        };
    }

    function validateImportPrerequisites(args) {
        const options = args || {};
        const selectedContract = options.selectedContract || null;
        const isEditableStatus = Boolean(options.isEditableStatus);
        const file = options.file || null;

        if (!selectedContract) {
            throw new Error("Сначала выберите договор.");
        }

        if (!isEditableStatus) {
            throw new Error("Импорт MDR доступен только для договоров в статусах «Подписан» и «Действует».");
        }

        if (!file) {
            throw new Error("Выберите файл импорта MDR.");
        }
    }

    const exportsObject = {
        resolveImportMode: resolveImportMode,
        buildConflictPreview: buildConflictPreview,
        buildImportStatuses: buildImportStatuses,
        validateImportPrerequisites: validateImportPrerequisites
    };

    if (typeof window !== "undefined") {
        window.ContractsMonitoringImportStatus = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
