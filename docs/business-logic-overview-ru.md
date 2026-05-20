# Описание бизнес-логики приложения

## 1. Назначение документа

Этот документ описывает, как в текущей версии системы реализуется бизнес-логика управления субподрядом:

- где именно в кодовой базе находятся бизнес-правила;
- как проходят основные пользовательские и фоновые сценарии;
- как между собой связаны проекты, лоты, закупочные процедуры, договоры, подрядчики, импорт и SLA;
- в каком слое выполняются проверки, переходы статусов, расчеты и побочные эффекты.

Документ описывает фактическую реализацию приложения, а не целевую концептуальную модель.

## 2. Общая архитектурная идея

Текущая система реализована как модульный монолит на ASP.NET Core MVC с выделенными слоями:

- `Subcontractor.Web` — HTTP/API слой, MVC-страницы, middleware, аутентификация, авторизация, фоновые воркеры;
- `Subcontractor.Application` — основная бизнес-логика, сценарии, проверки, расчеты, переходы состояний, DTO;
- `Subcontractor.Infrastructure` — доступ к БД, реализация текущего пользователя, времени, email-уведомлений;
- `Subcontractor.Domain` — сущности предметной области, enum-статусы, базовые типы сущностей;
- `Subcontractor.BackgroundJobs` — отдельный фоновый контур, если система развертывается не с embedded workers.

Ключевая особенность текущей реализации:

- бизнес-правила в основном сосредоточены в слое `Application`;
- доменные сущности хранят состояние и связи, но почти не инкапсулируют сложные бизнес-решения;
- чтение и изменение данных в большинстве модулей разделены на отдельные классы.

По сути это service-oriented backend, где модуль строится вокруг набора классов:

- `*Service` — фасад модуля;
- `*ReadQueryService` — чтение и построение DTO;
- `*WorkflowService` — изменение данных и оркестрация сценариев;
- `*Policy` — валидация, нормализация, расчеты и правила переходов;
- `*ProjectionPolicy` — маппинг сущностей в DTO.

## 3. Сквозной путь запроса

### 3.1. Сборка приложения

Точка входа приложения:

- `src/Subcontractor.Web/Program.cs`

При старте приложения в DI регистрируются:

- все application-модули через `AddApplication()`;
- инфраструктурные сервисы через `AddInfrastructure(...)`;
- аутентификация;
- авторизация;
- web-композиция и фоновые воркеры.

Основной список модулей задается в:

- `src/Subcontractor.Application/DependencyInjection.cs`
- `src/Subcontractor.Application/DependencyInjection.Modules.cs`

### 3.2. HTTP pipeline

Пайплайн настраивается в:

- `src/Subcontractor.Web/Configuration/WebApplicationPipelineExtensions.cs`

Последовательность обработки запроса следующая:

1. включается response compression;
2. включается локализация (`ru-RU` по умолчанию);
3. назначается `CorrelationId`;
4. подключается глобальный обработчик исключений;
5. включается HTTPS redirect;
6. раздаются статические файлы с правилами cache-control;
7. включается routing;
8. включается output cache;
9. выполняется authentication;
10. выполняется `CurrentUserProvisioningMiddleware`;
11. выполняется authorization;
12. маршрутизация уходит в MVC/API controllers.

### 3.3. Provisioning пользователя

Если пользователь аутентифицирован, middleware:

- `src/Subcontractor.Web/Middleware/CurrentUserProvisioningMiddleware.cs`

вызывает:

- `src/Subcontractor.Infrastructure/Services/UserProvisioningService.cs`

Этот сервис:

- нормализует логин;
- ищет пользователя в локальной таблице `AppUser`;
- при отсутствии создает новую запись;
- обновляет `ExternalId`, `DisplayName`, `Email`;
- при совпадении логина с bootstrap-списком назначает роль администратора.

То есть перед выполнением бизнес-сценария система гарантирует, что текущий пользователь существует в локальной модели безопасности.

### 3.4. Авторизация

На контроллерах используется policy-based authorization:

- `src/Subcontractor.Web/Configuration/AuthorizationServiceCollectionExtensions.cs`
- `src/Subcontractor.Web/Authorization/PermissionAuthorizationHandler.cs`
- `src/Subcontractor.Web/Authorization/PolicyCodes.cs`

Механика такая:

