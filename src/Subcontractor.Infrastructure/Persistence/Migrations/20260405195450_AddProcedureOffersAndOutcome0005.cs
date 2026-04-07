using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subcontractor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProcedureOffersAndOutcome0005 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProcedureOffersSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProcedureId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ContractorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OfferNumber = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ReceivedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AmountWithoutVat = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    VatAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DurationDays = table.Column<int>(type: "int", nullable: true),
                    CurrencyCode = table.Column<string>(type: "nvarchar(8)", maxLength: 8, nullable: false),
                    QualificationStatus = table.Column<int>(type: "int", nullable: false),
                    DecisionStatus = table.Column<int>(type: "int", nullable: false),
                    OfferFileId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcedureOffersSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProcedureOffersSet_ContractorsSet_ContractorId",
                        column: x => x.ContractorId,
                        principalTable: "ContractorsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProcedureOffersSet_ProceduresSet_ProcedureId",
                        column: x => x.ProcedureId,
                        principalTable: "ProceduresSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProcedureOutcomesSet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProcedureId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WinnerContractorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DecisionDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ProtocolFileId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsCanceled = table.Column<bool>(type: "bit", nullable: false),
                    CancellationReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Comment = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastModifiedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcedureOutcomesSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProcedureOutcomesSet_ContractorsSet_WinnerContractorId",
                        column: x => x.WinnerContractorId,
                        principalTable: "ContractorsSet",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProcedureOutcomesSet_ProceduresSet_ProcedureId",
                        column: x => x.ProcedureId,
                        principalTable: "ProceduresSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureOffersSet_ContractorId",
                table: "ProcedureOffersSet",
                column: "ContractorId");

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureOffersSet_ProcedureId_ContractorId",
                table: "ProcedureOffersSet",
                columns: new[] { "ProcedureId", "ContractorId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureOutcomesSet_ProcedureId",
                table: "ProcedureOutcomesSet",
                column: "ProcedureId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureOutcomesSet_WinnerContractorId",
                table: "ProcedureOutcomesSet",
                column: "WinnerContractorId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProcedureOffersSet");

            migrationBuilder.DropTable(
                name: "ProcedureOutcomesSet");
        }
    }
}
