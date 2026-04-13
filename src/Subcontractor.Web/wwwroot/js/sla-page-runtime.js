"use strict";

(function () {
    const runtimeHelpers =
        typeof window !== "undefined" && window.SlaPageRuntimeHelpers
            ? window.SlaPageRuntimeHelpers
            : (typeof module !== "undefined" && module.exports && typeof require === "function")
                ? require("./sla-page-runtime-helpers.js")
                : null;

    if (!runtimeHelpers ||
        typeof runtimeHelpers.ensureModuleRoots !== "function" ||
        typeof runtimeHelpers.resolveFetchImpl !== "function" ||
        typeof runtimeHelpers.resolveControls !== "function" ||
        typeof runtimeHelpers.createApiOptions !== "function" ||
        typeof runtimeHelpers.formatRunMonitoringStatus !== "function") {
        throw new Error("Не удалось инициализировать модуль SLA: runtime-helper скрипт не загружен.");
    }

    function initializeSlaPage(options) {
        const settings = options || {};
        const hostWindow = settings.window || null;
        const moduleElement = settings.moduleElement || null;
        const setStatus = settings.setStatus;
        const moduleRoots = settings.moduleRoots || {};

        if (!moduleElement || typeof moduleElement.querySelector !== "function") {
            throw new Error("Не удалось инициализировать модуль SLA: не найден корневой элемент страницы.");
        }

        if (typeof setStatus !== "function") {
            throw new Error("Не удалось инициализировать модуль SLA: функция setStatus не задана.");
        }

        runtimeHelpers.ensureModuleRoots(moduleRoots);
        const fetchImpl = runtimeHelpers.resolveFetchImpl(settings, hostWindow);

        if (typeof fetchImpl !== "function") {
            throw new Error("Не удалось инициализировать модуль SLA: fetch API недоступен.");
        }

        const controls = runtimeHelpers.resolveControls(moduleElement);
        const helpersRoot = moduleRoots.helpersRoot;
        const apiRoot = moduleRoots.apiRoot;
        const rulesRoot = moduleRoots.rulesRoot;
        const violationsRoot = moduleRoots.violationsRoot;

        const helpers = helpersRoot.createHelpers();
        const api = apiRoot.createApiClient(runtimeHelpers.createApiOptions(moduleElement, fetchImpl, helpers.parseApiError));

        let rules = [];

        initialize().catch(function (error) {
            setStatus("Ошибка инициализации SLA: " + helpers.getErrorMessage(error), true);
        });

        async function initialize() {
            bindEvents();
            await Promise.all([loadRules(), loadViolations()]);
            setStatus("SLA загружен.");
        }

        function bindEvents() {
            controls.addRuleButton.addEventListener("click", function () {
                rules.push(rulesRoot.createDraftRule());
                renderRules();
            });

            controls.saveRulesButton.addEventListener("click", async function () {
                try {
                    setStatus("Сохраняем правила SLA...");
                    rules = await api.saveRules(collectRulesFromForm());
                    renderRules();
                    setStatus("Правила SLA сохранены.");
                } catch (error) {
                    setStatus("Ошибка сохранения правил SLA: " + helpers.getErrorMessage(error), true);
                }
            });

            controls.reloadRulesButton.addEventListener("click", function () {
                loadRules().catch(function (error) {
                    setStatus("Ошибка загрузки правил SLA: " + helpers.getErrorMessage(error), true);
                });
            });

            controls.runButton.addEventListener("click", async function () {
                controls.runButton.disabled = true;
                try {
                    setStatus("Запущен цикл SLA-мониторинга...");
                    const result = await api.runMonitoring(true);
                    await loadViolations();
                    setStatus(runtimeHelpers.formatRunMonitoringStatus(result));
                } catch (error) {
                    setStatus("Ошибка SLA-мониторинга: " + helpers.getErrorMessage(error), true);
                } finally {
                    controls.runButton.disabled = false;
                }
            });

            controls.refreshViolationsButton.addEventListener("click", function () {
                loadViolations().catch(function (error) {
                    setStatus("Ошибка обновления нарушений SLA: " + helpers.getErrorMessage(error), true);
                });
            });

            controls.includeResolvedInput.addEventListener("change", function () {
                loadViolations().catch(function (error) {
                    setStatus("Ошибка фильтра нарушений SLA: " + helpers.getErrorMessage(error), true);
                });
            });

            controls.rulesBody.addEventListener("click", function (event) {
                const button = event.target.closest("[data-remove-rule-index]");
                if (!button) {
                    return;
                }

                const index = Number(button.getAttribute("data-remove-rule-index"));
                if (Number.isNaN(index)) {
                    return;
                }

                rules.splice(index, 1);
                renderRules();
            });

            controls.violationsBody.addEventListener("click", function (event) {
                const button = event.target.closest("[data-save-reason-id]");
                if (!button) {
                    return;
                }

                const violationId = button.getAttribute("data-save-reason-id");
                if (!violationId) {
                    return;
                }

                saveViolationReason(violationId).catch(function (error) {
                    setStatus("Ошибка сохранения причины SLA: " + helpers.getErrorMessage(error), true);
                });
            });
        }

        async function loadRules() {
            setStatus("Загрузка правил SLA...");
            rules = await api.getRules();
            renderRules();
        }

        async function loadViolations() {
            setStatus("Загрузка нарушений SLA...");
            const includeResolved = !!controls.includeResolvedInput.checked;
            const violations = await api.getViolations(includeResolved);
            renderViolations(violations);
        }

        function renderRules() {
            controls.rulesBody.innerHTML = rulesRoot.renderRulesMarkup(rules, helpers);
        }

        function renderViolations(violations) {
            controls.violationsBody.innerHTML = violationsRoot.renderViolationsMarkup(violations, helpers);
        }

        function collectRulesFromForm() {
            return rulesRoot.collectRulesFromRows(Array.from(controls.rulesBody.querySelectorAll("tr")));
        }

        async function saveViolationReason(violationId) {
            const row = controls.violationsBody.querySelector("tr[data-violation-id=\"" + helpers.cssEscape(violationId) + "\"]");
            if (!row) {
                return;
            }

            const payload = violationsRoot.buildViolationReasonPayload(row);
            await api.saveViolationReason(violationId, payload);
            setStatus("Причина нарушения SLA обновлена.");
        }

        return {
            loadRules: loadRules,
            loadViolations: loadViolations
        };
    }

    const exportsObject = {
        initializeSlaPage: initializeSlaPage
    };

    if (typeof window !== "undefined") {
        window.SlaPageRuntime = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
