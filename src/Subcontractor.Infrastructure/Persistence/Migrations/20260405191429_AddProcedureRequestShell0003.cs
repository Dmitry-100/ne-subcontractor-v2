using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subcontractor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProcedureRequestShell0003 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "WorkScope",
                table: "ProceduresSet",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "LeadOfficeCode",
                table: "ProceduresSet",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "CustomerContractNumber",
                table: "ProceduresSet",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AnalyticsLevel1Code",
                table: "ProceduresSet",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AnalyticsLevel2Code",
                table: "ProceduresSet",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AnalyticsLevel3Code",
                table: "ProceduresSet",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AnalyticsLevel4Code",
                table: "ProceduresSet",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AnalyticsLevel5Code",
                table: "ProceduresSet",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ApprovalMode",
                table: "ProceduresSet",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ApprovalRouteCode",
                table: "ProceduresSet",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "ProceduresSet",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PlannedBudgetWithoutVat",
                table: "ProceduresSet",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProposalDueDate",
                table: "ProceduresSet",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RequestDate",
                table: "ProceduresSet",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProcedureStatusHistorySet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProcedureId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FromStatus = table.Column<int>(type: "int", nullable: true),
                    ToStatus = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcedureStatusHistorySet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProcedureStatusHistorySet_ProceduresSet_ProcedureId",
                        column: x => x.ProcedureId,
                        principalTable: "ProceduresSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureStatusHistorySet_ProcedureId",
                table: "ProcedureStatusHistorySet",
                column: "ProcedureId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProcedureStatusHistorySet");

            migrationBuilder.DropColumn(
                name: "AnalyticsLevel1Code",
                table: "ProceduresSet");

            migrationBuilder.DropColumn(
                name: "AnalyticsLevel2Code",
                table: "ProceduresSet");

            migrationBuilder.DropColumn(
                name: "AnalyticsLevel3Code",
                table: "ProceduresSet");

            migrationBuilder.DropColumn(
                name: "AnalyticsLevel4Code",
                table: "ProceduresSet");

            migrationBuilder.DropColumn(
                name: "AnalyticsLevel5Code",
                table: "ProceduresSet");

            migrationBuilder.DropColumn(
                name: "ApprovalMode",
                table: "ProceduresSet");

            migrationBuilder.DropColumn(
                name: "ApprovalRouteCode",
                table: "ProceduresSet");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "ProceduresSet");

            migrationBuilder.DropColumn(
                name: "PlannedBudgetWithoutVat",
                table: "ProceduresSet");

            migrationBuilder.DropColumn(
                name: "ProposalDueDate",
                table: "ProceduresSet");

            migrationBuilder.DropColumn(
                name: "RequestDate",
                table: "ProceduresSet");

            migrationBuilder.AlterColumn<string>(
                name: "WorkScope",
                table: "ProceduresSet",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(4000)",
                oldMaxLength: 4000);

            migrationBuilder.AlterColumn<string>(
                name: "LeadOfficeCode",
                table: "ProceduresSet",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64);

            migrationBuilder.AlterColumn<string>(
                name: "CustomerContractNumber",
                table: "ProceduresSet",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(128)",
                oldMaxLength: 128,
                oldNullable: true);
        }
    }
}
