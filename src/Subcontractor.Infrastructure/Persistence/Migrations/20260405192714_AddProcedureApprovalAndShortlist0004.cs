using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subcontractor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProcedureApprovalAndShortlist0004 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProcedureApprovalStepsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProcedureId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StepOrder = table.Column<int>(type: "int", nullable: false),
                    StepTitle = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    ApproverUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ApproverRoleName = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    IsRequired = table.Column<bool>(type: "bit", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    DecisionByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DecisionAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DecisionComment = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcedureApprovalStepsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProcedureApprovalStepsSet_ProceduresSet_ProcedureId",
                        column: x => x.ProcedureId,
                        principalTable: "ProceduresSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProcedureExternalApprovalsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProcedureId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsApproved = table.Column<bool>(type: "bit", nullable: true),
                    DecisionDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ResponsibleUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ProtocolFileId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Comment = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcedureExternalApprovalsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProcedureExternalApprovalsSet_ProceduresSet_ProcedureId",
                        column: x => x.ProcedureId,
                        principalTable: "ProceduresSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProcedureShortlistItemsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProcedureId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ContractorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsIncluded = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    ExclusionReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcedureShortlistItemsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProcedureShortlistItemsSet_ContractorsSet_ContractorId",
                        column: x => x.ContractorId,
                        principalTable: "ContractorsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProcedureShortlistItemsSet_ProceduresSet_ProcedureId",
                        column: x => x.ProcedureId,
                        principalTable: "ProceduresSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureApprovalStepsSet_ProcedureId_StepOrder",
                table: "ProcedureApprovalStepsSet",
                columns: new[] { "ProcedureId", "StepOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureExternalApprovalsSet_ProcedureId",
                table: "ProcedureExternalApprovalsSet",
                column: "ProcedureId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureShortlistItemsSet_ContractorId",
                table: "ProcedureShortlistItemsSet",
                column: "ContractorId");

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureShortlistItemsSet_ProcedureId_ContractorId",
                table: "ProcedureShortlistItemsSet",
                columns: new[] { "ProcedureId", "ContractorId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProcedureApprovalStepsSet");

            migrationBuilder.DropTable(
                name: "ProcedureExternalApprovalsSet");

            migrationBuilder.DropTable(
                name: "ProcedureShortlistItemsSet");
        }
    }
}
