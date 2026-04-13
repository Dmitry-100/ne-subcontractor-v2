-- SQL Server top-query evidence script for SubcontractorV2 (SQL Server 2016 compatible)
-- Usage:
-- 1) connect to target staging/prod-like SQL Server
-- 2) run script in read-only mode
-- 3) save output and attach to performance evidence pack

SET NOCOUNT ON;

PRINT '=== Server / DB context ===';
SELECT
    @@SERVERNAME AS ServerName,
    DB_NAME() AS DatabaseName,
    GETUTCDATE() AS CapturedAtUtc;

PRINT '=== Top statements by total elapsed time (current plan cache) ===';
SELECT TOP (30)
    qs.execution_count,
    CAST(qs.total_elapsed_time / 1000.0 AS DECIMAL(18, 2)) AS total_elapsed_ms,
    CAST(qs.total_worker_time / 1000.0 AS DECIMAL(18, 2)) AS total_cpu_ms,
    qs.total_logical_reads,
    qs.total_logical_writes,
    CAST((qs.total_elapsed_time / NULLIF(qs.execution_count, 0)) / 1000.0 AS DECIMAL(18, 2)) AS avg_elapsed_ms,
    CAST(qs.max_elapsed_time / 1000.0 AS DECIMAL(18, 2)) AS max_elapsed_ms,
    qs.last_execution_time,
    SUBSTRING(
        st.[text],
        (qs.statement_start_offset / 2) + 1,
        (
            CASE qs.statement_end_offset
                WHEN -1 THEN DATALENGTH(st.[text])
                ELSE qs.statement_end_offset
            END - qs.statement_start_offset
        ) / 2 + 1
    ) AS statement_text
FROM sys.dm_exec_query_stats AS qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) AS st
OUTER APPLY
(
    SELECT TOP (1) CONVERT(INT, pa.[value]) AS dbid
    FROM sys.dm_exec_plan_attributes(qs.plan_handle) AS pa
    WHERE pa.attribute = 'dbid'
) AS db_attr
WHERE COALESCE(st.dbid, db_attr.dbid, DB_ID()) = DB_ID()
ORDER BY qs.total_elapsed_time DESC;

PRINT '=== Query Store top statements (if enabled) ===';
IF EXISTS
(
    SELECT 1
    FROM sys.database_query_store_options
    WHERE actual_state_desc IN ('READ_ONLY', 'READ_WRITE')
)
BEGIN
    SELECT TOP (30)
        qsq.query_id,
        qsp.plan_id,
        qsrs.count_executions,
        CAST(qsrs.avg_duration / 1000.0 AS DECIMAL(18, 2)) AS avg_duration_ms,
        CAST(qsrs.last_duration / 1000.0 AS DECIMAL(18, 2)) AS last_duration_ms,
        CAST(qsrs.max_duration / 1000.0 AS DECIMAL(18, 2)) AS max_duration_ms,
        qsrs.avg_cpu_time,
        qsrs.avg_logical_io_reads,
        qsrs.last_execution_time,
        LEFT(qst.query_sql_text, 4000) AS query_sql_text
    FROM sys.query_store_runtime_stats AS qsrs
    INNER JOIN sys.query_store_plan AS qsp
        ON qsp.plan_id = qsrs.plan_id
    INNER JOIN sys.query_store_query AS qsq
        ON qsq.query_id = qsp.query_id
    INNER JOIN sys.query_store_query_text AS qst
        ON qst.query_text_id = qsq.query_text_id
    ORDER BY qsrs.avg_duration DESC;
END
ELSE
BEGIN
    PRINT 'Query Store is disabled for this database.';
END

PRINT '=== Missing index hints (DMV snapshot) ===';
SELECT TOP (20)
    OBJECT_NAME(mid.[object_id], mid.database_id) AS table_name,
    migs.user_seeks + migs.user_scans AS user_reads,
    CAST(migs.avg_total_user_cost AS DECIMAL(18, 2)) AS avg_total_user_cost,
    CAST(migs.avg_user_impact AS DECIMAL(18, 2)) AS avg_user_impact,
    LEFT(mid.equality_columns, 4000) AS equality_columns,
    LEFT(mid.inequality_columns, 4000) AS inequality_columns,
    LEFT(mid.included_columns, 4000) AS included_columns
FROM sys.dm_db_missing_index_group_stats AS migs
INNER JOIN sys.dm_db_missing_index_groups AS mig
    ON mig.index_group_handle = migs.group_handle
INNER JOIN sys.dm_db_missing_index_details AS mid
    ON mid.index_handle = mig.index_handle
WHERE mid.database_id = DB_ID()
ORDER BY
    (migs.avg_total_user_cost * migs.avg_user_impact * (migs.user_seeks + migs.user_scans)) DESC;

PRINT '=== Top wait stats snapshot (instance-level) ===';
SELECT TOP (25)
    ws.wait_type,
    ws.waiting_tasks_count,
    ws.wait_time_ms,
    ws.signal_wait_time_ms,
    CAST(ws.wait_time_ms * 1.0 / NULLIF(ws.waiting_tasks_count, 0) AS DECIMAL(18, 2)) AS avg_wait_ms
FROM sys.dm_os_wait_stats AS ws
WHERE ws.waiting_tasks_count > 0
    AND ws.wait_type NOT IN
    (
        'SLEEP_TASK',
        'BROKER_TASK_STOP',
        'BROKER_TO_FLUSH',
        'SQLTRACE_BUFFER_FLUSH',
        'CLR_AUTO_EVENT',
        'CLR_MANUAL_EVENT',
        'LAZYWRITER_SLEEP',
        'XE_TIMER_EVENT',
        'XE_DISPATCHER_WAIT',
        'FT_IFTS_SCHEDULER_IDLE_WAIT',
        'REQUEST_FOR_DEADLOCK_SEARCH',
        'LOGMGR_QUEUE',
        'CHECKPOINT_QUEUE',
        'BROKER_EVENTHANDLER',
        'DISPATCHER_QUEUE_SEMAPHORE',
        'SOS_WORK_DISPATCHER',
        'SLEEP_BPOOL_FLUSH',
        'DIRTY_PAGE_POLL',
        'HADR_FILESTREAM_IOMGR_IOCOMPLETION'
    )
ORDER BY ws.wait_time_ms DESC;
