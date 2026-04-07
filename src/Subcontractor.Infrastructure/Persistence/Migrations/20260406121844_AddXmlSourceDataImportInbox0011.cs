using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subcontractor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddXmlSourceDataImportInbox0011 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "XmlSourceDataImportInboxItemsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SourceSystem = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ExternalDocumentId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    FileName = table.Column<string>(type: "nvarchar(260)", maxLength: 260, nullable: false),
                    XmlContent = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    SourceDataImportBatchId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ProcessedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
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
                    table.PrimaryKey("PK_XmlSourceDataImportInboxItemsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_XmlSourceDataImportInboxItemsSet_SourceDataImportBatchesSet_SourceDataImportBatchId",
                        column: x => x.SourceDataImportBatchId,
                        principalTable: "SourceDataImportBatchesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_XmlSourceDataImportInboxItemsSet_CreatedAtUtc",
                table: "XmlSourceDataImportInboxItemsSet",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_XmlSourceDataImportInboxItemsSet_SourceDataImportBatchId",
                table: "XmlSourceDataImportInboxItemsSet",
                column: "SourceDataImportBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_XmlSourceDataImportInboxItemsSet_Status",
                table: "XmlSourceDataImportInboxItemsSet",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "XmlSourceDataImportInboxItemsSet");
        }
    }
}
