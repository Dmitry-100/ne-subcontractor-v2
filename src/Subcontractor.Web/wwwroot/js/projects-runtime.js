"use strict";

(function () {
    function requireFunction(value, name) {
        if (typeof value !== "function") {
            throw new Error(`ProjectsRuntime requires ${name}.`);
        }
    }

    function toFiniteInteger(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) {
            return null;
        }

        return Math.trunc(number);
    }

    function tryReadPagedPayload(payload) {
        if (!payload || typeof payload !== "object" || !Array.isArray(payload.items)) {
            return null;
        }

        const totalCountValue = toFiniteInteger(payload.totalCount);
        const totalCount = totalCountValue !== null && totalCountValue >= 0
            ? totalCountValue
            : payload.items.length;

        return {
            items: payload.items,
            totalCount: totalCount
        };
    }

    function createRuntime(options) {
        const settings = options || {};
        const apiClient = settings.apiClient;
        const helpers = settings.helpers;
        const customStoreCtor = settings.customStoreCtor;
        const setStatus = settings.setStatus;

        if (!apiClient) {
            throw new Error("ProjectsRuntime requires apiClient.");
        }

        if (!helpers) {
            throw new Error("ProjectsRuntime requires helpers.");
        }

        requireFunction(apiClient.getProjects, "apiClient.getProjects");
        requireFunction(apiClient.createProject, "apiClient.createProject");
        requireFunction(apiClient.updateProject, "apiClient.updateProject");
        requireFunction(apiClient.deleteProject, "apiClient.deleteProject");
        requireFunction(helpers.normalizeGuid, "helpers.normalizeGuid");
        requireFunction(helpers.toTrimmedString, "helpers.toTrimmedString");
        requireFunction(customStoreCtor, "customStoreCtor");
        requireFunction(setStatus, "setStatus callback");

        let cache = [];

        function findProjectById(projectId) {
            return cache.find(function (item) {
                return item.id === projectId;
            }) || null;
        }

        function createStore() {
            return new customStoreCtor({
                key: "id",
                load: async function (loadOptions) {
                    const options = loadOptions || {};
                    const skip = toFiniteInteger(options.skip);
                    const take = toFiniteInteger(options.take);
                    const hasPagingQuery = (skip !== null && skip >= 0) || (take !== null && take > 0);
                    const paging = hasPagingQuery
                        ? {
                            skip: skip !== null && skip >= 0 ? skip : 0,
                            take: take !== null && take > 0 ? take : 15,
                            requireTotalCount: true
                        }
                        : null;

                    const payload = await apiClient.getProjects(null, paging);
                    const pagedPayload = tryReadPagedPayload(payload);
                    if (pagedPayload) {
                        cache = pagedPayload.items.slice();
                        setStatus(`Загружено проектов: ${pagedPayload.items.length} (всего: ${pagedPayload.totalCount}).`, false);
                        return {
                            data: pagedPayload.items,
                            totalCount: pagedPayload.totalCount
                        };
                    }

                    cache = Array.isArray(payload) ? payload : [];
                    setStatus(`Загружено проектов: ${cache.length}.`, false);
                    return cache;
                },
                insert: async function (values) {
                    const payload = {
                        code: helpers.toTrimmedString(values?.code),
                        name: helpers.toTrimmedString(values?.name),
                        gipUserId: helpers.normalizeGuid(values?.gipUserId)
                    };

                    if (!payload.code) {
                        throw new Error("Код проекта обязателен.");
                    }

                    if (!payload.name) {
                        throw new Error("Наименование проекта обязательно.");
                    }

                    const created = await apiClient.createProject(payload);
                    cache.push(created);
                    setStatus(`Проект '${created.code}' создан.`, false);
                    return created;
                },
                update: async function (key, values) {
                    const current = findProjectById(key);
                    const payload = {
                        name: helpers.toTrimmedString(values?.name ?? current?.name),
                        gipUserId: Object.prototype.hasOwnProperty.call(values || {}, "gipUserId")
                            ? helpers.normalizeGuid(values.gipUserId)
                            : helpers.normalizeGuid(current?.gipUserId)
                    };

                    if (!payload.name) {
                        throw new Error("Наименование проекта обязательно.");
                    }

                    const updated = await apiClient.updateProject(key, payload);
                    cache = cache.map(function (item) {
                        return item.id === key ? updated : item;
                    });

                    setStatus(`Проект '${updated.code}' обновлён.`, false);
                    return updated;
                },
                remove: async function (key) {
                    await apiClient.deleteProject(key);
                    cache = cache.filter(function (item) {
                        return item.id !== key;
                    });
                    setStatus("Проект удалён.", false);
                }
            });
        }

        return {
            createStore: createStore,
            getCache: function () {
                return cache.slice();
            }
        };
    }

    const exportsObject = {
        createRuntime: createRuntime
    };

    if (typeof window !== "undefined") {
        window.ProjectsRuntime = exportsObject;
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = exportsObject;
    }
})();