1. API endpoint помечается `[Authorize(Policy = ...)]`;
2. policy маппится на конкретный `PermissionCode`;
3. `PermissionAuthorizationHandler` вызывает `IPermissionEvaluator`;
4. `PermissionEvaluator` читает из БД роли пользователя и набор назначенных permission-кодов;
5. если permission найден, доступ разрешается.

Таким образом, UI не является единственным местом контроля доступа: ключевой контроль выполняется сервером.

### 3.5. Контроллеры как тонкий слой

Контроллеры в основном:

- принимают HTTP-параметры и DTO;
- вызывают application service;
- переводят исключения в `ProblemDetails`.

Базовый класс:

- `src/Subcontractor.Web/Controllers/ApiControllerBase.cs`

Типичные ошибки:

- `400` — валидация/неверный запрос;
- `404` — сущность не найдена;
- `409` — конфликт бизнес-правил.

Это важная архитектурная договоренность: контроллер почти не содержит бизнес-решений.

## 4. Инфраструктурная база бизнес-логики

### 4.1. AppDbContext как единая точка доступа к данным

Основная модель данных описана в:

- `src/Subcontractor.Infrastructure/Persistence/AppDbContext.cs`

Здесь находятся:

- `DbSet` для всех ключевых сущностей;
- query filters для soft-deleted сущностей;
- индексы и ограничения;
- связи между сущностями;
- переопределения `SaveChanges()` и `SaveChangesAsync()`.

### 4.2. Аудит и soft delete

Перед сохранением `AppDbContext` автоматически:

- проставляет `CreatedAtUtc` / `CreatedBy`;
- проставляет `LastModifiedAtUtc` / `LastModifiedBy`;
- перехватывает физическое удаление и превращает его в soft delete для сущностей `SoftDeletableEntity`.

Базовые типы:

- `src/Subcontractor.Domain/Common/BaseEntity.cs`
- `src/Subcontractor.Domain/Common/AuditableEntity.cs`
- `src/Subcontractor.Domain/Common/SoftDeletableEntity.cs`

Практический эффект:

- почти все удаляемые сущности не исчезают физически;
- query filters автоматически скрывают удаленные записи из обычных запросов;
- история и связность данных сохраняются.

### 4.3. Abstractions вместо прямой привязки к инфраструктуре

Application-слой зависит не от `AppDbContext`, а от абстракций:

- `src/Subcontractor.Application/Abstractions/IApplicationDbContext.cs`
- `ICurrentUserService`
- `IDateTimeProvider`
- `INotificationEmailSender`
- `IPermissionEvaluator`
- `IUserProvisioningService`

Это позволяет:

- тестировать бизнес-логику отдельно от конкретной реализации;
- использовать инфраструктурные детали через стабильный контракт.

## 5. Структура бизнес-логики по модулям

Ниже перечислены основные модули и их текущая ответственность.

### 5.1. Проекты

Ключевые классы:

- `src/Subcontractor.Application/Projects/ProjectsService.cs`
- `src/Subcontractor.Application/Projects/ProjectReadQueryService.cs`
- `src/Subcontractor.Application/Projects/ProjectWriteWorkflowService.cs`
- `src/Subcontractor.Application/Projects/ProjectScopeResolverService.cs`
- `src/Subcontractor.Application/Projects/ProjectReadScopePolicy.cs`

#### Как реализовано чтение

Чтение проектов идет через `ProjectReadQueryService`.

Перед чтением вычисляется `ProjectAccessScope`:

- определяется текущий пользователь;
- из его ролей и permission-кодов вычисляется, есть ли у него глобальный доступ;
- если глобального доступа нет, пользователю показываются только проекты, где `GipUserId == AppUserId`.

Это значит, что часть бизнес-логики доступа к данным встроена не только в authorization, но и в read-scope фильтрацию.

#### Как реализовано создание

При создании проекта:

1. валидируется DTO;
2. код проекта нормализуется;
3. имя проекта нормализуется;
4. проверяется уникальность кода;
5. создается сущность `Project`;
6. если у пользователя нет глобального доступа, `GipUserId` принудительно подменяется на его собственный `AppUserId`;
7. запись сохраняется.

#### Как реализовано обновление

При обновлении:

