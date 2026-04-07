using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subcontractor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddContractorRatingFoundation0016 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContractorRatingModelVersionsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VersionCode = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    ActivatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
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
                    table.PrimaryKey("PK_ContractorRatingModelVersionsSet", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ContractorRatingManualAssessmentsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ContractorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ModelVersionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Score = table.Column<decimal>(type: "decimal(6,3)", nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractorRatingManualAssessmentsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContractorRatingManualAssessmentsSet_ContractorRatingModelVersionsSet_ModelVersionId",
                        column: x => x.ModelVersionId,
                        principalTable: "ContractorRatingModelVersionsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ContractorRatingManualAssessmentsSet_ContractorsSet_ContractorId",
                        column: x => x.ContractorId,
                        principalTable: "ContractorsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ContractorRatingWeightsSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ModelVersionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FactorCode = table.Column<int>(type: "int", nullable: false),
                    Weight = table.Column<decimal>(type: "decimal(9,6)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractorRatingWeightsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContractorRatingWeightsSet_ContractorRatingModelVersionsSet_ModelVersionId",
                        column: x => x.ModelVersionId,
                        principalTable: "ContractorRatingModelVersionsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ContractorRatingHistoryEntriesSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ContractorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ModelVersionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ManualAssessmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SourceType = table.Column<int>(type: "int", nullable: false),
                    CalculatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    DeliveryDisciplineScore = table.Column<decimal>(type: "decimal(6,3)", nullable: false),
                    CommercialDisciplineScore = table.Column<decimal>(type: "decimal(6,3)", nullable: false),
                    ClaimDisciplineScore = table.Column<decimal>(type: "decimal(6,3)", nullable: false),
                    ManualExpertScore = table.Column<decimal>(type: "decimal(6,3)", nullable: false),
                    WorkloadPenaltyScore = table.Column<decimal>(type: "decimal(6,3)", nullable: false),
                    FinalScore = table.Column<decimal>(type: "decimal(6,3)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractorRatingHistoryEntriesSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContractorRatingHistoryEntriesSet_ContractorRatingManualAssessmentsSet_ManualAssessmentId",
                        column: x => x.ManualAssessmentId,
                        principalTable: "ContractorRatingManualAssessmentsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ContractorRatingHistoryEntriesSet_ContractorRatingModelVersionsSet_ModelVersionId",
                        column: x => x.ModelVersionId,
                        principalTable: "ContractorRatingModelVersionsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ContractorRatingHistoryEntriesSet_ContractorsSet_ContractorId",
                        column: x => x.ContractorId,
                        principalTable: "ContractorsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContractorRatingHistoryEntriesSet_ContractorId",
                table: "ContractorRatingHistoryEntriesSet",
                column: "ContractorId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractorRatingHistoryEntriesSet_ContractorId_CalculatedAtUtc",
                table: "ContractorRatingHistoryEntriesSet",
                columns: new[] { "ContractorId", "CalculatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ContractorRatingHistoryEntriesSet_ContractorId_SourceType_CalculatedAtUtc",
                table: "ContractorRatingHistoryEntriesSet",
                columns: new[] { "ContractorId", "SourceType", "CalculatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ContractorRatingHistoryEntriesSet_ManualAssessmentId",
                table: "ContractorRatingHistoryEntriesSet",
                column: "ManualAssessmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractorRatingHistoryEntriesSet_ModelVersionId",
                table: "ContractorRatingHistoryEntriesSet",
                column: "ModelVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractorRatingManualAssessmentsSet_ContractorId",
                table: "ContractorRatingManualAssessmentsSet",
                column: "ContractorId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractorRatingManualAssessmentsSet_ContractorId_CreatedAtUtc",
                table: "ContractorRatingManualAssessmentsSet",
                columns: new[] { "ContractorId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ContractorRatingManualAssessmentsSet_ModelVersionId",
                table: "ContractorRatingManualAssessmentsSet",
                column: "ModelVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractorRatingModelVersionsSet_IsActive",
                table: "ContractorRatingModelVersionsSet",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ContractorRatingModelVersionsSet_IsActive_CreatedAtUtc",
                table: "ContractorRatingModelVersionsSet",
                columns: new[] { "IsActive", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ContractorRatingModelVersionsSet_VersionCode",
                table: "ContractorRatingModelVersionsSet",
                column: "VersionCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ContractorRatingWeightsSet_ModelVersionId",
                table: "ContractorRatingWeightsSet",
                column: "ModelVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractorRatingWeightsSet_ModelVersionId_FactorCode",
                table: "ContractorRatingWeightsSet",
                columns: new[] { "ModelVersionId", "FactorCode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContractorRatingHistoryEntriesSet");

            migrationBuilder.DropTable(
                name: "ContractorRatingWeightsSet");

            migrationBuilder.DropTable(
                name: "ContractorRatingManualAssessmentsSet");

            migrationBuilder.DropTable(
                name: "ContractorRatingModelVersionsSet");
        }
    }
}
