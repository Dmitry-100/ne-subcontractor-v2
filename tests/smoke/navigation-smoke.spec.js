"use strict";

const { test, expect } = require("@playwright/test");

const SMOKE_CONTRACT_PREFIX = "SMOKE-READONLY";

function buildApiError(prefix, statusCode, bodyText) {
    const details = bodyText ? ` ${bodyText}` : "";
    return new Error(`${prefix} (HTTP ${statusCode}).${details}`);
}

async function parseJsonSafe(response) {
    const text = await response.text();
    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

async function readContractsBySearch(request, search) {
    const response = await request.get(`/api/contracts?search=${encodeURIComponent(search)}`);
    if (!response.ok()) {
        throw buildApiError("Не удалось загрузить список договоров", response.status(), await response.text());
    }

    const payload = await parseJsonSafe(response);
    return Array.isArray(payload) ? payload : [];
}

async function readContractors(request) {
    const response = await request.get("/api/contractors");
    if (!response.ok()) {
        throw buildApiError("Не удалось загрузить список подрядчиков", response.status(), await response.text());
    }

    const payload = await parseJsonSafe(response);
    return Array.isArray(payload) ? payload : [];
}

async function trySeedViaDemoEndpoint(request) {
    const response = await request.post("/api/demo/contracts/smoke-seed");
    if (response.ok()) {
        return true;
    }

    if (response.status() === 404 || response.status() === 405) {
        return false;
    }

    throw buildApiError(
        "Не удалось выполнить подготовку smoke-данных через demo endpoint",
        response.status(),
        await response.text());
}

async function createProject(request, token) {
    const response = await request.post("/api/projects", {
        data: {
            code: `SMK-PRJ-${token}`,
            name: `Smoke Project ${token}`
        }
    });

    if (!response.ok()) {
        throw buildApiError("Не удалось создать проект для smoke-данных", response.status(), await response.text());
    }

    const payload = await parseJsonSafe(response);
    if (!payload || !payload.id) {
        throw new Error("API проекта вернул пустой payload без id.");
    }

    return payload;
}

async function createLot(request, projectId, token) {
    const response = await request.post("/api/lots", {
        data: {
            code: `SMK-LOT-${token}`,
            name: `Smoke Lot ${token}`,
            items: [
                {
                    projectId: projectId,
                    objectWbs: "SMK.001",
                    disciplineCode: "PIPING",
                    manHours: 120
                }
            ]
        }
    });

    if (!response.ok()) {
        throw buildApiError("Не удалось создать лот для smoke-данных", response.status(), await response.text());
    }

    const payload = await parseJsonSafe(response);
    if (!payload || !payload.id) {
        throw new Error("API лота вернул пустой payload без id.");
    }

    return payload;
}

async function transitionLotToInProcurement(request, lotId) {
    const response = await request.post(`/api/lots/${lotId}/transition`, {
        data: {
            targetStatus: "InProcurement",
            reason: null
        }
    });

    if (!response.ok()) {
        throw buildApiError("Не удалось перевести лот в статус InProcurement", response.status(), await response.text());
    }
}

async function createProcedure(request, lotId, token) {
    const response = await request.post("/api/procedures", {
        data: {
            lotId: lotId,
            purchaseTypeCode: "SMOKE",
            objectName: `Smoke Object ${token}`,
            workScope: "Smoke Work Scope",
            customerName: "Smoke Customer",
            leadOfficeCode: "SMK",
            analyticsLevel1Code: "L1",
            analyticsLevel2Code: "L2",
            analyticsLevel3Code: "L3",
            analyticsLevel4Code: "L4",
            analyticsLevel5Code: "L5",
            approvalMode: "External",
            containsConfidentialInfo: false,
            requiresTechnicalNegotiations: false
        }
    });

    if (!response.ok()) {
        throw buildApiError("Не удалось создать процедуру для smoke-данных", response.status(), await response.text());
    }

    const payload = await parseJsonSafe(response);
    if (!payload || !payload.id) {
        throw new Error("API процедуры вернул пустой payload без id.");
    }

    return payload;
}

async function transitionProcedureToDecisionMade(request, procedureId) {
    const targetStatuses = [
        "DocumentsPreparation",
        "OnApproval",
        "Sent",
        "OffersReceived",
        "DecisionMade"
    ];

    for (const status of targetStatuses) {
        const response = await request.post(`/api/procedures/${procedureId}/transition`, {
            data: {
                targetStatus: status,
                reason: null
            }
        });

        if (!response.ok()) {
            throw buildApiError(`Не удалось перевести процедуру в статус ${status}`, response.status(), await response.text());
        }
    }
}

async function createContractor(request, token) {
    const innSuffix = String(Date.now()).slice(-8);
    const inn = `77${innSuffix}`;
    const response = await request.post("/api/contractors", {
        data: {
            inn: inn,
            name: `Smoke Contractor ${token}`,
            city: "Москва",
            contactName: "Smoke User",
            phone: "+70000000000",
            email: `smoke-${token.toLowerCase()}@test.local`,
            capacityHours: 160,
            currentRating: 1.0,
            currentLoadPercent: 0,
            reliabilityClass: "New",
            status: "Active",
            disciplineCodes: ["PIPING"]
        }
    });

    if (!response.ok()) {
        throw buildApiError("Не удалось создать подрядчика для smoke-данных", response.status(), await response.text());
    }

    const payload = await parseJsonSafe(response);
    if (!payload || !payload.id) {
        throw new Error("API подрядчика вернул пустой payload без id.");
    }

    return payload;
}

async function ensureSmokeContractorData(request) {
    const existing = await readContractors(request);
    if (existing.length > 0) {
        return;
    }

    const token = String(Date.now());
    await createContractor(request, token);
}

async function createContract(request, lotId, procedureId, contractorId, token) {
    const response = await request.post("/api/contracts", {
        data: {
            lotId: lotId,
            procedureId: procedureId,
            contractorId: contractorId,
            contractNumber: `${SMOKE_CONTRACT_PREFIX}-${token}`,
            amountWithoutVat: 1000,
            vatAmount: 200,
            totalAmount: 1200,
            status: "Draft"
        }
    });

    if (!response.ok()) {
        throw buildApiError("Не удалось создать договор для smoke-данных", response.status(), await response.text());
    }
}

async function ensureSmokeContractData(request) {
    const existing = await readContractsBySearch(request, SMOKE_CONTRACT_PREFIX);
    if (existing.length > 0) {
        return;
    }

    const endpointSeeded = await trySeedViaDemoEndpoint(request);
    if (endpointSeeded) {
        return;
    }

    const token = String(Date.now());
    const project = await createProject(request, token);
    const lot = await createLot(request, project.id, token);
    await transitionLotToInProcurement(request, lot.id);

    const procedure = await createProcedure(request, lot.id, token);
    await transitionProcedureToDecisionMade(request, procedure.id);

    const contractor = await createContractor(request, token);
    await createContract(request, lot.id, procedure.id, contractor.id, token);
}

async function waitForGridRows(page, timeoutMs) {
    const rows = page.locator("[data-contracts-grid] .dx-datagrid-rowsview .dx-data-row");
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const count = await rows.count();
        if (count > 0) {
            return count;
        }

        await page.waitForTimeout(500);
    }

    return 0;
}

