"use strict";

(function () {
    const STATUS_KEYS = [
        "upload",
        "batches",
        "mapping",
        "transition",
        "xml",
        "lot"
    ];

    function isNodeLike(value) {
        return Boolean(value) && typeof value === "object";
    }

    function supportsStatusMutation(element) {
        return isNodeLike(element) &&
            typeof element.textContent !== "undefined" &&
            isNodeLike(element.classList) &&
            typeof element.classList.toggle === "function";
    }

    function createStatusService(options) {
        const settings = options || {};
        const statusElements = isNodeLike(settings.statusElements) ? settings.statusElements : null;
        const setStatusView = settings.setStatusView || null;

        if (!statusElements && typeof setStatusView !== "function") {
            throw new Error("createStatusService: statusElements are required when custom setStatusView is not provided.");
        }

        if (statusElements) {
            STATUS_KEYS.forEach(function (key) {
                const element = statusElements[key];
                if (!supportsStatusMutation(element) && typeof setStatusView !== "function") {
                    throw new Error(`createStatusService: statusElements.${key} must support textContent and classList.toggle.`);
                }
            });
        }

        function setStatus(key, message, isError) {
            if (typeof setStatusView === "function") {
                setStatusView(key, message, Boolean(isError));
                return;
            }

            const element = statusElements[key];
            if (!supportsStatusMutation(element)) {
                return;
            }

            element.textContent = message;
            element.classList.toggle("imports-status--error", Boolean(isError));
        }

        return {
            setUploadStatus: function (message, isError) {
                setStatus("upload", message, isError);
            },
            setBatchesStatus: function (message, isError) {
                setStatus("batches", message, isError);
            },
            setMappingStatus: function (message, isError) {
                setStatus("mapping", message, isError);
            },
            setTransitionStatus: function (message, isError) {
                setStatus("transition", message, isError);
            },
            setXmlStatus: function (message, isError) {
                setStatus("xml", message, isError);
            },
            setLotStatus: function (message, isError) {
                setStatus("lot", message, isError);
            }
        };
    }

    const exportsObject = {
        createStatusService: createStatusService
    };

    if (typeof window !== "undefined") {
        window.ImportsPageStatus = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
