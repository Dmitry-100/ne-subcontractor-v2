using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace Subcontractor.Infrastructure.Persistence.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260406225500_AddAnalyticsViews0017")]
public partial class AddAnalyticsViews0017 : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        CreateOrReplaceView(
            migrationBuilder,
            "vwAnalytics_LotFunnel",
            """
            SELECT
                l.Status AS StatusCode,
                CASE l.Status
                    WHEN 1 THEN N'Draft'
                    WHEN 2 THEN N'InProcurement'
                    WHEN 3 THEN N'ContractorSelected'
                    WHEN 4 THEN N'Contracted'
                    WHEN 5 THEN N'InExecution'
                    WHEN 6 THEN N'Closed'
                    ELSE N'Unknown'
                END AS StatusName,
                COUNT_BIG(*) AS LotCount
            FROM LotsSet AS l
            WHERE l.IsDeleted = 0
            GROUP BY l.Status
            """);

        CreateOrReplaceView(
            migrationBuilder,
            "vwAnalytics_ContractorLoad",
            """
            SELECT
                c.Id AS ContractorId,
                c.Inn,
                c.Name,
                c.City,
                c.Status AS ContractorStatusCode,
                c.ReliabilityClass AS ReliabilityClassCode,
                c.CurrentRating,
                c.CurrentLoadPercent,
                c.CapacityHours,
                CAST(
                    SUM(CASE WHEN ctr.Status IN (3, 4, 5) THEN ISNULL(li.ManHours, 0) ELSE 0 END)
                    AS decimal(18,2)
                ) AS ContractedManHours
            FROM ContractorsSet AS c
            LEFT JOIN ContractsSet AS ctr
                ON ctr.ContractorId = c.Id
                AND ctr.IsDeleted = 0
            LEFT JOIN LotsSet AS lot
                ON lot.Id = ctr.LotId
                AND lot.IsDeleted = 0
            LEFT JOIN LotItemsSet AS li
                ON li.LotId = lot.Id
            WHERE c.IsDeleted = 0
            GROUP BY
                c.Id,
                c.Inn,
                c.Name,
                c.City,
                c.Status,
                c.ReliabilityClass,
                c.CurrentRating,
                c.CurrentLoadPercent,
                c.CapacityHours
            """);

        CreateOrReplaceView(
            migrationBuilder,
            "vwAnalytics_SlaMetrics",
            """
            SELECT
                v.Severity AS SeverityCode,
                v.IsResolved,
                COUNT_BIG(*) AS ViolationCount,
                MAX(v.LastDetectedAtUtc) AS LastDetectedAtUtc
            FROM SlaViolationsSet AS v
            GROUP BY v.Severity, v.IsResolved
            """);

        CreateOrReplaceView(
            migrationBuilder,
            "vwAnalytics_ContractingAmounts",
            """
            SELECT
                c.Status AS ContractStatusCode,
                COUNT_BIG(*) AS ContractsCount,
                CAST(SUM(ISNULL(c.TotalAmount, 0)) AS decimal(18,2)) AS TotalAmount
            FROM ContractsSet AS c
            WHERE c.IsDeleted = 0
            GROUP BY c.Status
            """);

        CreateOrReplaceView(
            migrationBuilder,
            "vwAnalytics_MdrProgress",
            """
            SELECT
                card.Id AS CardId,
                card.ContractId,
                card.Title AS CardTitle,
                card.ReportingDate,
                COUNT_BIG(row.Id) AS RowsTotal,
                SUM(CASE WHEN row.FactValue > 0 THEN 1 ELSE 0 END) AS RowsWithFact,
                CAST(
                    CASE
                        WHEN COUNT_BIG(row.Id) = 0 THEN NULL
                        ELSE SUM(CASE WHEN row.FactValue > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT_BIG(row.Id)
                    END
                    AS decimal(9,2)
                ) AS FactCoveragePercent
            FROM ContractMdrCardsSet AS card
            LEFT JOIN ContractMdrRowsSet AS row
                ON row.CardId = card.Id
                AND row.IsDeleted = 0
            WHERE card.IsDeleted = 0
            GROUP BY card.Id, card.ContractId, card.Title, card.ReportingDate
            """);

        CreateOrReplaceView(
            migrationBuilder,
            "vwAnalytics_SubcontractingShare",
            """
            SELECT
                CAST(SUM(li.ManHours) AS decimal(18,2)) AS TotalPlannedManHours,
                CAST(SUM(CASE WHEN contracted.LotId IS NOT NULL THEN li.ManHours ELSE 0 END) AS decimal(18,2)) AS ContractedManHours,
                CAST(
                    CASE
                        WHEN SUM(li.ManHours) = 0 THEN NULL
                        ELSE SUM(CASE WHEN contracted.LotId IS NOT NULL THEN li.ManHours ELSE 0 END) * 100.0 / SUM(li.ManHours)
                    END
                    AS decimal(9,2)
                ) AS SharePercent
            FROM LotItemsSet AS li
            INNER JOIN LotsSet AS lot
                ON lot.Id = li.LotId
                AND lot.IsDeleted = 0
            LEFT JOIN (
                SELECT DISTINCT c.LotId
                FROM ContractsSet AS c
                WHERE c.IsDeleted = 0
                  AND c.Status IN (3, 4, 5)
            ) AS contracted
                ON contracted.LotId = lot.Id
            """);

        CreateOrReplaceView(
            migrationBuilder,
            "vwAnalytics_ContractorRatings",
            """
            WITH latest AS (
                SELECT
                    h.ContractorId,
                    h.ModelVersionId,
                    h.FinalScore,
                    h.CalculatedAtUtc,
                    ROW_NUMBER() OVER (
                        PARTITION BY h.ContractorId
                        ORDER BY h.CalculatedAtUtc DESC, h.CreatedAtUtc DESC
                    ) AS rn
                FROM ContractorRatingHistoryEntriesSet AS h
            )
            SELECT
                c.Id AS ContractorId,
                c.Inn,
                c.Name,
                c.Status AS ContractorStatusCode,
                c.ReliabilityClass AS ReliabilityClassCode,
                c.CurrentRating,
                c.CurrentLoadPercent,
                latest.FinalScore AS LastFinalScore,
                latest.CalculatedAtUtc AS LastCalculatedAtUtc,
                model.VersionCode AS ModelVersionCode
            FROM ContractorsSet AS c
            LEFT JOIN latest
                ON latest.ContractorId = c.Id
               AND latest.rn = 1
            LEFT JOIN ContractorRatingModelVersionsSet AS model
                ON model.Id = latest.ModelVersionId
            WHERE c.IsDeleted = 0
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        DropViewIfExists(migrationBuilder, "vwAnalytics_ContractorRatings");
        DropViewIfExists(migrationBuilder, "vwAnalytics_SubcontractingShare");
        DropViewIfExists(migrationBuilder, "vwAnalytics_MdrProgress");
        DropViewIfExists(migrationBuilder, "vwAnalytics_ContractingAmounts");
        DropViewIfExists(migrationBuilder, "vwAnalytics_SlaMetrics");
        DropViewIfExists(migrationBuilder, "vwAnalytics_ContractorLoad");
        DropViewIfExists(migrationBuilder, "vwAnalytics_LotFunnel");
    }

    private static void CreateOrReplaceView(MigrationBuilder migrationBuilder, string viewName, string definitionSql)
    {
        DropViewIfExists(migrationBuilder, viewName);
        var escapedDefinition = definitionSql.Replace("'", "''");

        migrationBuilder.Sql(
            $"""
            EXEC(N'CREATE VIEW dbo.{viewName} AS
            {escapedDefinition}');
            """);
    }

    private static void DropViewIfExists(MigrationBuilder migrationBuilder, string viewName)
    {
        migrationBuilder.Sql(
            $"""
            IF OBJECT_ID(N'dbo.{viewName}', N'V') IS NOT NULL
                DROP VIEW dbo.{viewName};
            """);
    }
}
