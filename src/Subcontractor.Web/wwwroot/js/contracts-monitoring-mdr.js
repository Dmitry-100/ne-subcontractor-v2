"use strict";

(function () {
    function getMdrCardsData(gridInstance) {
        const source = gridInstance
            ? gridInstance.option("dataSource")
            : [];
        return Array.isArray(source) ? source : [];
    }

    function findSelectedMdrCard(mdrCards, selectedClientId) {
        if (!selectedClientId) {
            return null;
        }

        return (Array.isArray(mdrCards) ? mdrCards : []).find(function (item) {
            return item.clientId === selectedClientId;
        }) || null;
    }

    function ensureSelectedMdrCardId(mdrCards, selectedClientId) {
        const source = Array.isArray(mdrCards) ? mdrCards : [];
        const hasSelected = source.some(function (item) {
            return item.clientId === selectedClientId;
        });

        if (hasSelected) {
            return selectedClientId;
        }

        return source.length > 0
            ? source[0].clientId
            : null;
    }

    function getRowsDataSource(selectedMdrCard) {
        return selectedMdrCard && Array.isArray(selectedMdrCard.rows)
            ? selectedMdrCard.rows
            : [];
    }

    function syncRowsToMdrCard(selectedMdrCard, rowSource) {
        if (!selectedMdrCard) {
            return;
        }

        selectedMdrCard.rows = Array.isArray(rowSource) ? rowSource : [];
    }

    function formatSelectionStatus(selectedMdrCard) {
        if (!selectedMdrCard) {
            return "Выберите карточку MDR для просмотра строк.";
        }

        return `Выбрана карточка MDR: ${selectedMdrCard.title || "без наименования"} | Строк: ${(selectedMdrCard.rows || []).length}`;
    }

    function buildMdrCardSelectionKey(card) {
        if (!card) {
            return "";
        }

        const title = String(card.title || "").trim().toUpperCase();
        const reportingDateText = String(card.reportingDate || "").trim();
        const reportingDate = reportingDateText ? reportingDateText.slice(0, 10) : "";
        return `${title}|${reportingDate}`;
    }

    window.ContractsMonitoringMdr = {
        buildMdrCardSelectionKey: buildMdrCardSelectionKey,
        ensureSelectedMdrCardId: ensureSelectedMdrCardId,
        findSelectedMdrCard: findSelectedMdrCard,
        formatSelectionStatus: formatSelectionStatus,
        getMdrCardsData: getMdrCardsData,
        getRowsDataSource: getRowsDataSource,
        syncRowsToMdrCard: syncRowsToMdrCard
    };
})();
