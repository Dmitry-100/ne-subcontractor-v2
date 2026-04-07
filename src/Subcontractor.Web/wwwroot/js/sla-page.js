(function () {
    const moduleElement = document.querySelector('[data-sla-module]');
    if (!moduleElement) {
        return;
    }

    const rulesApi = moduleElement.dataset.rulesApi || '/api/sla/rules';
    const violationsApi = moduleElement.dataset.violationsApi || '/api/sla/violations';
    const runApi = moduleElement.dataset.runApi || '/api/sla/run';

    const statusElement = moduleElement.querySelector('[data-sla-status]');
    const rulesBody = moduleElement.querySelector('[data-sla-rules-body]');
    const violationsBody = moduleElement.querySelector('[data-sla-violations-body]');

    const includeResolvedInput = moduleElement.querySelector('[data-sla-include-resolved]');
    const runButton = moduleElement.querySelector('[data-sla-run]');
    const refreshViolationsButton = moduleElement.querySelector('[data-sla-refresh-violations]');
    const addRuleButton = moduleElement.querySelector('[data-sla-add-rule]');
    const saveRulesButton = moduleElement.querySelector('[data-sla-save-rules]');
    const reloadRulesButton = moduleElement.querySelector('[data-sla-reload-rules]');

    let rules = [];

    initialize().catch(function (error) {
        setStatus('Ошибка инициализации SLA: ' + (error && error.message ? error.message : String(error)), true);
    });

    async function initialize() {
        bindEvents();
        await Promise.all([loadRules(), loadViolations()]);
        setStatus('SLA загружен.');
    }

    function bindEvents() {
        addRuleButton.addEventListener('click', function () {
            rules.push({
                purchaseTypeCode: '',
                warningDaysBeforeDue: 2,
                isActive: true,
                description: ''
            });
            renderRules();
        });

        saveRulesButton.addEventListener('click', async function () {
            try {
                setStatus('Сохраняем правила SLA...');
                const payload = {
                    items: collectRulesFromForm()
                };

                const response = await fetch(rulesApi, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(await parseApiError(response));
                }

                rules = await response.json();
                renderRules();
                setStatus('Правила SLA сохранены.');
            } catch (error) {
                setStatus('Ошибка сохранения правил SLA: ' + getErrorMessage(error), true);
            }
        });

        reloadRulesButton.addEventListener('click', function () {
            loadRules().catch(function (error) {
                setStatus('Ошибка загрузки правил SLA: ' + getErrorMessage(error), true);
            });
        });

        runButton.addEventListener('click', async function () {
            runButton.disabled = true;
            try {
                setStatus('Запущен цикл SLA-мониторинга...');
                const response = await fetch(runApi + '?sendNotifications=true', {
                    method: 'POST'
                });

                if (!response.ok) {
                    throw new Error(await parseApiError(response));
                }

                const result = await response.json();
                await loadViolations();
                setStatus(
                    'Цикл SLA завершен. Активно: ' +
                    result.activeViolations +
                    ', открыто: ' +
                    result.openViolations +
                    ', отправлено: ' +
                    result.notificationSuccessCount +
                    ', ошибки: ' +
                    result.notificationFailureCount +
                    '.');
            } catch (error) {
                setStatus('Ошибка SLA-мониторинга: ' + getErrorMessage(error), true);
            } finally {
                runButton.disabled = false;
            }
        });

        refreshViolationsButton.addEventListener('click', function () {
            loadViolations().catch(function (error) {
                setStatus('Ошибка обновления нарушений SLA: ' + getErrorMessage(error), true);
            });
        });

        includeResolvedInput.addEventListener('change', function () {
            loadViolations().catch(function (error) {
                setStatus('Ошибка фильтра нарушений SLA: ' + getErrorMessage(error), true);
            });
        });

        rulesBody.addEventListener('click', function (event) {
            const button = event.target.closest('[data-remove-rule-index]');
            if (!button) {
                return;
            }

            const index = Number(button.getAttribute('data-remove-rule-index'));
            if (Number.isNaN(index)) {
                return;
            }

            rules.splice(index, 1);
            renderRules();
        });

        violationsBody.addEventListener('click', function (event) {
            const button = event.target.closest('[data-save-reason-id]');
            if (!button) {
                return;
            }

            const violationId = button.getAttribute('data-save-reason-id');
            if (!violationId) {
                return;
            }

            saveViolationReason(violationId).catch(function (error) {
                setStatus('Ошибка сохранения причины SLA: ' + getErrorMessage(error), true);
            });
        });
    }

    function localizeSeverity(value) {
        const normalized = String(value || '').trim().toLowerCase();
        if (normalized === 'overdue') {
            return 'Просрочка';
        }

        if (normalized === 'warning') {
            return 'Предупреждение';
        }

        return String(value || '');
    }

    async function loadRules() {
        setStatus('Загрузка правил SLA...');
        const response = await fetch(rulesApi);
        if (!response.ok) {
            throw new Error(await parseApiError(response));
        }

        rules = await response.json();
        renderRules();
    }

    async function loadViolations() {
        setStatus('Загрузка нарушений SLA...');
        const includeResolved = includeResolvedInput.checked ? 'true' : 'false';
        const response = await fetch(violationsApi + '?includeResolved=' + includeResolved);
        if (!response.ok) {
            throw new Error(await parseApiError(response));
        }

        const violations = await response.json();
        renderViolations(violations);
    }

    function renderRules() {
        if (rules.length === 0) {
            rulesBody.innerHTML =
                '<tr><td colspan="5">Правила SLA не заданы. Добавьте хотя бы одно правило.</td></tr>';
            return;
        }

        rulesBody.innerHTML = rules
            .map(function (rule, index) {
                return (
                    '<tr>' +
                    '<td><input type="text" data-rule-field="purchaseTypeCode" data-rule-index="' + index + '" value="' + escapeHtml(rule.purchaseTypeCode || '') + '" /></td>' +
                    '<td><input type="number" min="0" max="30" data-rule-field="warningDaysBeforeDue" data-rule-index="' + index + '" value="' + Number(rule.warningDaysBeforeDue || 0) + '" /></td>' +
                    '<td style="text-align:center"><input type="checkbox" data-rule-field="isActive" data-rule-index="' + index + '" ' + (rule.isActive ? 'checked' : '') + ' /></td>' +
                    '<td><input type="text" data-rule-field="description" data-rule-index="' + index + '" value="' + escapeHtml(rule.description || '') + '" /></td>' +
                    '<td><button type="button" class="dashboard-refresh" data-remove-rule-index="' + index + '">Удалить</button></td>' +
                    '</tr>'
                );
            })
            .join('');
    }

    function renderViolations(violations) {
        if (!Array.isArray(violations) || violations.length === 0) {
            violationsBody.innerHTML =
                '<tr><td colspan="8">Открытых нарушений SLA не найдено.</td></tr>';
            return;
        }

        violationsBody.innerHTML = violations
            .map(function (violation) {
                const severityBadgeClass = violation.severity === 'Overdue' ? 'dashboard-task__priority--high' : 'dashboard-task__priority--medium';
                const statusLabel = violation.isResolved ? 'Закрыто' : 'Открыто';
                return (
                    '<tr data-violation-id="' + violation.id + '">' +
                    '<td><span class="dashboard-task__priority ' + severityBadgeClass + '">' + escapeHtml(localizeSeverity(violation.severity)) + '</span></td>' +
                    '<td>' + formatDate(violation.dueDate) + '</td>' +
                    '<td>' + escapeHtml(violation.title || '') + '</td>' +
                    '<td>' + escapeHtml(violation.recipientEmail || '') + '</td>' +
                    '<td><input type="text" data-violation-field="reasonCode" value="' + escapeHtml(violation.reasonCode || '') + '" placeholder="например: DOC_DELAY" /></td>' +
                    '<td><input type="text" data-violation-field="reasonComment" value="' + escapeHtml(violation.reasonComment || '') + '" placeholder="Комментарий" /></td>' +
                    '<td>' + statusLabel + '</td>' +
                    '<td><button type="button" class="dashboard-refresh" data-save-reason-id="' + violation.id + '">Сохранить</button></td>' +
                    '</tr>'
                );
            })
            .join('');
    }

    function collectRulesFromForm() {
        const rows = Array.from(rulesBody.querySelectorAll('tr'));
        return rows
            .map(function (row) {
                const purchaseTypeCode = row.querySelector('[data-rule-field="purchaseTypeCode"]').value || '';
                const warningDaysRaw = row.querySelector('[data-rule-field="warningDaysBeforeDue"]').value || '0';
                const warningDaysBeforeDue = Number(warningDaysRaw);
                const isActive = !!row.querySelector('[data-rule-field="isActive"]').checked;
                const description = row.querySelector('[data-rule-field="description"]').value || '';

                return {
                    purchaseTypeCode: purchaseTypeCode.trim(),
                    warningDaysBeforeDue: Number.isFinite(warningDaysBeforeDue) ? warningDaysBeforeDue : 0,
                    isActive: isActive,
                    description: description.trim() || null
                };
            })
            .filter(function (item) {
                return item.purchaseTypeCode.length > 0;
            });
    }

    async function saveViolationReason(violationId) {
        const row = violationsBody.querySelector('tr[data-violation-id="' + cssEscape(violationId) + '"]');
        if (!row) {
            return;
        }

        const reasonCode = row.querySelector('[data-violation-field="reasonCode"]').value || '';
        const reasonComment = row.querySelector('[data-violation-field="reasonComment"]').value || '';
        const payload = {
            reasonCode: reasonCode.trim(),
            reasonComment: reasonComment.trim() || null
        };

        const response = await fetch(violationsApi + '/' + encodeURIComponent(violationId) + '/reason', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            throw new Error(await parseApiError(response));
        }

        setStatus('Причина нарушения SLA обновлена.');
    }

    function formatDate(value) {
        if (!value) {
            return '';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString('ru-RU');
    }

    async function parseApiError(response) {
        try {
            const payload = await response.json();
            if (payload && payload.detail) {
                return payload.detail;
            }

            if (payload && payload.error) {
                return payload.error;
            }
        } catch (error) {
            return response.status + ' ' + response.statusText;
        }

        return response.status + ' ' + response.statusText;
    }

    function setStatus(text, isError) {
        statusElement.textContent = text;
        statusElement.classList.toggle('dashboard-status--error', !!isError);
    }

    function getErrorMessage(error) {
        return error && error.message ? error.message : String(error);
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function cssEscape(value) {
        if (window.CSS && typeof window.CSS.escape === 'function') {
            return window.CSS.escape(value);
        }

        return String(value).replace(/"/g, '\\"');
    }
})();
