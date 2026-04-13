"use strict";

(function () {
    function createMessages() {
        return {
            usersLoading: function () {
                return "Загрузка пользователей...";
            },
            rolesLoading: function () {
                return "Загрузка ролей...";
            },
            referenceLoading: function () {
                return "Загрузка справочника...";
            },
            usersLoaded: function (count, search) {
                const normalizedSearch = String(search ?? "").trim();
                const suffix = normalizedSearch ? ` по запросу '${normalizedSearch}'` : "";
                return `Загружено пользователей: ${count}${suffix}.`;
            },
            rolesLoaded: function (count) {
                return `Загружено ролей: ${count}.`;
            },
            referenceLoaded: function (count, typeCode, activeOnly) {
                const activeOnlyText = activeOnly ? " (только активные)" : "";
                return `Загружено элементов: ${count} для ${typeCode}${activeOnlyText}.`;
            },
            userUpdated: function (login, rolesCount) {
                return `Пользователь '${login}' обновлён (ролей: ${rolesCount}).`;
            },
            referenceSaved: function (itemCode, typeCode) {
                return `Элемент '${itemCode}' сохранён для ${typeCode}.`;
            },
            referenceUpdated: function (itemCode, typeCode) {
                return `Элемент '${itemCode}' обновлён для ${typeCode}.`;
            },
            referenceDeleted: function (itemCode, typeCode) {
                return `Элемент '${itemCode}' удалён из ${typeCode}.`;
            },
            usersOperationError: function () {
                return "Ошибка операции с пользователями.";
            },
            referenceOperationError: function () {
                return "Ошибка операции со справочником.";
            },
            bootstrapFailed: function () {
                return "Не удалось инициализировать модуль администрирования.";
            },
            invalidReferenceType: function () {
                return "Некорректный код типа.";
            }
        };
    }

    const exportsObject = {
        createMessages: createMessages
    };

    if (typeof window !== "undefined") {
        window.AdminMessages = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
