"use strict";

(function () {
    const adminBootstrapRoot = window.AdminBootstrap;
    if (!adminBootstrapRoot || typeof adminBootstrapRoot.createBootstrapContext !== "function") {
        return;
    }

    const context = adminBootstrapRoot.createBootstrapContext({
        document: document,
        window: window,
        logError: function (message) {
            if (window.console && typeof window.console.error === "function") {
                window.console.error(message);
            }
        }
    });

    if (!context) {
        return;
    }

    const endpoints = context.endpoints;
    const controls = context.controls;
    const moduleRoots = context.moduleRoots;

    const usersStatusElement = controls.usersStatusElement;
    const rolesStatusElement = controls.rolesStatusElement;
    const referenceStatusElement = controls.referenceStatusElement;

    function setSectionStatus(element, message, isError) {
        element.textContent = message;
        element.classList.toggle("admin-status--error", Boolean(isError));
    }

    function resolveBackgroundRefreshModule() {
        if (window.AdminGridBackgroundRefresh
            && typeof window.AdminGridBackgroundRefresh.createBackgroundReferenceRefresh === "function") {
            return window.AdminGridBackgroundRefresh;
        }

        if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            return require("./admin-grid-background-refresh.js");
        }

        throw new Error("AdminGrid requires 'AdminGridBackgroundRefresh.createBackgroundReferenceRefresh'.");
    }

    const messages = moduleRoots.adminMessagesRoot.createMessages();
    const helpers = moduleRoots.adminHelpersRoot.createHelpers();
    const apiClient = moduleRoots.adminApiRoot.createApiClient({
        usersEndpoint: endpoints.usersEndpoint,
        rolesEndpoint: endpoints.rolesEndpoint,
        referenceApiRoot: endpoints.referenceApiRoot,
        parseErrorBody: helpers.parseErrorBody
    });

    let usersGridInstance = null;
    let referenceGridInstance = null;
    let rolesDataSource = [];

    const wiring = moduleRoots.adminWiringRoot.createWiring({
        controls: {
            usersSearchInput: controls.usersSearchInput,
            usersSearchApplyButton: controls.usersSearchApplyButton,
            usersSearchResetButton: controls.usersSearchResetButton,
            referenceTypeCodeInput: controls.referenceTypeCodeInput,
            referenceActiveOnlyCheckbox: controls.referenceActiveOnlyCheckbox,
            referenceLoadButton: controls.referenceLoadButton,
            referenceOpenApiLink: controls.referenceOpenApiLink
        },
        referenceApiRoot: endpoints.referenceApiRoot,
        normalizeTypeCode: helpers.normalizeTypeCode,
        buildReferenceItemsUrl: helpers.buildReferenceItemsUrl,
        invalidReferenceTypeMessage: messages.invalidReferenceType(),
        setReferenceStatus: function (message, isError) {
            setSectionStatus(referenceStatusElement, message, isError);
        },
        onUsersRefreshRequested: function () {
            if (usersGridInstance && typeof usersGridInstance.refresh === "function") {
                usersGridInstance.refresh();
            }
        },
        onReferenceRefreshRequested: function () {
            if (referenceGridInstance && typeof referenceGridInstance.refresh === "function") {
                referenceGridInstance.refresh();
            }
        }
    });

    const runtime = moduleRoots.adminRuntimeRoot.createRuntime({
        customStoreCtor: window.DevExpress.data.CustomStore,
        apiClient: apiClient,
        helpers: {
            hasOwn: helpers.hasOwn,
            normalizeRoleNames: helpers.normalizeRoleNames,
            buildReferencePayload: helpers.buildReferencePayload
        },
        messages: {
            usersLoaded: messages.usersLoaded,
            rolesLoaded: messages.rolesLoaded,
            referenceLoaded: messages.referenceLoaded,
            userUpdated: messages.userUpdated,
            referenceSaved: messages.referenceSaved,
            referenceUpdated: messages.referenceUpdated,
            referenceDeleted: messages.referenceDeleted
        },
        callbacks: {
            getUsersSearch: function () {
                return wiring.getUsersSearch();
            },
            getReferenceContext: function () {
                return wiring.getReferenceContext();
            },
            setUsersStatus: function (message, isError) {
                setSectionStatus(usersStatusElement, message, isError);
            },
            setRolesStatus: function (message, isError) {
                setSectionStatus(rolesStatusElement, message, isError);
            },
            setReferenceStatus: function (message, isError) {
                setSectionStatus(referenceStatusElement, message, isError);
            }
        }
    });

    const backgroundRefresher = resolveBackgroundRefreshModule().createBackgroundReferenceRefresh({
        windowRef: window,
        documentRef: document,
        setSectionStatus: setSectionStatus,
        getReferenceGridInstance: function () {
            return referenceGridInstance;
        },
        referenceStatusElement: referenceStatusElement,
        referenceLoadingMessage: messages.referenceLoading,
        referenceOperationErrorMessage: messages.referenceOperationError
    });

    function initializeGrids() {
        return moduleRoots.adminGridsRoot.createGrids({
            jQueryImpl: window.jQuery,
            elements: {
                usersGridElement: controls.usersGridElement,
                rolesGridElement: controls.rolesGridElement,
                referenceGridElement: controls.referenceGridElement
            },
            stores: {
                usersStore: runtime.usersStore,
                referenceStore: runtime.referenceStore
            },
            rolesDataSource: rolesDataSource,
            callbacks: {
                toStringList: helpers.toStringList,
                onUsersDataError: function (error) {
                    setSectionStatus(usersStatusElement, error?.message ?? messages.usersOperationError(), true);
                },
                onReferenceDataError: function (error) {
                    setSectionStatus(referenceStatusElement, error?.message ?? messages.referenceOperationError(), true);
                }
            }
        });
    }

    (async function bootstrap() {
        try {
            setSectionStatus(usersStatusElement, messages.usersLoading(), false);
            setSectionStatus(rolesStatusElement, messages.rolesLoading(), false);
            setSectionStatus(referenceStatusElement, messages.referenceLoading(), false);

            wiring.initialize();

            await runtime.loadRoles();
            rolesDataSource = runtime.getRoles();

            const grids = initializeGrids();
            usersGridInstance = grids.usersGridInstance;
            referenceGridInstance = grids.referenceGridInstance;

            wiring.bindEvents();

            await usersGridInstance.refresh();
            backgroundRefresher.refreshReferenceGridInBackground();
        } catch (error) {
            const message = error && error.message
                ? error.message
                : messages.bootstrapFailed();
            setSectionStatus(usersStatusElement, message, true);
            setSectionStatus(rolesStatusElement, message, true);
            setSectionStatus(referenceStatusElement, message, true);
        }
    })();
})();
