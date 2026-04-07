using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subcontractor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSourceDataImportWorkflow0010 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SourceDataImportBatchStatusHistorySet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BatchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
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
                    table.PrimaryKey("PK_SourceDataImportBatchStatusHistorySet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SourceDataImportBatchStatusHistorySet_SourceDataImportBatchesSet_BatchId",
                        column: x => x.BatchId,
                        principalTable: "SourceDataImportBatchesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SourceDataImportBatchStatusHistorySet_BatchId",
                table: "SourceDataImportBatchStatusHistorySet",
                column: "BatchId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SourceDataImportBatchStatusHistorySet");
        }
    }
}
