"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const messagesModule = require(path.resolve(
    __dirname,
    "../../src/Subcontractor.Web/wwwroot/js/admin-messages.js"));

test("admin messages: loading and operation messages are deterministic", () => {
    const messages = messagesModule.createMessages();

    assert.equal(messages.usersLoading(), "Загрузка пользователей...");
    assert.equal(messages.rolesLoading(), "Загрузка ролей...");
    assert.equal(messages.referenceLoading(), "Загрузка справочника...");
    assert.equal(messages.usersOperationError(), "Ошибка операции с пользователями.");
    assert.equal(messages.referenceOperationError(), "Ошибка операции со справочником.");
    assert.equal(messages.bootstrapFailed(), "Не удалось инициализировать модуль администрирования.");
    assert.equal(messages.invalidReferenceType(), "Некорректный код типа.");
});

test("admin messages: status builders use expected interpolation rules", () => {
    const messages = messagesModule.createMessages();

    assert.equal(messages.usersLoaded(12, ""), "Загружено пользователей: 12.");
    assert.equal(messages.usersLoaded(7, "ivanov"), "Загружено пользователей: 7 по запросу 'ivanov'.");

    assert.equal(messages.rolesLoaded(5), "Загружено ролей: 5.");
    assert.equal(messages.referenceLoaded(15, "PURCHASE_TYPE", false), "Загружено элементов: 15 для PURCHASE_TYPE.");
    assert.equal(messages.referenceLoaded(3, "APPROVAL_MODE", true), "Загружено элементов: 3 для APPROVAL_MODE (только активные).");

    assert.equal(messages.userUpdated("ivanov", 2), "Пользователь 'ivanov' обновлён (ролей: 2).");
    assert.equal(messages.referenceSaved("CODE1", "PURCHASE_TYPE"), "Элемент 'CODE1' сохранён для PURCHASE_TYPE.");
    assert.equal(messages.referenceUpdated("CODE1", "PURCHASE_TYPE"), "Элемент 'CODE1' обновлён для PURCHASE_TYPE.");
    assert.equal(messages.referenceDeleted("CODE1", "PURCHASE_TYPE"), "Элемент 'CODE1' удалён из PURCHASE_TYPE.");
});
