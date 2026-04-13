"use strict";

(function () {
    const STATUS_ORDER = [
        "Created",
        "DocumentsPreparation",
        "OnApproval",
        "Sent",
        "OffersReceived",
        "Retender",
        "DecisionMade",
        "Completed",
        "Canceled"
    ];

    const TRANSITION_MAP = {
        Created: ["DocumentsPreparation", "Canceled"],
        DocumentsPreparation: ["Created", "OnApproval", "Canceled"],
        OnApproval: ["DocumentsPreparation", "Sent", "Canceled"],
        Sent: ["OnApproval", "OffersReceived", "Canceled"],
        OffersReceived: ["DecisionMade", "Retender", "Canceled"],
        Retender: ["Sent", "Canceled"],
        DecisionMade: ["Completed", "Retender", "Canceled"],
        Completed: [],
        Canceled: []
    };

    const STATUS_CAPTIONS = {
        Created: "Создана",
        DocumentsPreparation: "Подготовка документов",
        OnApproval: "На согласовании",
        Sent: "Отправлена",
        OffersReceived: "Предложения получены",
        Retender: "Переторжка",
        DecisionMade: "Решение принято",
        Completed: "Завершена",
        Canceled: "Отменена"
    };

    const CONTRACTOR_STATUS_CAPTIONS = {
        Active: "Активен",
        Blocked: "Заблокирован",
        Archived: "Архивный"
    };

    const RELIABILITY_CLASS_CAPTIONS = {
        A: "A (высокая)",
        B: "B (нормальная)",
        C: "C (пониженная)",
        D: "D (критическая)"
    };

    const APPROVAL_MODES = ["InSystem", "External"];

    const APPROVAL_MODE_CAPTIONS = {
        InSystem: "В системе",
        External: "Внешнее"
    };

    function cloneObject(value) {
        return Object.assign({}, value || {});
    }

    function cloneArray(values) {
        return Array.isArray(values) ? values.slice() : [];
    }

    function cloneTransitionMap(source) {
        const result = {};
        const keys = Object.keys(source || {});
        for (let index = 0; index < keys.length; index += 1) {
            const key = keys[index];
            result[key] = cloneArray(source[key]);
        }

        return result;
    }

    function buildLookup(values, captions) {
        const result = [];
        for (let index = 0; index < values.length; index += 1) {
            const value = values[index];
            result.push({
                value: value,
                text: captions[value] || value
            });
        }

        return result;
    }

    function createConfig() {
        const statusOrder = cloneArray(STATUS_ORDER);
        const transitionMap = cloneTransitionMap(TRANSITION_MAP);
        const statusCaptions = cloneObject(STATUS_CAPTIONS);
        const contractorStatusCaptions = cloneObject(CONTRACTOR_STATUS_CAPTIONS);
        const reliabilityClassCaptions = cloneObject(RELIABILITY_CLASS_CAPTIONS);
        const approvalModes = cloneArray(APPROVAL_MODES);
        const approvalModeCaptions = cloneObject(APPROVAL_MODE_CAPTIONS);

        return {
            statusOrder: statusOrder,
            transitionMap: transitionMap,
            statusCaptions: statusCaptions,
            contractorStatusCaptions: contractorStatusCaptions,
            reliabilityClassCaptions: reliabilityClassCaptions,
            approvalModes: approvalModes,
            approvalModeCaptions: approvalModeCaptions,
            statusLookup: buildLookup(statusOrder, statusCaptions),
            approvalModeLookup: buildLookup(approvalModes, approvalModeCaptions)
        };
    }

    const exportsObject = {
        createConfig: createConfig
    };

    if (typeof window !== "undefined") {
        window.ProceduresConfig = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
