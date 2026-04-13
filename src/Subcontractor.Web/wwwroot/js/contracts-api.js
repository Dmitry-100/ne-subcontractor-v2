"use strict";

(function () {
    function resolveHelpers() {
        if (typeof window !== "undefined" && window.ContractsApiHelpers) {
            return window.ContractsApiHelpers;
        }

        if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            try {
                return require("./contracts-api-helpers.js");
            } catch {
                return null;
            }
        }

        return null;
    }

    function ensureHelperContract(helpers) {
        if (!helpers ||
            typeof helpers.resolveParseErrorBody !== "function" ||
            typeof helpers.encodePathSegment !== "function" ||
            typeof helpers.buildListUrl !== "function" ||
            typeof helpers.request !== "function") {
            throw new Error("contracts-api helpers are not configured.");
        }
    }

    function createClient(options) {
        const helpers = resolveHelpers();
        const endpoint = String(options?.endpoint || "").trim();
        if (!endpoint) {
            throw new Error("Не задан endpoint для contracts-api клиента.");
        }

        ensureHelperContract(helpers);

        const fetchImpl = options?.fetchImpl || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
        if (typeof fetchImpl !== "function") {
            throw new Error("Не задан fetchImpl для contracts-api клиента.");
        }

        const parseErrorBody = helpers.resolveParseErrorBody(options?.parseErrorBody);
        const buildContractPath = function (contractId) {
            const id = helpers.encodePathSegment(contractId, "contractId");
            return `${endpoint}/${id}`;
        };

        return {
            listContracts: function (query) {
                return helpers.request(helpers.buildListUrl(endpoint, query), { method: "GET" }, parseErrorBody, fetchImpl);
            },
            createContract: function (payload) {
                return helpers.request(endpoint, {
                    method: "POST",
                    body: JSON.stringify(payload)
                }, parseErrorBody, fetchImpl);
            },
            updateContract: function (contractId, payload) {
                return helpers.request(buildContractPath(contractId), {
                    method: "PUT",
                    body: JSON.stringify(payload)
                }, parseErrorBody, fetchImpl);
            },
            deleteContract: function (contractId) {
                return helpers.request(buildContractPath(contractId), {
                    method: "DELETE"
                }, parseErrorBody, fetchImpl);
            },
            transitionContract: function (contractId, payload) {
                return helpers.request(`${buildContractPath(contractId)}/transition`, {
                    method: "POST",
                    body: JSON.stringify(payload)
                }, parseErrorBody, fetchImpl);
            },
            createDraftFromProcedure: function (procedureId, payload) {
                const encodedProcedureId = helpers.encodePathSegment(procedureId, "procedureId");
                return helpers.request(`${endpoint}/procedures/${encodedProcedureId}/draft`, {
                    method: "POST",
                    body: JSON.stringify(payload)
                }, parseErrorBody, fetchImpl);
            },
            getContractHistory: function (contractId) {
                return helpers.request(`${buildContractPath(contractId)}/history`, {
                    method: "GET"
                }, parseErrorBody, fetchImpl);
            },
            getExecutionSummary: function (contractId) {
                return helpers.request(`${buildContractPath(contractId)}/execution`, {
                    method: "GET"
                }, parseErrorBody, fetchImpl);
            },
            getMilestones: function (contractId) {
                return helpers.request(`${buildContractPath(contractId)}/milestones`, {
                    method: "GET"
                }, parseErrorBody, fetchImpl);
            },
            saveMilestones: function (contractId, payload) {
                return helpers.request(`${buildContractPath(contractId)}/milestones`, {
                    method: "PUT",
                    body: JSON.stringify(payload)
                }, parseErrorBody, fetchImpl);
            },
            getMonitoringControlPoints: function (contractId) {
                return helpers.request(`${buildContractPath(contractId)}/monitoring/control-points`, {
                    method: "GET"
                }, parseErrorBody, fetchImpl);
            },
            saveMonitoringControlPoints: function (contractId, payload) {
                return helpers.request(`${buildContractPath(contractId)}/monitoring/control-points`, {
                    method: "PUT",
                    body: JSON.stringify(payload)
                }, parseErrorBody, fetchImpl);
            },
            getMonitoringMdrCards: function (contractId) {
                return helpers.request(`${buildContractPath(contractId)}/monitoring/mdr-cards`, {
                    method: "GET"
                }, parseErrorBody, fetchImpl);
            },
            saveMonitoringMdrCards: function (contractId, payload) {
                return helpers.request(`${buildContractPath(contractId)}/monitoring/mdr-cards`, {
                    method: "PUT",
                    body: JSON.stringify(payload)
                }, parseErrorBody, fetchImpl);
            },
            importMonitoringMdrForecastFact: function (contractId, payload) {
                return helpers.request(`${buildContractPath(contractId)}/monitoring/mdr-cards/import-forecast-fact`, {
                    method: "POST",
                    body: JSON.stringify(payload)
                }, parseErrorBody, fetchImpl);
            }
        };
    }

    const exportsObject = {
        createClient: createClient
    };

    if (typeof window !== "undefined") {
        window.ContractsGridApi = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
