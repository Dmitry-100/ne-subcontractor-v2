-- SQL Server performance snapshot script for SubcontractorV2
-- Usage:
-- 1) connect to SQL Server 2016 compatible instance with SubcontractorV2 database
-- 2) run in SSMS with Actual Execution Plan enabled
-- 3) save output plan + IO/TIME results together with performance report

SET NOCOUNT ON;
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

-- Dashboard-like aggregation checks
SELECT
    p.Status,
    COUNT_BIG(*) AS TotalCount
FROM ProjectsSet AS p
WHERE p.IsDeleted = 0
GROUP BY p.Status;

SELECT
    l.Status,
    COUNT_BIG(*) AS TotalCount
FROM LotsSet AS l
WHERE l.IsDeleted = 0
GROUP BY l.Status;

SELECT
    pr.Status,
    COUNT_BIG(*) AS TotalCount
FROM ProceduresSet AS pr
WHERE pr.IsDeleted = 0
GROUP BY pr.Status;

SELECT
    c.Status,
    COUNT_BIG(*) AS TotalCount
FROM ContractsSet AS c
WHERE c.IsDeleted = 0
GROUP BY c.Status;

-- Registry paging checks (shape close to API paging contracts)
SELECT
    p.Id,
    p.Name,
    p.Code,
    p.Status
FROM ProjectsSet AS p
WHERE p.IsDeleted = 0
ORDER BY p.CreatedAtUtc DESC
OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY;

SELECT
    l.Id,
    l.Name,
    l.Code,
    l.Status
FROM LotsSet AS l
WHERE l.IsDeleted = 0
ORDER BY l.CreatedAtUtc DESC
OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY;

SELECT
    pr.Id,
    pr.Name,
    pr.Number,
    pr.Status
FROM ProceduresSet AS pr
WHERE pr.IsDeleted = 0
ORDER BY pr.CreatedAtUtc DESC
OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY;

SELECT
    c.Id,
    c.Number,
    c.Subject,
    c.Status
FROM ContractsSet AS c
WHERE c.IsDeleted = 0
ORDER BY c.CreatedAtUtc DESC
OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY;

SELECT
    ctr.Id,
    ctr.Name,
    ctr.Inn,
    ctr.Status
FROM ContractorsSet AS ctr
WHERE ctr.IsDeleted = 0
ORDER BY ctr.CreatedAtUtc DESC
OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY;

-- Index usage snapshot
SELECT
    OBJECT_NAME(s.object_id) AS TableName,
    i.name AS IndexName,
    s.user_seeks,
    s.user_scans,
    s.user_lookups,
    s.user_updates
FROM sys.dm_db_index_usage_stats AS s
INNER JOIN sys.indexes AS i
    ON i.object_id = s.object_id
    AND i.index_id = s.index_id
WHERE s.database_id = DB_ID()
    AND OBJECT_NAME(s.object_id) IN (
        'ProjectsSet',
        'LotsSet',
        'ProceduresSet',
        'ContractsSet',
        'ContractorsSet',
        'ContractMilestonesSet'
    )
ORDER BY TableName, IndexName;
