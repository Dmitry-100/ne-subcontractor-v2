using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subcontractor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddContractsUniqueIndexes0018 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ContractsSet_ContractNumber",
                table: "ContractsSet");

            migrationBuilder.DropIndex(
                name: "IX_ContractsSet_ProcedureId",
                table: "ContractsSet");

            migrationBuilder.CreateIndex(
                name: "IX_ContractsSet_ContractNumber",
                table: "ContractsSet",
                column: "ContractNumber",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_ContractsSet_ProcedureId",
                table: "ContractsSet",
                column: "ProcedureId",
                unique: true,
                filter: "[IsDeleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ContractsSet_ContractNumber",
                table: "ContractsSet");

            migrationBuilder.DropIndex(
                name: "IX_ContractsSet_ProcedureId",
                table: "ContractsSet");

            migrationBuilder.CreateIndex(
                name: "IX_ContractsSet_ContractNumber",
                table: "ContractsSet",
                column: "ContractNumber");

            migrationBuilder.CreateIndex(
                name: "IX_ContractsSet_ProcedureId",
                table: "ContractsSet",
                column: "ProcedureId");
        }
    }
}