async function waitForRows(page, selector, timeoutMs) {
    const rows = page.locator(`${selector} .dx-datagrid-rowsview .dx-data-row`);
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const count = await rows.count();
        if (count > 0) {
            return count;
        }

        await page.waitForTimeout(500);
    }

    return 0;
}

function shouldIgnoreConsoleError(text) {
    const message = String(text || "");
    if (!message) {
        return true;
    }

    // Browser can request favicon even when it is intentionally absent.
    if (/favicon\.ico/i.test(message) && /404|not found/i.test(message)) {
        return true;
    }

    // External static resources can intermittently timeout in local/demo environments.
    // We keep app/runtime checks strict and ignore only browser network-noise class errors.
    if (/failed to load resource:\s*net::err_[a-z0-9_]+/i.test(message)) {
        return true;
    }

    return false;
}

function createBrowserErrorCollector(page) {
    const consoleErrors = [];
    const pageErrors = [];

    page.on("console", message => {
        if (message.type() !== "error") {
            return;
        }

        consoleErrors.push(message.text());
    });

    page.on("pageerror", error => {
        pageErrors.push(error && error.message ? error.message : String(error));
    });

    return {
        clear: function () {
            consoleErrors.length = 0;
            pageErrors.length = 0;
        },
        getErrors: function () {
            return {
                consoleErrors: consoleErrors.filter(message => !shouldIgnoreConsoleError(message)),
                pageErrors: pageErrors.slice()
            };
        }
    };
}

function toFiniteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function clampPercent(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }

    if (value < 0) {
        return 0;
    }

    if (value > 100) {
        return 100;
    }

    return value;
}

function formatCompactPercent(value) {
    const normalized = clampPercent(value);
    if (normalized >= 10 || normalized === 0) {
        return `${normalized.toFixed(0)}%`;
    }

    return `${normalized.toFixed(1)}%`;
}

