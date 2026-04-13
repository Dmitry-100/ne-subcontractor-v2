"use strict";

(function () {
    function createBackgroundReferenceRefresh(options) {
        const settings = options || {};
        const windowRef = settings.windowRef;
        const documentRef = settings.documentRef;
        const setSectionStatus = settings.setSectionStatus;
        const getReferenceGridInstance = settings.getReferenceGridInstance;
        const referenceStatusElement = settings.referenceStatusElement;
        const referenceLoadingMessage = settings.referenceLoadingMessage;
        const referenceOperationErrorMessage = settings.referenceOperationErrorMessage;

        function runAfterWindowLoad(callback) {
            if (typeof callback !== "function") {
                return;
            }

            if (documentRef && documentRef.readyState === "complete") {
                callback();
                return;
            }

            if (windowRef && typeof windowRef.addEventListener === "function") {
                windowRef.addEventListener("load", function () {
                    callback();
                }, { once: true });
                return;
            }

            callback();
        }

        function refreshReferenceGridInBackground() {
            const referenceGridInstance = typeof getReferenceGridInstance === "function"
                ? getReferenceGridInstance()
                : null;

            if (!referenceGridInstance || typeof referenceGridInstance.refresh !== "function") {
                return;
            }

            setSectionStatus(referenceStatusElement, referenceLoadingMessage(), false);
            runAfterWindowLoad(function () {
                Promise.resolve().then(function () {
                    return referenceGridInstance.refresh();
                }).catch(function (error) {
                    const message = error && error.message
                        ? error.message
                        : referenceOperationErrorMessage();
                    setSectionStatus(referenceStatusElement, message, true);
                });
            });
        }

        return {
            refreshReferenceGridInBackground: refreshReferenceGridInBackground
        };
    }

    const exportsObject = {
        createBackgroundReferenceRefresh: createBackgroundReferenceRefresh
    };

    if (typeof window !== "undefined") {
        window.AdminGridBackgroundRefresh = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
