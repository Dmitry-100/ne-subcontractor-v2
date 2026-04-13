"use strict";

(function () {
    const entrypointHelpersRoot =
        typeof window !== "undefined" && window.ContractorsGridEntrypointHelpers
            ? window.ContractorsGridEntrypointHelpers
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./contractors-grid-entrypoint-helpers.js")
                : null;

    if (!entrypointHelpersRoot || typeof entrypointHelpersRoot.composeEntrypoint !== "function") {
        throw new Error("Contractors grid entrypoint requires ContractorsGridEntrypointHelpers.composeEntrypoint.");
    }

    const contractorsBootstrapRoot = window.ContractorsBootstrap;
    if (!contractorsBootstrapRoot || typeof contractorsBootstrapRoot.createBootstrapContext !== "function") {
        return;
    }

    const context = contractorsBootstrapRoot.createBootstrapContext();
    if (!context) {
        return;
    }

    const composition = entrypointHelpersRoot.composeEntrypoint({
        context: context,
        windowImpl: window
    });
    const uiState = composition.uiState;
    const dataRuntime = composition.dataRuntime;
    const modelService = composition.modelService;
    const actions = composition.actions;
    actions.bindEvents();

    const setUiBusy = uiState.setUiBusy;
    const setStatus = uiState.setStatus;
    const setRatingStatus = uiState.setRatingStatus;
    const setHistoryStatus = uiState.setHistoryStatus;
    const setAnalyticsStatus = uiState.setAnalyticsStatus;
    const updateSelectionUi = uiState.updateSelectionUi;

    function loadAnalyticsInBackground() {
        setAnalyticsStatus("Загружаем аналитику рейтинга...", false);
        Promise.resolve().then(function () {
            return dataRuntime.loadAnalytics();
        }).catch(function (error) {
            setAnalyticsStatus(`Не удалось загрузить аналитику рейтинга: ${error.message}`, true);
        });
    }

    setUiBusy(true);
    Promise.all([dataRuntime.loadContractors(), modelService.loadModel()]).then(function () {
        updateSelectionUi();
        setRatingStatus("Модуль рейтинга готов к работе.", false);
        setHistoryStatus("Выберите подрядчика для просмотра истории.", false);
        loadAnalyticsInBackground();
    }).catch(function (error) {
        setStatus(`Ошибка загрузки модуля подрядчиков: ${error.message}`, true);
        setRatingStatus(`Ошибка загрузки рейтинговых данных: ${error.message}`, true);
        setAnalyticsStatus(`Ошибка загрузки аналитики рейтингов: ${error.message}`, true);
    }).finally(function () {
        setUiBusy(false);
    });
})();
