using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subcontractor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSlaMonitoringFoundation0014 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SlaRulesSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PurchaseTypeCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    WarningDaysBeforeDue = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
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
                    table.PrimaryKey("PK_SlaRulesSet", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SlaViolationsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EntityType = table.Column<int>(type: "int", nullable: false),
                    EntityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Severity = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    RecipientEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    IsResolved = table.Column<bool>(type: "bit", nullable: false),
                    FirstDetectedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastDetectedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ResolvedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NotificationAttempts = table.Column<int>(type: "int", nullable: false),
                    LastNotificationAttemptAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastNotificationSentAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastNotificationError = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ReasonCode = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    ReasonComment = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ReasonAssignedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SlaViolationsSet", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SlaRulesSet_PurchaseTypeCode",
                table: "SlaRulesSet",
                column: "PurchaseTypeCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SlaViolationsSet_DueDate",
                table: "SlaViolationsSet",
                column: "DueDate");

            migrationBuilder.CreateIndex(
                name: "IX_SlaViolationsSet_EntityType_EntityId_DueDate_Severity",
                table: "SlaViolationsSet",
                columns: new[] { "EntityType", "EntityId", "DueDate", "Severity" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SlaViolationsSet_IsResolved",
                table: "SlaViolationsSet",
                column: "IsResolved");

            migrationBuilder.CreateIndex(
                name: "IX_SlaViolationsSet_Severity",
                table: "SlaViolationsSet",
                column: "Severity");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SlaRulesSet");

            migrationBuilder.DropTable(
                name: "SlaViolationsSet");
        }
    }
}
