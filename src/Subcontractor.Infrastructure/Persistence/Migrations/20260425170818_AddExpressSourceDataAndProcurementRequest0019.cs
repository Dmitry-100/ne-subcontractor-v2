using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subcontractor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddExpressSourceDataAndProcurementRequest0019 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "DisciplineCode",
                table: "SourceDataImportRowsSet",
                type: "nvarchar(512)",
                maxLength: 512,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64);

            migrationBuilder.AddColumn<string>(
                name: "BranchOfficeName",
                table: "SourceDataImportRowsSet",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ComplexProjectName",
                table: "SourceDataImportRowsSet",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "GipName",
                table: "SourceDataImportRowsSet",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ProjectName",
                table: "SourceDataImportRowsSet",
                type: "nvarchar(512)",
                maxLength: 512,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ResourceDisciplineName",
                table: "SourceDataImportRowsSet",
                type: "nvarchar(512)",
                maxLength: 512,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "DisciplineCode",
                table: "LotItemsSet",
                type: "nvarchar(512)",
                maxLength: 512,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64);

            migrationBuilder.AlterColumn<string>(
                name: "DisciplineCode",
                table: "ContractorQualificationsSet",
                type: "nvarchar(512)",
                maxLength: 512,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64);

            migrationBuilder.CreateTable(
                name: "DisciplineMappingsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MappingKey = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ProjectDisciplineGroup = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    ProjectDisciplineSection = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    ProjectDisciplineName = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    ResourceDisciplineName = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
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
                    table.PrimaryKey("PK_DisciplineMappingsSet", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProcedureSourceDataRowsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProcedureId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SourceDataImportRowId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcedureSourceDataRowsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProcedureSourceDataRowsSet_ProceduresSet_ProcedureId",
                        column: x => x.ProcedureId,
                        principalTable: "ProceduresSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProcedureSourceDataRowsSet_SourceDataImportRowsSet_SourceDataImportRowId",
                        column: x => x.SourceDataImportRowId,
                        principalTable: "SourceDataImportRowsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DisciplineMappingsSet_MappingKey",
                table: "DisciplineMappingsSet",
                column: "MappingKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DisciplineMappingsSet_ResourceDisciplineName",
                table: "DisciplineMappingsSet",
                column: "ResourceDisciplineName");

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureSourceDataRowsSet_ProcedureId_SourceDataImportRowId",
                table: "ProcedureSourceDataRowsSet",
                columns: new[] { "ProcedureId", "SourceDataImportRowId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureSourceDataRowsSet_SourceDataImportRowId",
                table: "ProcedureSourceDataRowsSet",
                column: "SourceDataImportRowId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DisciplineMappingsSet");

            migrationBuilder.DropTable(
                name: "ProcedureSourceDataRowsSet");

            migrationBuilder.DropColumn(
                name: "BranchOfficeName",
                table: "SourceDataImportRowsSet");

            migrationBuilder.DropColumn(
                name: "ComplexProjectName",
                table: "SourceDataImportRowsSet");

            migrationBuilder.DropColumn(
                name: "GipName",
                table: "SourceDataImportRowsSet");

            migrationBuilder.DropColumn(
                name: "ProjectName",
                table: "SourceDataImportRowsSet");

            migrationBuilder.DropColumn(
                name: "ResourceDisciplineName",
                table: "SourceDataImportRowsSet");

            migrationBuilder.AlterColumn<string>(
                name: "DisciplineCode",
                table: "SourceDataImportRowsSet",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(512)",
                oldMaxLength: 512);

            migrationBuilder.AlterColumn<string>(
                name: "DisciplineCode",
                table: "LotItemsSet",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(512)",
                oldMaxLength: 512);

            migrationBuilder.AlterColumn<string>(
                name: "DisciplineCode",
                table: "ContractorQualificationsSet",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(512)",
                oldMaxLength: 512);
        }
    }
}
