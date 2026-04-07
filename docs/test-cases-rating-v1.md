# Test Cases: Rating v1

## Functional cases

1. Read active model:
   - call `GET /api/contractors/rating/model`;
   - verify non-empty weight list and active version metadata.

2. Create new active model:
   - call `PUT /api/contractors/rating/model` with custom weights;
   - verify previous version is deactivated and new version is active.

3. Recalculate all active contractors:
   - call `POST /api/contractors/rating/recalculate`;
   - verify `ProcessedContractors` and `UpdatedContractors` counters.

4. Recalculate specific contractor:
   - call `POST /api/contractors/rating/recalculate` with `contractorId`;
   - verify result is limited to one contractor.

5. Manual GIP assessment:
   - call `POST /api/contractors/{id}/rating/manual-assessment`;
   - verify manual assessment record is stored and history source is `ManualAssessment`.

6. History read:
   - call `GET /api/contractors/{id}/rating/history`;
   - verify descending timeline and populated factor scores.

7. Analytics read:
   - call `GET /api/contractors/rating/analytics`;
   - verify current rating, load, and delta fields.

## Negative cases

1. Manual score out of range (`<0` or `>5`) returns `400`.
2. Unknown contractor in manual-assessment or targeted recalculation returns `404`.
3. Invalid weight payload (duplicate factor or non-positive sum) returns `400`.

## Automated coverage

- `ContractorRatingsServiceTests`
- `ContractorsControllerRatingTests`
