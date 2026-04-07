using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subcontractor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProcedureShortlistAutomation0015 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProcedureShortlistAdjustmentLogsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OperationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProcedureId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ContractorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PreviousIsIncluded = table.Column<bool>(type: "bit", nullable: true),
                    NewIsIncluded = table.Column<bool>(type: "bit", nullable: false),
                    PreviousSortOrder = table.Column<int>(type: "int", nullable: true),
                    NewSortOrder = table.Column<int>(type: "int", nullable: false),
                    PreviousExclusionReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    NewExclusionReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcedureShortlistAdjustmentLogsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProcedureShortlistAdjustmentLogsSet_ContractorsSet_ContractorId",
                        column: x => x.ContractorId,
                        principalTable: "ContractorsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProcedureShortlistAdjustmentLogsSet_ProceduresSet_ProcedureId",
                        column: x => x.ProcedureId,
                        principalTable: "ProceduresSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureShortlistAdjustmentLogsSet_ContractorId",
                table: "ProcedureShortlistAdjustmentLogsSet",
                column: "ContractorId");

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureShortlistAdjustmentLogsSet_OperationId",
                table: "ProcedureShortlistAdjustmentLogsSet",
                column: "OperationId");

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureShortlistAdjustmentLogsSet_ProcedureId",
                table: "ProcedureShortlistAdjustmentLogsSet",
                column: "ProcedureId");

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureShortlistAdjustmentLogsSet_ProcedureId_CreatedAtUtc",
                table: "ProcedureShortlistAdjustmentLogsSet",
                columns: new[] { "ProcedureId", "CreatedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProcedureShortlistAdjustmentLogsSet");
        }
    }
}
