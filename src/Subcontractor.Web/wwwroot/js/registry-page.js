"use strict";

(function () {
    const bootstrapRoot = window.RegistryPageBootstrap;
    const helpersRoot = window.RegistryPageHelpers;
    const runtimeRoot = window.RegistryPageRuntime;

    if (!bootstrapRoot || typeof bootstrapRoot.createBootstrapContext !== "function") {
        return;
    }

    if (!helpersRoot || typeof helpersRoot.normalizeArray !== "function") {
        return;
    }

    if (!runtimeRoot || typeof runtimeRoot.createRuntime !== "function") {
        return;
    }

    const context = bootstrapRoot.createBootstrapContext({
        document: document
    });

    if (!context) {
        return;
    }

    const statusElement = context.controls.statusElement;

    function setFatalStatus(message) {
        if (!statusElement) {
            return;
        }

        statusElement.textContent = message;
        if (statusElement.classList && typeof statusElement.classList.toggle === "function") {
            statusElement.classList.toggle("registry-status--error", true);
        }
    }

    try {
        const runtime = runtimeRoot.createRuntime({
            endpoint: context.endpoint,
            controls: context.controls,
            fetchImpl: window.fetch,
            helpers: helpersRoot,
            document: document
        });

        runtime.bind();
        runtime.load();
    } catch (error) {
        const message = error && error.message
            ? error.message
            : "Не удалось инициализировать реестр.";
        setFatalStatus(message);
        if (window.console && typeof window.console.error === "function") {
            window.console.error(message);
        }
    }
})();
