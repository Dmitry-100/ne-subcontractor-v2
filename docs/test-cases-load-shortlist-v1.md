# Test Cases: Load / Shortlist v1

## Scope

Regression baseline for Sprint 15 foundation:

- contractor load recalculation;
- shortlist recommendation;
- shortlist apply + adjustment logging.

## Automated integration coverage

1. `ContractorLoadCalculationTests.RecalculateCurrentLoadsAsync_ShouldUpdateActiveContractorLoadPercent`
   - verifies load formula from active contracts and lot man-hours.
2. `ProcedureShortlistRecommendationsTests.BuildShortlistRecommendationsAsync_ShouldReturnExplainableCandidates`
   - verifies recommendation eligibility, overload exclusion, missing-qualification explanation.
3. `ProcedureShortlistRecommendationsTests.ApplyShortlistRecommendationsAsync_ShouldPersistShortlistAndAdjustmentLogs`
   - verifies apply flow and adjustment journal persistence.
4. `ProcurementProceduresControllerShortlistTests.GetShortlistRecommendations_UnknownProcedure_ShouldReturnNotFound`
   - verifies controller not-found behavior.
5. `ProcurementProceduresControllerShortlistTests.ApplyShortlistRecommendations_ShouldReturnOkPayload`
   - verifies controller apply endpoint contract.

## Manual smoke checklist

1. Call `POST /api/contractors/recalculate-load` and verify updated counter > 0 on seeded data.
2. Call `GET /api/procedures/{id}/shortlist/recommendations`.
3. Validate recommendation factors for:
   - blocked contractor;
   - overloaded contractor;
   - missing qualification contractor.
4. Call `POST /api/procedures/{id}/shortlist/recommendations/apply`.
5. Call `GET /api/procedures/{id}/shortlist` and verify top recommended candidates persisted.
6. Call `GET /api/procedures/{id}/shortlist/adjustments` and verify reason/audit entries exist.

## UI smoke checklist (Procedures page)

1. Open `/procedures` and select procedure in status not equal to `Completed`/`Canceled`.
2. In section `Автоподбор shortlist` click `Сформировать рекомендации`.
3. Verify recommendation grid contains explainability fields:
   - `Score`;
   - `Надёжность`;
   - `Загрузка, %`;
   - `Отсутствуют дисциплины`;
   - `Факторы решения`.
4. Set `Макс. в shortlist`, fill `Причина применения/корректировки`, click `Применить в shortlist`.
5. Verify journal grid `Журнал корректировок shortlist` refreshes and contains new row(s) with:
   - `Причина корректировки`;
   - `Кто изменил`;
   - old/new inclusion flags and sort order.