1. проект ищется уже с учетом read-scope;
2. если пользователь не имеет права видеть этот проект, вернется `null`;
3. имя обновляется;
4. `GipUserId` либо задается из запроса, либо принудительно фиксируется на текущем пользователе для ограниченного доступа.

Итог: бизнес-правило владения проектом реализовано прямо в workflow слое.

### 5.2. Лоты

Ключевые классы:

- `src/Subcontractor.Application/Lots/LotsService.cs`
- `src/Subcontractor.Application/Lots/LotReadQueryService.cs`
- `src/Subcontractor.Application/Lots/LotWriteWorkflowService.cs`
- `src/Subcontractor.Application/Lots/LotMutationPolicy.cs`
- `src/Subcontractor.Application/Lots/LotTransitionPolicy.cs`

#### Создание лота

При создании лота:

1. нормализуется код;
2. нормализуется имя;
3. нормализуются `LotItem`;
4. проверяется уникальность кода;
5. создается сущность `Lot` со статусом `Draft`;
6. создается стартовая запись в `LotStatusHistory`;
7. сохраняются позиции лота.

#### Обновление лота

Обновление реализовано в модели "replace whole collection":

1. обновляются основные поля лота;
2. старые `LotItem` загружаются;
3. старые элементы удаляются;
4. новые элементы создаются заново из нормализованного запроса.

То есть сейчас нет дифф-обновления позиций; используется полная замена набора.

#### Переходы статусов лота

Переход выполняется через `TransitionAsync`.

Алгоритм:

1. лот загружается;
2. запрещается переход в тот же статус;
3. `LotTransitionPolicy` проверяет допустимость перехода и обязательность причины;
4. создается `LotStatusHistory`;
5. новый статус записывается в `Lot`.

История статусов является обязательной частью всех переходов.

### 5.3. Рекомендации по созданию лотов из импортных данных

Ключевые классы:

- `src/Subcontractor.Application/Lots/LotRecommendationsService.cs`
- `src/Subcontractor.Application/Lots/LotRecommendationGroupingService.cs`
- `src/Subcontractor.Application/Lots/LotRecommendationApplyWorkflowService.cs`

#### Построение рекомендаций

Сценарий работает от `SourceDataImportBatch`.

Алгоритм:

1. выбираются только валидные строки batch;
2. из строк вытягиваются project codes;
3. project codes маппятся на реальные `Project.Id`;
4. строки группируются по паре `(ProjectCode, DisciplineCode)`;
5. для каждой группы генерируются suggested lot code и suggested lot name;
6. итог возвращается как список рекомендаций.

#### Применение рекомендаций

Создание реальных лотов разрешено только если batch имеет статус `ReadyForLotting`.

При применении:

1. вычисляется набор выбранных групп;
2. проверяется отсутствие конфликтов по кодам лотов;
3. для каждой группы создается новый `Lot`;
4. создаются `LotItem`;
5. пишется `LotStatusHistory`;
6. пишется reconciliation trace в `SourceDataLotReconciliationRecord`;
7. skipped группы фиксируются отдельно.

Итог: рекомендация не просто визуальная подсказка, а полноценный backend-сценарий материализации данных.

### 5.4. Закупочные процедуры

Это самый насыщенный модуль системы.

Ключевой фасад:

- `src/Subcontractor.Application/ProcurementProcedures/ProcurementProceduresService.cs`

Он делегирует работу нескольким специализированным workflow/service классам.

#### 5.4.1. Жизненный цикл карточки процедуры

Основной класс:

- `src/Subcontractor.Application/ProcurementProcedures/ProcedureLifecycleService.cs`

##### Создание процедуры

При создании:

1. валидируется запрос;
2. проверяется наличие `LotId`;
3. загружается лот;
4. проверяется, что лот находится в статусе `InProcurement`;
5. проверяется, что для этого лота еще не существует процедура;
6. создается `ProcurementProcedure` со статусом `Created`;
7. поля карточки маппятся из DTO в сущность;
8. пишется стартовая запись в `ProcurementProcedureStatusHistory`;
9. выполняется привязка request attachments;
10. изменения сохраняются.

##### Обновление процедуры

При обновлении:

1. процедура загружается;
2. поля карточки переносятся в сущность;
3. список вложений заявки ребиндится через attachment service;
4. изменения сохраняются.

##### Удаление процедуры

Удаление допускается только если процедура в одном из статусов:

