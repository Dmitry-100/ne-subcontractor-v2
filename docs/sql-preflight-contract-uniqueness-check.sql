-- Preflight check before migration AddContractsUniqueIndexes0018
-- Ensures there are no active duplicates that would block filtered unique indexes.

-- 1) Active duplicate contract numbers
SELECT
    c.ContractNumber,
    COUNT(*) AS ActiveCount
FROM ContractsSet AS c
WHERE c.IsDeleted = 0
GROUP BY c.ContractNumber
HAVING COUNT(*) > 1;

-- 2) Active duplicate procedure bindings (one procedure -> one active contract)
SELECT
    c.ProcedureId,
    COUNT(*) AS ActiveCount
FROM ContractsSet AS c
WHERE c.IsDeleted = 0
GROUP BY c.ProcedureId
HAVING COUNT(*) > 1;
