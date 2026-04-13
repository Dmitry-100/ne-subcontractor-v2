"use strict";

(function () {
    function hasOwn(source, key) {
        return Object.prototype.hasOwnProperty.call(source, key);
    }

    function parseErrorBody(rawText, statusCode) {
        if (!rawText) {
            return `Ошибка запроса (${statusCode}).`;
        }

        try {
            const body = JSON.parse(rawText);
            if (body && typeof body.detail === "string" && body.detail.trim().length > 0) {
                return body.detail;
            }

            if (body && typeof body.error === "string" && body.error.trim().length > 0) {
                return body.error;
            }

            if (body && typeof body.title === "string" && body.title.trim().length > 0) {
                return body.title;
            }
        } catch {
            return rawText;
        }

        return rawText;
    }

    function normalizeTypeCode(value) {
        const normalized = String(value ?? "").trim().toUpperCase();
        if (!normalized) {
            throw new Error("Код типа обязателен.");
        }

        return normalized;
    }

    function normalizeRoleNames(rawRoles) {
        if (!rawRoles) {
            return [];
        }

        const values = Array.isArray(rawRoles)
            ? rawRoles
            : String(rawRoles).split(",");

        const roleNames = [];
        const seen = new Set();

        values.forEach(function (value) {
            const roleName = String(value ?? "").trim();
            if (!roleName) {
                return;
            }

            const key = roleName.toUpperCase();
            if (seen.has(key)) {
                return;
            }

            seen.add(key);
            roleNames.push(roleName);
        });

        return roleNames;
    }

    function toStringList(value) {
        if (!value) {
            return [];
        }

        if (Array.isArray(value)) {
            return value.map(function (item) { return String(item); });
        }

        const text = String(value).trim();
        return text ? [text] : [];
    }

    function parseSortOrder(value, fallbackValue) {
        if (value === null || value === undefined || value === "") {
            return fallbackValue;
        }

        const number = Number(value);
        return Number.isFinite(number) ? Math.trunc(number) : fallbackValue;
    }

    function buildReferencePayload(values, fallback, isInsert) {
        const fallbackValue = fallback || {};
        const itemCodeRaw = hasOwn(values, "itemCode")
            ? values.itemCode
            : fallbackValue.itemCode;
        const displayNameRaw = hasOwn(values, "displayName")
            ? values.displayName
            : fallbackValue.displayName;
        const sortOrder = parseSortOrder(
            hasOwn(values, "sortOrder") ? values.sortOrder : fallbackValue.sortOrder,
            0);
        const isActive = hasOwn(values, "isActive")
            ? Boolean(values.isActive)
            : (fallbackValue.isActive === undefined ? true : Boolean(fallbackValue.isActive));

        const itemCode = String(itemCodeRaw ?? "").trim().toUpperCase();
        if (!itemCode) {
            throw new Error("Поле ItemCode обязательно.");
        }

        const displayName = String(displayNameRaw ?? "").trim();
        if (!displayName) {
            throw new Error("Поле DisplayName обязательно.");
        }

        if (!isInsert && fallbackValue.itemCode && itemCode !== String(fallbackValue.itemCode).toUpperCase()) {
            throw new Error("Поле ItemCode нельзя изменить для существующей записи.");
        }

        return {
            itemCode: itemCode,
            displayName: displayName,
            sortOrder: sortOrder,
            isActive: isActive
        };
    }

    function buildReferenceItemsUrl(referenceApiRoot, typeCode, activeOnly) {
        const encodedTypeCode = encodeURIComponent(typeCode);
        const activeOnlyText = activeOnly ? "true" : "false";
        return `${referenceApiRoot}/${encodedTypeCode}/items?activeOnly=${activeOnlyText}`;
    }

    const exportsObject = {
        createHelpers: function () {
            return {
                hasOwn: hasOwn,
                parseErrorBody: parseErrorBody,
                normalizeTypeCode: normalizeTypeCode,
                normalizeRoleNames: normalizeRoleNames,
                toStringList: toStringList,
                parseSortOrder: parseSortOrder,
                buildReferencePayload: buildReferencePayload,
                buildReferenceItemsUrl: buildReferenceItemsUrl
            };
        }
    };

    if (typeof window !== "undefined") {
        window.AdminHelpers = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