- `Created`
- `DocumentsPreparation`
- `Canceled`

Для остальных статусов удаление запрещено.

Это важное бизнес-правило защиты жизненного цикла.

#### 5.4.2. Переходы статусов процедуры

Класс:

- `src/Subcontractor.Application/ProcurementProcedures/ProcedureTransitionWorkflowService.cs`

Алгоритм:

1. загружается процедура;
2. проверяется, что новый статус отличается от текущего;
3. `ProcedureTransitionPolicy` проверяет, допустим ли переход;
4. если цель — `OnApproval`, вызывается `PrepareForApprovalAsync`;
5. если цель — `Completed`, вызывается проверка требований по завершению лота;
6. через `ProcedureStatusMutationService` меняется статус и пишется история;
7. сохраняются изменения.

Иными словами, статусный переход сам по себе может запускать дополнительные под-процессы.

#### 5.4.3. Привязка файлов

Класс:

- `src/Subcontractor.Application/ProcurementProcedures/ProcedureAttachmentBindingService.cs`

Этот сервис отвечает за то, чтобы файлы:

- заявки,
- внешнего согласования,
- офферов,
- протокола результата

не были одновременно привязаны к несовместимым сущностям.

Ключевое правило:

- если файл уже привязан к другому `OwnerEntityType` или другой процедуре, операция завершается ошибкой `InvalidOperationException`.

То есть целостность файловых связей контролируется отдельно от CRUD-логики процедуры.

#### 5.4.4. Внутрисистемное согласование

Класс:

- `src/Subcontractor.Application/ProcurementProcedures/ProcedureApprovalWorkflowService.cs`

##### Конфигурация маршрута согласования

При настройке шагов:

1. проверяется, что процедура существует;
2. проверяется режим `ApprovalMode == InSystem`;
3. проверяется допустимый статус процедуры;
4. шаги нормализуются;
5. старые шаги удаляются;
6. новые шаги создаются в статусе `Pending`;
7. если шаги появились, а процедура была в `Created`, она переводится в `DocumentsPreparation`.

##### Отправка на согласование

При переходе в `OnApproval`:

1. система загружает все approval steps;
2. проверяет, что хотя бы один шаг есть;
3. сбрасывает все статусы шагов в `Pending`;
4. очищает решения, дату решения и комментарии.

##### Принятие решения по шагу

При решении:

1. процедура должна быть в статусе `OnApproval`;
2. нельзя сохранять решение со статусом `Pending`;
3. шаг должен существовать и быть pending;
4. все предыдущие обязательные шаги должны быть approved;
5. фиксируется решение, комментарий, дата и пользователь;
6. если одобрены все обязательные шаги — процедура переводится в `Sent`;
7. если текущий шаг отклонен или возвращен — процедура переводится обратно в `DocumentsPreparation`.

Здесь реализована полноценная state-machine логика approval chain.

#### 5.4.5. Внешнее согласование

Класс:

- `ProcedureExternalApprovalWorkflowService`

Логика аналогична внешнему approval-контуру:

- хранится решение внешнего согласования;
- привязывается файл протокола;
- по результату меняется статус процедуры.

#### 5.4.6. Shortlist кандидатов

Классы:

- `ProcedureShortlistWorkflowService`
- `ProcedureShortlistOrchestrationService`

##### Построение рекомендаций shortlist

Алгоритм:

1. загружается процедура;
2. запрещается строить рекомендации для `Canceled` и `Completed`;
3. пересчитывается текущая загрузка подрядчиков;
4. по `LotItem` процедуры определяются требуемые дисциплины;
5. загружаются подрядчики и их квалификации;
6. для каждого подрядчика вычисляется:
   - хватает ли квалификаций;
   - совпадает ли хотя бы часть дисциплин;
   - допустим ли статус;
   - допустим ли класс надежности;
   - не перегружен ли подрядчик;
   - recommendation score;
   - explainability factors;
7. рекомендации сортируются и возвращаются в DTO.

##### Применение рекомендаций

При применении:

1. нормализуется max included;
2. из рекомендаций выбирается допустимый shortlist;
3. строится `UpdateProcedureShortlistRequest`;
4. итог сохраняется через обычный upsert shortlist;
5. возвращается результат с рекомендациями и примененным shortlist.