function formatCompactMoney(value) {
    const numeric = toFiniteNumber(value);
    if (numeric === null) {
        return "0";
    }

    const absolute = Math.abs(numeric);
    if (absolute >= 1_000_000_000) {
        return `${(numeric / 1_000_000_000).toFixed(2).replace(".", ",")} млрд`;
    }

    if (absolute >= 1_000_000) {
        return `${(numeric / 1_000_000).toFixed(2).replace(".", ",")} млн`;
    }

    if (absolute >= 1_000) {
        return `${(numeric / 1_000).toFixed(1).replace(".", ",")} тыс`;
    }

    return numeric.toLocaleString("ru-RU", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function normalizeText(value) {
    return String(value || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function toMetricNumber(value, fallback = 0) {
    const number = toFiniteNumber(value);
    return number === null ? fallback : number;
}

function readLotCount(payload, status) {
    const safePayload = payload || {};
    const lotStatuses = Array.isArray(safePayload.lotStatusCounters)
        ? safePayload.lotStatusCounters
        : (Array.isArray(safePayload.lotFunnel) ? safePayload.lotFunnel : []);

    const item = lotStatuses.find(function (row) {
        return row && String(row.status || "").toLowerCase() === status.toLowerCase();
    });

    return item ? toMetricNumber(item.count, 0) : 0;
}

function readAnalyticsExpectedValues(payload) {
    const safePayload = payload || {};
    const contractorLoad = safePayload.contractorLoad || {};
    const sla = safePayload.sla || {};
    const contractingAmounts = safePayload.contractingAmounts || {};
    const mdrProgress = safePayload.mdrProgress || {};
    const subcontractingShare = safePayload.subcontractingShare || {};

    const contractorTotalCount = toMetricNumber(
        safePayload.contractorTotalCount ?? contractorLoad.activeContractors,
        0);
    const overloadedContractorCount = toMetricNumber(
        safePayload.overloadedContractorCount ?? contractorLoad.overloadedContractors,
        0);
    const overloadShare = contractorTotalCount > 0
        ? (overloadedContractorCount / contractorTotalCount) * 100
        : 0;

    const averageLoad = toFiniteNumber(safePayload.averageContractorLoadPercent ?? contractorLoad.averageLoadPercent);
    const averageRating = toFiniteNumber(safePayload.averageContractorRating ?? contractorLoad.averageRating);
    const mdrCoverage = toFiniteNumber(safePayload.mdrFactCoveragePercent ?? mdrProgress.factCoveragePercent);
    const subcontracting = toFiniteNumber(safePayload.subcontractingSharePercent ?? subcontractingShare.sharePercent);

    return {
        lotDraft: String(readLotCount(safePayload, "Draft")),
        lotInProcurement: String(readLotCount(safePayload, "InProcurement")),
        lotContracted: String(readLotCount(safePayload, "Contracted")),
        overloadShare: formatCompactPercent(overloadShare),
        contractorLoadMeta: `${overloadedContractorCount} из ${contractorTotalCount}`,
        averageLoad: averageLoad === null ? "н/д" : formatCompactPercent(averageLoad),
        averageRating: averageRating === null ? "н/д" : averageRating.toFixed(3),
        mdrCoverage: mdrCoverage === null ? "н/д" : formatCompactPercent(mdrCoverage),
        subcontractingShare: subcontracting === null ? "н/д" : formatCompactPercent(subcontracting),
        slaWarnings: String(toMetricNumber(safePayload.slaOpenWarningsCount ?? sla.openWarnings, 0)),
        slaOverdue: String(toMetricNumber(safePayload.slaOpenOverduesCount ?? sla.openOverdue, 0)),
        contractingActiveAmount: formatCompactMoney(safePayload.totalActiveContractAmount ?? contractingAmounts.signedAndActiveTotalAmount),
        contractingClosedAmount: formatCompactMoney(safePayload.totalClosedContractAmount ?? contractingAmounts.closedTotalAmount)
    };
}

test("core pages render in Russian and navigation between sections works", async ({ page }) => {
    const dashboardResponse = await page.goto("/");
    expect(dashboardResponse && dashboardResponse.ok()).toBeTruthy();

    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.getByRole("heading", { level: 1, name: "Управление субподрядом" })).toBeVisible();

    const lotsLink = page.locator("header.app-header").getByRole("link", { name: "Лоты" });
    await expect(lotsLink).toBeVisible();
    await lotsLink.click();

    await expect(page).toHaveURL(/\/Home\/Lots$/);
    await expect(page.getByRole("heading", { level: 1, name: "Лоты" })).toBeVisible();
    await expect(page.locator("details.field-help summary[aria-label='Пояснение к полю']").first()).toBeVisible();

    const proceduresLink = page.locator("header.app-header").getByRole("link", { name: "Процедуры" });
    await expect(proceduresLink).toBeVisible();
    await proceduresLink.click();

    await expect(page).toHaveURL(/\/Home\/Procedures$/);
    await expect(page.getByRole("heading", { level: 1, name: "Закупочные процедуры" })).toBeVisible();
    await expect(page.locator("details.field-help summary[aria-label='Пояснение к полю']").first()).toBeVisible();

    const contractsLink = page.locator("header.app-header").getByRole("link", { name: "Договоры" });
    await expect(contractsLink).toBeVisible();
    await contractsLink.click();

    await expect(page).toHaveURL(/\/Home\/Contracts$/);
    await expect(page.getByRole("heading", { level: 1, name: "Договоры" })).toBeVisible();
    await expect(page.locator("details.field-help summary[aria-label='Пояснение к полю']").first()).toBeVisible();

    const contractorsLink = page.locator("header.app-header").getByRole("link", { name: "Подрядчики" });
    await expect(contractorsLink).toBeVisible();
    await contractorsLink.click();

    await expect(page).toHaveURL(/\/Home\/Contractors$/);
    await expect(page.getByRole("heading", { level: 1, name: "Подрядчики" })).toBeVisible();
    await expect(page.locator("details.field-help summary[aria-label='Пояснение к полю']").first()).toBeVisible();

    const projectsLink = page.locator("header.app-header").getByRole("link", { name: "Проекты" });
    await expect(projectsLink).toBeVisible();
    await projectsLink.click();

    await expect(page).toHaveURL(/\/Home\/Projects$/);
    await expect(page.getByRole("heading", { level: 1, name: "Проекты" })).toBeVisible();
    await expect(page.locator("[data-projects-module]")).toBeVisible();
    await expect(page.locator("[data-projects-grid]")).toBeVisible();

    const importsLink = page.locator("header.app-header").getByRole("link", { name: "Импорт" });
    await expect(importsLink).toBeVisible();
    await importsLink.click();

    await expect(page).toHaveURL(/\/Home\/Imports$/);
    await expect(page.getByRole("heading", { level: 1, name: "Импорт исходных данных" })).toBeVisible();
    await expect(page.locator("[data-imports-module]")).toBeVisible();
    await expect(page.locator("[data-imports-file]")).toBeVisible();
    await expect(page.locator("[data-imports-batches-table]")).toHaveCount(1);
    await expect(page.locator("[data-imports-xml-table]")).toHaveCount(1);
    await expect(page.locator("details.field-help summary[aria-label='Пояснение к полю']").first()).toBeVisible();
});

test("core pages initialize without browser runtime errors", async ({ page }) => {
    const collector = createBrowserErrorCollector(page);
    const routes = [
        "/",
        "/Home/Projects",
        "/Home/Lots",
        "/Home/Procedures",
        "/Home/Contracts",
        "/Home/Contractors",
        "/Home/Imports",
        "/Home/Sla",
        "/Home/Admin"
    ];
    const initErrorMarkersByRoute = {
        "/": [
            "Не удалось инициализировать модуль дашборда",
            "Ошибка инициализации дашборда"
        ],
        "/Home/Projects": [
            "Не удалось инициализировать модуль проектов",
            "Ошибка инициализации проектов"
        ],
        "/Home/Lots": [
            "Не удалось инициализировать",
            "Ошибка инициализации лотов"
        ],
        "/Home/Procedures": [
            "Не удалось инициализировать страницу процедур",
            "Procedures services require"
        ],
        "/Home/Contracts": [
            "Не удалось инициализировать",
            "Ошибка инициализации договоров"
        ],
        "/Home/Contractors": [
            "Не удалось инициализировать",
            "Ошибка инициализации подрядчиков"
        ],
        "/Home/Imports": [
            "Не удалось инициализировать модуль импорта",
            "Не удалось инициализировать XML-очередь"
        ],
        "/Home/Sla": [
            "Не удалось инициализировать модуль SLA",
            "Ошибка инициализации SLA"
        ],
        "/Home/Admin": [
            "Не удалось инициализировать модуль администрирования",
            "Ошибка инициализации администрирования"
        ]
    };

    const failures = [];

    for (const route of routes) {
        collector.clear();

        const response = await page.goto(route);
        if (!response || !response.ok()) {
            const status = response ? response.status() : "NO_RESPONSE";
            failures.push(`- ${route}: HTTP ${status}`);
            continue;
        }

        const main = page.locator("main");
        await expect(main).toBeVisible();

        const markers = initErrorMarkersByRoute[route] || [];
        for (const marker of markers) {
            await expect(main).not.toContainText(marker);
        }

        await page.waitForTimeout(250);

        const errors = collector.getErrors();
        if (errors.consoleErrors.length > 0 || errors.pageErrors.length > 0) {
            failures.push([
                `- ${route}:`,
                ...errors.pageErrors.map(error => `  pageerror: ${error}`),
                ...errors.consoleErrors.map(error => `  console.error: ${error}`)
            ].join("\n"));
        }
    }

    expect(
        failures,
        `Обнаружены browser runtime ошибки на страницах:\n${failures.join("\n")}`
    ).toEqual([]);
});

test("lots page renders core widgets for registry and workflow actions", async ({ page }) => {
    const response = await page.goto("/Home/Lots");
    expect(response && response.ok()).toBeTruthy();

    await expect(page.locator("[data-lots-module]")).toBeVisible();
    await expect(page.locator("[data-lots-grid]")).toBeVisible();
    await expect(page.locator("[data-lots-history-grid]")).toBeVisible();
    await expect(page.locator("[data-lots-next]")).toBeVisible();
    await expect(page.locator("[data-lots-rollback]")).toBeVisible();
    await expect(page.locator("[data-lots-history-refresh]")).toBeVisible();
});

test("projects page renders core widgets for projects registry", async ({ page }) => {
    const response = await page.goto("/Home/Projects");
    expect(response && response.ok()).toBeTruthy();

    await expect(page.locator("[data-projects-module]")).toBeVisible();
    await expect(page.locator("[data-projects-grid]")).toBeVisible();
    await expect(page.locator("[data-projects-status]")).toBeVisible();
});

test("procedures page initializes runtime without bootstrap error", async ({ page }) => {
    const response = await page.goto("/Home/Procedures");
    expect(response && response.ok()).toBeTruthy();

    const status = page.locator("[data-procedures-status]");
    await expect(status).toBeVisible();
    await expect(status).not.toContainText("Не удалось инициализировать страницу процедур");
    await expect(status).not.toContainText("Procedures services require");
});

test("admin page renders core widgets and supports search/reference controls", async ({ page }) => {
    const response = await page.goto("/Home/Admin");
    expect(response && response.ok()).toBeTruthy();

    await expect(page.locator("[data-admin-module]")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Администрирование" })).toBeVisible();

    await expect(page.locator("[data-admin-users-grid]")).toBeVisible();
    await expect(page.locator("[data-admin-roles-grid]")).toBeVisible();
    await expect(page.locator("[data-admin-reference-grid]")).toBeVisible();
    await expect(page.locator("[data-admin-users-status]")).toContainText("Загружено пользователей:");

    const usersSearchInput = page.locator("[data-admin-users-search]");
    await usersSearchInput.fill("ivanov");
    await page.locator("[data-admin-users-search-apply]").click();
    await expect(usersSearchInput).toHaveValue("ivanov");

    await page.locator("[data-admin-users-search-reset]").click();
    await expect(usersSearchInput).toHaveValue("");

    const referenceTypeCodeInput = page.locator("[data-admin-reference-type-code]");
    const referenceActiveOnlyCheckbox = page.locator("[data-admin-reference-active-only]");
    const referenceOpenApiLink = page.locator("[data-admin-reference-open-api]");

    await referenceTypeCodeInput.fill("approval_mode");
    await page.locator("[data-admin-reference-load]").click();
    await expect(referenceOpenApiLink).toHaveAttribute("href", /APPROVAL_MODE\/items\?activeOnly=false$/);

    await referenceActiveOnlyCheckbox.check();
    await expect(referenceOpenApiLink).toHaveAttribute("href", /APPROVAL_MODE\/items\?activeOnly=true$/);
});

test("sla page renders core widgets and supports violation refresh flow", async ({ page }) => {
    const response = await page.goto("/Home/Sla");
    expect(response && response.ok()).toBeTruthy();

    await expect(page.locator("[data-sla-module]")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Контроль сроков и уведомления" })).toBeVisible();
    await expect(page.locator("[data-sla-rules-body]")).toBeVisible();
    await expect(page.locator("[data-sla-violations-body]")).toBeVisible();
    await expect(page.locator("[data-sla-status]")).toContainText("SLA загружен.");

    await page.locator("[data-sla-include-resolved]").check();
    await page.locator("[data-sla-refresh-violations]").click();
    await expect(page.locator("[data-sla-status]")).toContainText("Загрузка нарушений SLA...");
});

test("imports page parses CSV and queues source-data batch", async ({ page }) => {
    const response = await page.goto("/Home/Imports");
    expect(response && response.ok()).toBeTruthy();

    await expect(page.locator("[data-imports-module]")).toBeVisible();

    const csvContent = [
        "projectCode;objectWbs;disciplineCode;manHours;plannedStartDate;plannedFinishDate",
        "SMK-001;OBJ.001;PIPING;120;2026-04-09;2026-04-20"
    ].join("\n");

    await page.locator("[data-imports-file]").setInputFiles({
        name: "smoke-import.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csvContent, "utf8")
    });

    await page.locator("[data-imports-parse]").click();

    await expect(page.locator("[data-imports-preview-wrap]")).toBeVisible();
    await expect(page.locator("[data-imports-upload]")).toBeEnabled();
    await expect(page.locator("[data-imports-upload-status]")).toContainText("Файл разобран");

    await page.locator("[data-imports-upload]").click();

    await expect(page.locator("[data-imports-upload-status]")).toContainText("Пакет поставлен в очередь:");
    await expect(page.locator("[data-imports-batches-status]")).toContainText("Загружено пакетов:");
});

test("dashboard task action links are reachable", async ({ page }) => {
    const dashboardResponse = await page.goto("/");
    expect(dashboardResponse && dashboardResponse.ok()).toBeTruthy();

    await expect(page.locator("[data-dashboard-module]")).toBeVisible();
    await expect(page.locator("[data-dashboard-status]")).toContainText("Дашборд загружен.");

    const summaryResponse = await page.request.get("/api/dashboard/summary");
    if (!summaryResponse.ok()) {
        throw buildApiError("Не удалось загрузить dashboard summary для smoke-проверки", summaryResponse.status(), await summaryResponse.text());
    }

    const summaryPayload = await parseJsonSafe(summaryResponse);
    const tasks = Array.isArray(summaryPayload && summaryPayload.myTasks) ? summaryPayload.myTasks : [];
    const actionableTasks = tasks.filter(function (task) {
        return task && typeof task.actionUrl === "string" && task.actionUrl.trim().startsWith("/");
    });

    if (actionableTasks.length === 0) {
        if (process.env.CI) {
            throw new Error("Dashboard summary не содержит actionUrl задач для smoke-проверки переходов.");
        }

        test.skip(true, "В окружении нет задач с actionUrl для проверки переходов по дашборду.");
    }

    const tasksDisclosure = page.locator(".dashboard-disclosure--tasks");
    await expect(tasksDisclosure).toBeVisible();
    const tasksHint = tasksDisclosure.locator("summary .dashboard-disclosure__hint");
    if ((await tasksHint.textContent() || "").trim().toLowerCase() !== "свернуть") {
        await tasksDisclosure.locator("summary").click();
        await expect(tasksHint).toHaveText(/свернуть/i);
    }

    const firstTaskLink = page.locator("[data-dashboard-tasks] a.dashboard-task__link").first();
    await expect(firstTaskLink).toBeVisible();

    const href = await firstTaskLink.getAttribute("href");
    if (!href || !href.trim()) {
        throw new Error("Ссылка задачи на дашборде не содержит href.");
    }

    const targetResponse = await page.goto(href);
    expect(targetResponse && targetResponse.ok()).toBeTruthy();
    await expect(page.locator("main")).toBeVisible();
});

test("dashboard disclosure sections toggle hint labels and contractor-rating menu title", async ({ page }) => {
    const dashboardResponse = await page.goto("/");
    expect(dashboardResponse && dashboardResponse.ok()).toBeTruthy();

    await expect(page.locator("[data-dashboard-module]")).toBeVisible();

    const disclosureHints = page.locator(".dashboard-disclosure > summary .dashboard-disclosure__hint");
    const totalHints = await disclosureHints.count();
    expect(totalHints).toBeGreaterThan(0);

    for (let index = 0; index < totalHints; index += 1) {
        await expect(disclosureHints.nth(index)).toHaveText(/развернуть/i);
    }

    const importDisclosure = page.locator(".dashboard-disclosure--import");
    await expect(importDisclosure).toBeVisible();
    await importDisclosure.locator("summary").click();
    await expect(importDisclosure.locator("summary .dashboard-disclosure__hint")).toHaveText(/свернуть/i);
    await importDisclosure.locator("summary").click();
    await expect(importDisclosure.locator("summary .dashboard-disclosure__hint")).toHaveText(/развернуть/i);

    const contractorRatingSummaryTitle = page.locator(".dashboard-disclosure--analytics > summary span").first();
    await expect(contractorRatingSummaryTitle).toHaveText("Рейтинг подрядчиков");
});

test("dashboard analytics and KPI infographics render non-empty values", async ({ page }) => {
    const dashboardResponse = await page.goto("/");
    expect(dashboardResponse && dashboardResponse.ok()).toBeTruthy();

    await expect(page.locator("[data-dashboard-module]")).toBeVisible();
    await expect(page.locator("[data-dashboard-status]")).toContainText("Дашборд загружен.");
    await expect(page.locator("[data-dashboard-analytics-status]")).toContainText("Аналитический контур обновлён.");

    const kpiValues = [
        page.locator('[data-dashboard-kpi="procedureCompletionRatePercent"]'),
        page.locator('[data-dashboard-kpi="contractClosureRatePercent"]'),
        page.locator('[data-dashboard-kpi="milestoneCompletionRatePercent"]')
    ];

    for (let index = 0; index < kpiValues.length; index += 1) {
        const kpi = kpiValues[index];
        await expect(kpi).toBeVisible();
        const text = ((await kpi.textContent()) || "").trim();
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toBe("н/д");
    }

    await expect(page.locator('[data-dashboard-overdue="proceduresCount"]')).not.toHaveText("0");
    await expect(page.locator('[data-dashboard-overdue-rate="procedures"]')).toContainText("%");

    const importDisclosure = page.locator(".dashboard-disclosure--import");
    await expect(importDisclosure).toBeVisible();
    await importDisclosure.locator("summary").click();
    await expect(importDisclosure.locator("summary .dashboard-disclosure__hint")).toHaveText(/свернуть/i);
    await expect(importDisclosure.locator("[data-dashboard-import='sourceValidatedWithErrorsCount']")).toBeVisible();
});

test("dashboard analytics cards reflect analytics api payload", async ({ page }) => {
    const dashboardResponse = await page.goto("/");
    expect(dashboardResponse && dashboardResponse.ok()).toBeTruthy();

    await expect(page.locator("[data-dashboard-module]")).toBeVisible();
    await expect(page.locator("[data-dashboard-analytics-status]")).toContainText("Аналитический контур обновлён.");

    const analyticsResponse = await page.request.get("/api/analytics/kpi");
    if (!analyticsResponse.ok()) {
        throw buildApiError("Не удалось загрузить analytics payload для smoke-контракта", analyticsResponse.status(), await analyticsResponse.text());
    }

    const analyticsPayload = await parseJsonSafe(analyticsResponse);
    const expected = readAnalyticsExpectedValues(analyticsPayload || {});

    await expect(page.locator('[data-dashboard-analytics-highlight="lotDraft"]')).toHaveText(expected.lotDraft);
    await expect(page.locator('[data-dashboard-analytics-highlight="lotInProcurement"]')).toHaveText(expected.lotInProcurement);
    await expect(page.locator('[data-dashboard-analytics-highlight="lotContracted"]')).toHaveText(expected.lotContracted);

    await expect(page.locator('[data-dashboard-analytics-highlight="overloadShare"]')).toHaveText(expected.overloadShare);
    await expect(page.locator('[data-dashboard-analytics-highlight="contractorLoadMeta"]')).toHaveText(expected.contractorLoadMeta);
    await expect(page.locator('[data-dashboard-analytics-highlight="averageLoad"]')).toHaveText(expected.averageLoad);
    await expect(page.locator('[data-dashboard-analytics-highlight="averageRating"]')).toHaveText(expected.averageRating);
    await expect(page.locator('[data-dashboard-analytics-highlight="mdrCoverage"]')).toHaveText(expected.mdrCoverage);
    await expect(page.locator('[data-dashboard-analytics-highlight="subcontractingShare"]')).toHaveText(expected.subcontractingShare);
    await expect(page.locator('[data-dashboard-analytics-highlight="slaWarnings"]')).toHaveText(expected.slaWarnings);
    await expect(page.locator('[data-dashboard-analytics-highlight="slaOverdue"]')).toHaveText(expected.slaOverdue);

    const contractingActiveText = await page.locator('[data-dashboard-analytics-highlight="contractingActiveAmount"]').textContent();
    const contractingClosedText = await page.locator('[data-dashboard-analytics-highlight="contractingClosedAmount"]').textContent();
    expect(normalizeText(contractingActiveText)).toBe(normalizeText(expected.contractingActiveAmount));
    expect(normalizeText(contractingClosedText)).toBe(normalizeText(expected.contractingClosedAmount));
});

test("contracts page renders core widgets for registry, workflow, execution and monitoring", async ({ page }) => {
    const response = await page.goto("/Home/Contracts");
    expect(response && response.ok()).toBeTruthy();

    await expect(page.locator("[data-contracts-module]")).toBeVisible();
    await expect(page.locator("[data-contracts-grid]")).toBeVisible();
    await expect(page.locator("[data-contracts-history-grid]")).toBeVisible();
    await expect(page.locator("[data-contracts-execution-grid]")).toBeVisible();
    await expect(page.locator("[data-contracts-monitoring-control-points-grid]")).toBeVisible();
    await expect(page.locator("[data-contracts-monitoring-mdr-cards-grid]")).toBeVisible();
    await expect(page.locator("[data-contracts-monitoring-mdr-rows-grid]")).toBeVisible();

    await expect(page.locator("[data-contracts-apply]")).toBeVisible();
    await expect(page.locator("[data-contracts-draft-create]")).toBeVisible();
    await expect(page.locator("[data-contracts-execution-refresh]")).toBeVisible();
    await expect(page.locator("[data-contracts-monitoring-save]")).toBeVisible();
    await expect(page.locator("[data-contracts-mdr-import-apply]")).toBeVisible();
});

test("contractors page renders rating workspace and enables selection actions", async ({ page }) => {
    const response = await page.goto("/Home/Contractors");
    expect(response && response.ok()).toBeTruthy();

    await expect(page.locator("[data-contractors-module]")).toBeVisible();
    await expect(page.locator("[data-contractors-grid]")).toBeVisible();
    await expect(page.locator("[data-contractors-history-grid]")).toBeVisible();
    await expect(page.locator("[data-contractors-analytics-grid]")).toBeVisible();
    await expect(page.locator("[data-contractors-save-model]")).toBeVisible();
    await expect(page.locator("[data-contractors-recalculate-selected]")).toBeVisible();
    await expect(page.locator("[data-contractors-manual-save]")).toBeVisible();

    let seedError = null;
    let rowsCount = await waitForRows(page, "[data-contractors-grid]", 6_000);
    if (rowsCount === 0) {
        try {
            await ensureSmokeContractorData(page.request);
        } catch (error) {
            seedError = error;
            if (process.env.CI) {
                throw error;
            }
        }

        await page.reload();
        rowsCount = await waitForRows(page, "[data-contractors-grid]", 12_000);
    }

    if (rowsCount === 0 && process.env.CI) {
        const details = seedError ? ` Ошибка сидинга: ${seedError.message}` : "";
        throw new Error(`Smoke contractors сценарий не нашёл строк подрядчиков.${details}`);
    }

    if (rowsCount === 0) {
        const details = seedError ? ` Ошибка сидинга: ${seedError.message}` : "";
        test.skip(true, `В окружении нет подрядчиков для smoke-проверки выбора записи.${details}`);
    }

    const rows = page.locator("[data-contractors-grid] .dx-datagrid-rowsview .dx-data-row");
    await rows.first().click();

    await expect(page.locator("[data-contractors-selected]")).toContainText("Выбран:");
    await expect(page.locator("[data-contractors-recalculate-selected]")).toBeEnabled();
    await expect(page.locator("[data-contractors-manual-save]")).toBeEnabled();
});

test("contracts page updates read-only panels when a registry row is selected", async ({ page }) => {
    const response = await page.goto("/Home/Contracts");
    expect(response && response.ok()).toBeTruthy();

    let seedAttempted = false;
    let seedError = null;
    let rowsCount = await waitForGridRows(page, 6_000);
    if (rowsCount === 0) {
        try {
            await ensureSmokeContractData(page.request);
            seedAttempted = true;
        } catch (error) {
            seedError = error;
            if (process.env.CI) {
                throw error;
            }
        }

        if (seedAttempted) {
            await page.reload();
            rowsCount = await waitForGridRows(page, 15_000);
        }
    }

    if (rowsCount === 0) {
        const details = seedError ? ` Ошибка сидинга: ${seedError.message}` : "";
        throw new Error(`Smoke read-only сценарий не нашёл строк договора после подготовки данных.${details}`);
    }

    const rows = page.locator("[data-contracts-grid] .dx-datagrid-rowsview .dx-data-row");

    await rows.first().click();

    await expect(page.locator("[data-contracts-selected]")).toContainText("Выбрано:");
    await expect(page.locator("[data-contracts-execution-selected]")).toContainText("Исполнение:");
    await expect(page.locator("[data-contracts-monitoring-selected]")).toContainText("Мониторинг:");

    await expect(page.locator("[data-contracts-history-refresh]")).toBeEnabled();
    await expect(page.locator("[data-contracts-execution-refresh]")).toBeEnabled();
    await expect(page.locator("[data-contracts-monitoring-refresh]")).toBeEnabled();

    await page.locator("[data-contracts-history-refresh]").click();
    await expect(page.locator("[data-contracts-transition-status]")).toContainText("Загружено записей истории:");
});
