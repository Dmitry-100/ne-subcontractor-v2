"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`AdminGrids requires ${name}.`);
        }
    }

    function requireElement(elements, key) {
        const element = elements ? elements[key] : null;
        if (!element) {
            throw new Error(`AdminGrids requires element '${key}'.`);
        }

        return element;
    }

    function requireArray(value, name) {
        if (!Array.isArray(value)) {
            throw new Error(`AdminGrids requires ${name} array.`);
        }

        return value;
    }

    function resolveModule(globalName, requirePath, requiredMembers) {
        let moduleObject = null;

        if (typeof window !== "undefined" && window[globalName]) {
            moduleObject = window[globalName];
        } else if (typeof module !== "undefined" && module.exports && typeof require === "function") {
            moduleObject = require(requirePath);
        }

        if (!moduleObject || typeof moduleObject !== "object") {
            throw new Error(`Не удалось загрузить модуль admin-grids: ${globalName}.`);
        }

        const members = Array.isArray(requiredMembers) ? requiredMembers : [];
        const missing = members.filter(function (name) {
            return typeof moduleObject[name] !== "function";
        });

        if (missing.length > 0) {
            throw new Error(`Модуль ${globalName} не содержит обязательные методы: ${missing.join(", ")}.`);
        }

        return moduleObject;
    }

    const rolesModule = resolveModule("AdminGridsRoles", "./admin-grids-roles.js", ["createGrid"]);
    const usersModule = resolveModule("AdminGridsUsers", "./admin-grids-users.js", ["createGrid"]);
    const referenceModule = resolveModule("AdminGridsReference", "./admin-grids-reference.js", ["createGrid"]);

    function createGrids(options) {
        const settings = options || {};
        const jQueryImpl = settings.jQueryImpl;
        requireFunction(jQueryImpl, "jQueryImpl");

        const elements = settings.elements || {};
        const usersGridElement = requireElement(elements, "usersGridElement");
        const rolesGridElement = requireElement(elements, "rolesGridElement");
        const referenceGridElement = requireElement(elements, "referenceGridElement");

        const stores = settings.stores || {};
        const usersStore = stores.usersStore;
        const referenceStore = stores.referenceStore;
        if (!usersStore) {
            throw new Error("AdminGrids requires stores.usersStore.");
        }

        if (!referenceStore) {
            throw new Error("AdminGrids requires stores.referenceStore.");
        }

        const rolesDataSource = requireArray(settings.rolesDataSource, "rolesDataSource");
        const callbacks = settings.callbacks || {};
        const toStringList = callbacks.toStringList;
        const onUsersDataError = callbacks.onUsersDataError;
        const onReferenceDataError = callbacks.onReferenceDataError;
        requireFunction(toStringList, "callbacks.toStringList");
        requireFunction(onUsersDataError, "callbacks.onUsersDataError");
        requireFunction(onReferenceDataError, "callbacks.onReferenceDataError");

        const rolesGridInstance = rolesModule.createGrid({
            element: rolesGridElement,
            jQueryImpl: jQueryImpl,
            rolesDataSource: rolesDataSource
        });

        const usersGridInstance = usersModule.createGrid({
            element: usersGridElement,
            jQueryImpl: jQueryImpl,
            onUsersDataError: onUsersDataError,
            rolesDataSource: rolesDataSource,
            toStringList: toStringList,
            usersStore: usersStore
        });

        const referenceGridInstance = referenceModule.createGrid({
            element: referenceGridElement,
            jQueryImpl: jQueryImpl,
            onReferenceDataError: onReferenceDataError,
            referenceStore: referenceStore
        });

        return {
            usersGridInstance: usersGridInstance,
            rolesGridInstance: rolesGridInstance,
            referenceGridInstance: referenceGridInstance
        };
    }

    const exportsObject = {
        createGrids: createGrids
    };

    if (typeof window !== "undefined") {
        window.AdminGrids = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