Этот модуль фактически реализует explainable recommendation engine.

#### 5.4.7. Офферы участников

Класс:

- `ProcedureOffersWorkflowService`

Через этот модуль:

- читаются офферы;
- обновляются офферы;
- выполняется сравнение предложений.

При обновлении офферов также выполняются:

- привязка файлов офферов;
- обновление статуса процедуры.

#### 5.4.8. Результат процедуры

Класс:

- `src/Subcontractor.Application/ProcurementProcedures/ProcedureOutcomeWorkflowService.cs`

При фиксации результата:

1. процедура должна находиться в допустимом статусе;
2. если результат отменен, требуется `CancellationReason`;
3. если результат не отменен, требуется `WinnerContractorId`;
4. победитель должен быть активным подрядчиком;
5. победитель должен иметь оффер в этой процедуре;
6. у всех офферов обновляется `DecisionStatus`, чтобы выделить winner;
7. выполняется rebinding файла протокола результата;
8. сохраняется `ProcedureOutcome`;
9. если процедура отменена, она переводится в `Retender`, а лот — в `InProcurement`;
10. если победитель выбран, процедура переводится в `DecisionMade`, а лот — в `ContractorSelected`.

Это один из самых важных orchestrated сценариев во всей системе, потому что он синхронно меняет несколько сущностей:

- `ProcedureOffer`
- `ProcedureOutcome`
- `ProcurementProcedure`
- `Lot`

### 5.5. Договоры

Ключевые классы:

- `src/Subcontractor.Application/Contracts/ContractsService.cs`
- `src/Subcontractor.Application/Contracts/ContractLifecycleWorkflowService.cs`
- `src/Subcontractor.Application/Contracts/ContractExecutionWorkflowService.cs`

#### 5.5.1. Жизненный цикл договора

##### Создание договора

При создании:

1. валидируется запрос;
2. проверяется уникальность номера договора;
3. проверяется, что по процедуре еще нет активного договора;
4. загружается лот;
5. загружается процедура;
6. проверяется, что процедура принадлежит указанному лоту;
7. проверяется, что процедура в `DecisionMade` или `Completed`;
8. загружается подрядчик и проверяется, что он активен;
9. если по процедуре уже есть outcome с winner, подрядчик договора обязан совпадать с победителем;
10. создается `Contract`;
11. создается начальная запись `ContractStatusHistory`;
12. изменения сохраняются.

##### Генерация черновика договора из процедуры

Сценарий `CreateDraftFromProcedureAsync`:

1. проверяет, что процедура завершила отбор победителя;
2. требует наличие `ProcedureOutcome` без отмены;
3. берет победителя;
4. ищет его оффер;
5. генерирует или принимает номер договора;
6. создает черновик договора, используя данные процедуры и winning offer;
7. пишет начальную историю статуса.

Этот сценарий соединяет procurement и contracts в один бизнес-поток.

##### Обновление договора

Через обычный update:

- нельзя менять статус;
- статус меняется только через transition endpoint;
- обновляются только редактируемые атрибуты карточки.

##### Переходы статусов договора

Алгоритм:

1. загружается договор;
2. запрещается переход в тот же статус;
3. `ContractTransitionPolicy` проверяет допустимость перехода;
4. валидируется состояние данных для target status;
5. если target status = `Closed`, проверяется отсутствие просроченных milestones;
6. создается `ContractStatusHistory`;
7. статус меняется;
8. выполняется сохранение.

#### 5.5.2. Исполнение договора

Класс:

- `src/Subcontractor.Application/Contracts/ContractExecutionWorkflowService.cs`

Редактирование исполнительных данных разрешено только если договор имеет статус:

- `Signed`
- `Active`

##### Milestones

При upsert milestones:

1. проверяется editable status;
2. все входные items нормализуются;
3. старые milestones удаляются;
4. новые milestones создаются заново;
5. данные перечитываются и возвращаются как DTO.

##### Monitoring control points

Аналогично:

1. editable check;
2. нормализация control points;
3. удаление старых control points и nested stages;
4. создание новых;
5. сохранение и возврат DTO.

##### MDR cards

Логика та же:

1. editable check;
2. нормализация cards;
3. удаление старых cards и rows;
4. создание новых;
5. сохранение и возврат DTO.

##### Импорт MDR forecast/fact

Алгоритм:

