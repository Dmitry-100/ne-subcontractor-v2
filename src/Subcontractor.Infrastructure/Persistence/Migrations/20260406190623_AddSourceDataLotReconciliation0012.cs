using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subcontractor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSourceDataLotReconciliation0012 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SourceDataLotReconciliationRecordsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SourceDataImportBatchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ApplyOperationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecommendationGroupKey = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    ProjectCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    DisciplineCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    RequestedLotCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    RequestedLotName = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    SourceRowsCount = table.Column<int>(type: "int", nullable: false),
                    TotalManHours = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PlannedStartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PlannedFinishDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsCreated = table.Column<bool>(type: "bit", nullable: false),
                    LotId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SkipReason = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SourceDataLotReconciliationRecordsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SourceDataLotReconciliationRecordsSet_LotsSet_LotId",
                        column: x => x.LotId,
                        principalTable: "LotsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SourceDataLotReconciliationRecordsSet_SourceDataImportBatchesSet_SourceDataImportBatchId",
                        column: x => x.SourceDataImportBatchId,
                        principalTable: "SourceDataImportBatchesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SourceDataLotReconciliationRecordsSet_ApplyOperationId",
                table: "SourceDataLotReconciliationRecordsSet",
                column: "ApplyOperationId");

            migrationBuilder.CreateIndex(
                name: "IX_SourceDataLotReconciliationRecordsSet_IsCreated",
                table: "SourceDataLotReconciliationRecordsSet",
                column: "IsCreated");

            migrationBuilder.CreateIndex(
                name: "IX_SourceDataLotReconciliationRecordsSet_LotId",
                table: "SourceDataLotReconciliationRecordsSet",
                column: "LotId");

            migrationBuilder.CreateIndex(
                name: "IX_SourceDataLotReconciliationRecordsSet_SourceDataImportBatchId",
                table: "SourceDataLotReconciliationRecordsSet",
                column: "SourceDataImportBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_SourceDataLotReconciliationRecordsSet_SourceDataImportBatchId_CreatedAtUtc",
                table: "SourceDataLotReconciliationRecordsSet",
                columns: new[] { "SourceDataImportBatchId", "CreatedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SourceDataLotReconciliationRecordsSet");
        }
    }
}
