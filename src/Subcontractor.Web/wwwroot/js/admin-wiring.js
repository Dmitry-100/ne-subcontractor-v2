"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`AdminWiring requires ${name}.`);
        }
    }

    function requireElement(controls, key) {
        const value = controls ? controls[key] : null;
        if (!value) {
            throw new Error(`AdminWiring requires controls.${key}.`);
        }

        return value;
    }

    function requireString(value, name) {
        if (typeof value !== "string" || value.trim().length === 0) {
            throw new Error(`AdminWiring requires ${name}.`);
        }
    }

    function createWiring(options) {
        const settings = options || {};
        const controls = settings.controls || {};
        const usersSearchInput = requireElement(controls, "usersSearchInput");
        const usersSearchApplyButton = requireElement(controls, "usersSearchApplyButton");
        const usersSearchResetButton = requireElement(controls, "usersSearchResetButton");
        const referenceTypeCodeInput = requireElement(controls, "referenceTypeCodeInput");
        const referenceActiveOnlyCheckbox = requireElement(controls, "referenceActiveOnlyCheckbox");
        const referenceLoadButton = requireElement(controls, "referenceLoadButton");
        const referenceOpenApiLink = requireElement(controls, "referenceOpenApiLink");

        const referenceApiRoot = settings.referenceApiRoot;
        requireString(referenceApiRoot, "referenceApiRoot");

        const normalizeTypeCode = settings.normalizeTypeCode;
        const buildReferenceItemsUrl = settings.buildReferenceItemsUrl;
        const setReferenceStatus = settings.setReferenceStatus;
        const onUsersRefreshRequested = settings.onUsersRefreshRequested;
        const onReferenceRefreshRequested = settings.onReferenceRefreshRequested;
        const invalidReferenceTypeMessage = settings.invalidReferenceTypeMessage || "Некорректный код типа.";
        requireFunction(normalizeTypeCode, "normalizeTypeCode");
        requireFunction(buildReferenceItemsUrl, "buildReferenceItemsUrl");
        requireFunction(setReferenceStatus, "setReferenceStatus");
        requireFunction(onUsersRefreshRequested, "onUsersRefreshRequested");
        requireFunction(onReferenceRefreshRequested, "onReferenceRefreshRequested");

        let currentUsersSearch = "";
        let currentReferenceTypeCode = "";
        let currentReferenceActiveOnly = false;
        let isBound = false;

        function updateReferenceApiLink() {
            referenceOpenApiLink.href = buildReferenceItemsUrl(
                referenceApiRoot,
                currentReferenceTypeCode,
                currentReferenceActiveOnly);
        }

        function applyUsersSearch() {
            currentUsersSearch = String(usersSearchInput.value ?? "").trim();
            onUsersRefreshRequested();
        }

        function resetUsersSearch() {
            usersSearchInput.value = "";
            currentUsersSearch = "";
            onUsersRefreshRequested();
        }

        function applyReferenceType() {
            try {
                currentReferenceTypeCode = normalizeTypeCode(referenceTypeCodeInput.value);
                currentReferenceActiveOnly = Boolean(referenceActiveOnlyCheckbox.checked);
                referenceTypeCodeInput.value = currentReferenceTypeCode;
                updateReferenceApiLink();
                onReferenceRefreshRequested();
            } catch (error) {
                const message = error && error.message
                    ? error.message
                    : invalidReferenceTypeMessage;
                setReferenceStatus(message, true);
            }
        }

        function bindEvents() {
            if (isBound) {
                return;
            }

            usersSearchApplyButton.addEventListener("click", applyUsersSearch);
            usersSearchResetButton.addEventListener("click", resetUsersSearch);
            usersSearchInput.addEventListener("keydown", function (event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    applyUsersSearch();
                }
            });

            referenceLoadButton.addEventListener("click", applyReferenceType);
            referenceTypeCodeInput.addEventListener("keydown", function (event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    applyReferenceType();
                }
            });
            referenceActiveOnlyCheckbox.addEventListener("change", applyReferenceType);

            isBound = true;
        }

        function initialize() {
            currentUsersSearch = String(usersSearchInput.value ?? "").trim();
            currentReferenceTypeCode = normalizeTypeCode(referenceTypeCodeInput.value || "PURCHASE_TYPE");
            currentReferenceActiveOnly = Boolean(referenceActiveOnlyCheckbox.checked);
            referenceTypeCodeInput.value = currentReferenceTypeCode;
            updateReferenceApiLink();
        }

        return {
            initialize: initialize,
            bindEvents: bindEvents,
            getUsersSearch: function () {
                return currentUsersSearch;
            },
            getReferenceContext: function () {
                return {
                    typeCode: currentReferenceTypeCode,
                    activeOnly: currentReferenceActiveOnly
                };
            }
        };
    }

    const exportsObject = {
        createWiring: createWiring
    };

    if (typeof window !== "undefined") {
        window.AdminWiring = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