1. editable check;
2. нормализация импортируемых строк;
3. загрузка текущих MDR cards;
4. построение индекса строк для сопоставления;
5. выявление конфликтов и неоднозначностей;
6. применение обновлений только если конфликтов нет либо включен `SkipConflicts`;
7. сохранение;
8. возврат результата импорта и актуального снимка данных.

То есть это не тупая загрузка поверх таблиц, а controlled merge-сценарий.

### 5.6. Подрядчики

Ключевые классы:

- `src/Subcontractor.Application/Contractors/ContractorsService.cs`
- `src/Subcontractor.Application/Contractors/ContractorWriteWorkflowService.cs`

#### CRUD подрядчика

При создании:

1. валидируется DTO;
2. ИНН нормализуется;
3. проверяется уникальность ИНН;
4. создается `Contractor`;
5. создаются `ContractorQualification`.

При обновлении:

1. загружается подрядчик с квалификациями;
2. обновляются основные поля;
3. рассчитывается разница между текущим и новым набором дисциплин;
4. лишние квалификации удаляются;
5. недостающие квалификации добавляются.

#### Пересчет текущей загрузки подрядчика

Сервис считает:

- man-hours по `LotItem` для договоров со статусами `Signed` и `Active`;
- затем через `ContractorLoadCalculationPolicy` переводит это в `CurrentLoadPercent`.

Это используется и вручную из API, и внутри других сценариев.

### 5.7. Рейтинг подрядчиков

Ключевые классы:

- `src/Subcontractor.Application/ContractorRatings/ContractorRatingsService.cs`
- `src/Subcontractor.Application/ContractorRatings/ContractorRatingModelLifecycleService.cs`
- `src/Subcontractor.Application/ContractorRatings/ContractorRatingWriteWorkflowService.cs`
- `src/Subcontractor.Application/ContractorRatings/ContractorRatingRecalculationWorkflowService.cs`

Контур рейтингов состоит из трех основных частей:

- активная модель оценки;
- ручные экспертные корректировки;
- пересчет итогового рейтинга и истории.

#### Активная модель

Система всегда пытается гарантировать наличие активной rating model.

Через lifecycle service:

- создается или обновляется активная модель;
- хранятся веса факторов;
- нормализуются и валидируются параметры модели.

#### Ручная оценка

При ручной оценке:

1. проверяется диапазон score `[0..5]`;
2. подрядчик должен существовать;
3. обеспечивается наличие активной модели;
4. создается `ContractorRatingManualAssessment`;
5. вызывается recalculation workflow;
6. обновляется история рейтинга и текущий рейтинг подрядчика.

#### Пересчет рейтингов

При массовом пересчете:

1. обеспечивается наличие активной модели;
2. выбирается набор подрядчиков;
3. для каждого подрядчика пересчитываются факторы;
4. создаются `ContractorRatingHistoryEntry`;
5. обновляется текущий рейтинг подрядчика.

Таким образом, история рейтинга — не derived-only отчет, а полноценный persisted audit trail.

### 5.8. Импорт исходных данных

Ключевые классы:

- `src/Subcontractor.Application/Imports/SourceDataImportsService.cs`
- `src/Subcontractor.Application/Imports/SourceDataImportWriteWorkflowService.cs`
- `src/Subcontractor.Application/Imports/SourceDataImportBatchProcessingWorkflowService.cs`
- `src/Subcontractor.Application/Imports/XmlSourceDataImportInboxService.cs`
- `src/Subcontractor.Application/Imports/XmlSourceDataImportInboxProcessingWorkflowService.cs`

#### Синхронная загрузка batch

При `CreateBatchAsync`:

1. запрос нормализуется;
2. собираются project codes;
3. из БД загружается набор существующих проектов;
4. каждая строка нормализуется и валидируется;
5. считаются total/valid/invalid rows;
6. batch сразу получает статус `Validated` или `ValidatedWithErrors`;
7. создается стартовая запись status history;
8. сохраняется batch и строки.

#### Асинхронная загрузка batch

При `CreateBatchQueuedAsync`:

1. batch принимается в статусе `Uploaded`;
2. строки приводятся к queued-upload виду без полной валидации;
3. пишется history "uploaded for asynchronous processing".

Дальше пакет подбирается фоновым worker.

#### Фоновая обработка queued batch

