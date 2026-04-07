using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subcontractor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddContractMonitoringFoundation0013 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContractMdrCardsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ContractId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    ReportingDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractMdrCardsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContractMdrCardsSet_ContractsSet_ContractId",
                        column: x => x.ContractId,
                        principalTable: "ContractsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ContractMonitoringControlPointsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ContractId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    ResponsibleRole = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    PlannedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ForecastDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ActualDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ProgressPercent = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractMonitoringControlPointsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContractMonitoringControlPointsSet_ContractsSet_ContractId",
                        column: x => x.ContractId,
                        principalTable: "ContractsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ContractMdrRowsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CardId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RowCode = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    UnitCode = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    PlanValue = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ForecastValue = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    FactValue = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractMdrRowsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContractMdrRowsSet_ContractMdrCardsSet_CardId",
                        column: x => x.CardId,
                        principalTable: "ContractMdrCardsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ContractMonitoringControlPointStagesSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ControlPointId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    PlannedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ForecastDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ActualDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ProgressPercent = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractMonitoringControlPointStagesSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContractMonitoringControlPointStagesSet_ContractMonitoringControlPointsSet_ControlPointId",
                        column: x => x.ControlPointId,
                        principalTable: "ContractMonitoringControlPointsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContractMdrCardsSet_ContractId",
                table: "ContractMdrCardsSet",
                column: "ContractId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractMdrCardsSet_ContractId_ReportingDate",
                table: "ContractMdrCardsSet",
                columns: new[] { "ContractId", "ReportingDate" });

            migrationBuilder.CreateIndex(
                name: "IX_ContractMdrCardsSet_ContractId_SortOrder",
                table: "ContractMdrCardsSet",
                columns: new[] { "ContractId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_ContractMdrRowsSet_CardId",
                table: "ContractMdrRowsSet",
                column: "CardId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractMdrRowsSet_CardId_SortOrder",
                table: "ContractMdrRowsSet",
                columns: new[] { "CardId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_ContractMonitoringControlPointsSet_ContractId",
                table: "ContractMonitoringControlPointsSet",
                column: "ContractId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractMonitoringControlPointsSet_ContractId_PlannedDate",
                table: "ContractMonitoringControlPointsSet",
                columns: new[] { "ContractId", "PlannedDate" });

            migrationBuilder.CreateIndex(
                name: "IX_ContractMonitoringControlPointsSet_ContractId_SortOrder",
                table: "ContractMonitoringControlPointsSet",
                columns: new[] { "ContractId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_ContractMonitoringControlPointStagesSet_ControlPointId",
                table: "ContractMonitoringControlPointStagesSet",
                column: "ControlPointId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractMonitoringControlPointStagesSet_ControlPointId_PlannedDate",
                table: "ContractMonitoringControlPointStagesSet",
                columns: new[] { "ControlPointId", "PlannedDate" });

            migrationBuilder.CreateIndex(
                name: "IX_ContractMonitoringControlPointStagesSet_ControlPointId_SortOrder",
                table: "ContractMonitoringControlPointStagesSet",
                columns: new[] { "ControlPointId", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContractMdrRowsSet");

            migrationBuilder.DropTable(
                name: "ContractMonitoringControlPointStagesSet");

            migrationBuilder.DropTable(
                name: "ContractMdrCardsSet");

            migrationBuilder.DropTable(
                name: "ContractMonitoringControlPointsSet");
        }
    }
}