Класс:

- `SourceDataImportBatchProcessingWorkflowService`

Алгоритм:

1. выбирается самый старый batch в статусе `Uploaded`;
2. batch переводится в `Processing`;
3. пишется history;
4. строки валидируются;
5. считаются total/valid/invalid;
6. итоговый статус становится `Validated` или `ValidatedWithErrors`;
7. при исключении batch переводится в `Failed`.

#### XML inbox

XML-контур реализован отдельно:

1. XML кладется в `XmlSourceDataImportInboxItem` со статусом `Received`;
2. worker подбирает oldest item;
3. item переводится в `Processing`;
4. XML парсится в строки;
5. если строк нет, запись падает в `Failed`;
6. иначе создается обычный queued batch;
7. inbox item помечается `Completed` и хранит ссылку на созданный batch.

Этот механизм превращает XML в upstream-источник для обычного source-data pipeline.

### 5.9. Dashboard

Ключевой класс:

- `src/Subcontractor.Application/Dashboard/DashboardService.cs`

Dashboard собирается не одним монолитным SQL-запросом, а несколькими query services:

- `DashboardCountersAndStatusesQueryService`
- `DashboardPerformanceMetricsQueryService`
- `DashboardImportPipelineQueryService`
- `DashboardMyTasksQueryService`
- `DashboardUserContextResolverService`

Алгоритм:

1. определяется текущий пользователь и набор его permissions;
2. если контекст пользователя не разрешается, возвращается empty summary;
3. по permissions решается, какие разделы можно собирать;
4. независимо друг от друга строятся:
   - counters and statuses;
   - overdue;
   - KPI;
   - import pipeline;
   - my tasks;
5. все части объединяются в `DashboardSummaryDto`.

Таким образом, бизнес-логика дашборда permission-aware и user-context-aware.

### 5.10. Analytics

Ключевые классы:

- `src/Subcontractor.Application/Analytics/AnalyticsService.cs`
- `src/Subcontractor.Application/Analytics/AnalyticsKpiDashboardQueryService.cs`

Этот модуль реализует read-side аналитику.

Основные метрики:

- воронка лотов по статусам;
- средняя и критическая загрузка подрядчиков;
- средний рейтинг подрядчиков;
- SLA warnings / overdue / resolved;
- объемы контрактования;
- MDR coverage;
- доля субподряда;
- топ подрядчиков по рейтингу.

Для части запросов используются compiled EF queries, чтобы снизить накладные расходы на повторяющиеся аналитические вызовы.

### 5.11. SLA

Ключевые классы:

- `src/Subcontractor.Application/Sla/SlaMonitoringService.cs`
- `src/Subcontractor.Application/Sla/SlaMonitoringCycleWorkflowService.cs`
- `SlaRuleAndViolationAdministrationService`
- `SlaViolationCandidateQueryService`

Логика делится на:

- администрирование правил;
- мониторинг нарушений;
- рассылку уведомлений.

#### Мониторинговый цикл

Алгоритм:

1. загружаются пороги warning days по типам закупок;
2. формируются активные кандидаты нарушений;
3. по каждому кандидату либо создается новый `SlaViolation`, либо обновляется существующий;
4. ранее открытые нарушения, которых больше нет среди active candidates, закрываются;
5. если включена рассылка, для нарушений без отправленного уведомления делается попытка email-отправки;
6. фиксируются success/failure метрики рассылки;
7. цикл сохраняет изменения и возвращает run result.

То есть SLA-контур — это stateful background reconciliation между кандидатами нарушений и persisted violation store.

### 5.12. Администрирование пользователей и ролей

Ключевые классы:

- `src/Subcontractor.Application/UsersAdministration/UsersAdministrationService.cs`
- `UsersAdministrationReadQueryService`
- `UsersAdministrationWriteWorkflowService`

Этот модуль:

- читает пользователей;
- читает роли;
- обновляет назначение ролей пользователю.

Бизнес-логика здесь в основном связана с governance контурами безопасности.

## 6. Как реализованы фоновые процессы

Фоновые процессы подключаются в:

- `src/Subcontractor.Web/Configuration/WebServiceCollectionExtensions.cs`

Если включен `EnableEmbeddedWorkers`, внутри web-host поднимаются:

- `SourceDataImportProcessingWorker`
- `SlaMonitoringWorker`
- `ContractorRatingWorker`

### 6.1. Import worker

- обрабатывает XML inbox;
- затем обрабатывает queued source-data batches;
- если работы нет, уходит в короткий idle delay.

### 6.2. SLA worker

- периодически запускает `RunMonitoringCycleAsync(sendNotifications: true)`;
- логирует количество активных нарушений и отправок.

### 6.3. Contractor rating worker

- периодически запускает массовый пересчет рейтингов;
- может ограничивать расчеты только активными подрядчиками;
- логирует результат цикла.

То есть значимая часть бизнес-логики в системе выполняется не только синхронно от пользователя, но и асинхронно по расписанию.

## 7. Где реально находятся бизнес-правила

В текущем проекте бизнес-правила сосредоточены в следующих местах:

### 7.1. Валидация входных данных

Обычно живет в `*RequestPolicy` и `*ValidationPolicy`, например:

- `ProjectRequestPolicy`
- `ProcedureRequestValidationPolicy`
- `ContractRequestValidationPolicy`
- `SourceDataImportBatchRequestPolicy`

### 7.2. Переходы статусов

Обычно живут в `*TransitionPolicy`, например:

- `LotTransitionPolicy`
- `ProcedureTransitionPolicy`
- `ContractTransitionPolicy`
- `SourceDataImportTransitionPolicy`

### 7.3. Нормализация данных

Обычно живет в `*NormalizationPolicy`, например:

- `ContractMilestoneNormalizationPolicy`
- `ContractMdrNormalizationPolicy`
- `SourceDataImportRowNormalizationPolicy`
- `ProcedureApprovalStepNormalizationPolicy`

### 7.4. Оркестрация нескольких сущностей

Живет в `*WorkflowService`, например:

- `ProcedureOutcomeWorkflowService`
- `ContractExecutionWorkflowService`
- `SourceDataImportBatchProcessingWorkflowService`
- `SlaMonitoringCycleWorkflowService`

### 7.5. Построение DTO

Живет в `*ProjectionPolicy` и query services.

## 8. Жизненный цикл основных сущностей

### 8.1. Проект

1. создается проект;
2. проект связывается с лотами;
3. доступ к проекту ограничивается read-scope политикой.

### 8.2. Лот

1. создается как `Draft`;
2. переходит в `InProcurement`;
3. для него создается закупочная процедура;
4. после выбора победителя переходит в `ContractorSelected`;
5. после заключения договора и исполнения проходит дальнейшие статусы жизненного цикла.

### 8.3. Закупочная процедура

1. создается на лот;
2. подготавливается документация;
3. при необходимости проходит согласование;
4. отправляется;
5. получает офферы;
6. формирует shortlist;
7. фиксирует outcome;
8. переводится в `DecisionMade`, `Retender` или `Completed`.

### 8.4. Договор

1. создается вручную или как draft из процедуры;
2. проходит собственную status machine;
3. обрастает milestones, control points, MDR cards;
4. участвует в расчетах SLA, analytics и contractor load;
5. закрывается при выполнении ограничений.

### 8.5. Подрядчик

1. хранит квалификации;
2. получает текущую загрузку;
3. получает текущий рейтинг;
4. участвует в shortlist и выборе победителя;
5. его история рейтингов накапливается во времени.

## 9. Практический вывод по текущей реализации

В текущем приложении бизнес-логика реализована последовательно и довольно прозрачно:

- контроллеры тонкие;
- application layer является главным носителем правил;
- инфраструктура скрыта за абстракциями;
- статусные переходы почти всегда сопровождаются history entries;
- асинхронные процессы встроены в ту же бизнес-модель, а не реализованы отдельно "поверх";
- связи между procurement, lots, contracts, contractors, imports и SLA выражены явно.

При этом система ближе к application-service architecture, чем к rich domain model:

- сущности в `Domain` в основном описывают состояние;
- правила и решения находятся в сервисах и workflow-классах;
- orchestration между несколькими агрегатами реализована явно в application layer.

Это важно учитывать при дальнейшей доработке проекта:

- новые бизнес-правила логичнее добавлять рядом с текущими workflow/policy классами;
- не стоит переносить сложную логику во frontend;
- cross-entity сценарии лучше продолжать оформлять как отдельные orchestration/workflow сервисы.
