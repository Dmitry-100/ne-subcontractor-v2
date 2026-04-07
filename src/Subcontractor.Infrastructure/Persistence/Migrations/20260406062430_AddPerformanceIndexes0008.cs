using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Subcontractor.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexes0008 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ContractMilestonesSet_ContractId",
                table: "ContractMilestonesSet");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectsSet_GipUserId",
                table: "ProjectsSet",
                column: "GipUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProceduresSet_Status",
                table: "ProceduresSet",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ProceduresSet_Status_ProposalDueDate",
                table: "ProceduresSet",
                columns: new[] { "Status", "ProposalDueDate" });

            migrationBuilder.CreateIndex(
                name: "IX_ProceduresSet_Status_RequiredSubcontractorDeadline",
                table: "ProceduresSet",
                columns: new[] { "Status", "RequiredSubcontractorDeadline" });

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureApprovalStepsSet_Status_ApproverUserId_ApproverRoleName",
                table: "ProcedureApprovalStepsSet",
                columns: new[] { "Status", "ApproverUserId", "ApproverRoleName" });

            migrationBuilder.CreateIndex(
                name: "IX_LotsSet_Status",
                table: "LotsSet",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_FilesSet_OwnerEntityType_OwnerEntityId",
                table: "FilesSet",
                columns: new[] { "OwnerEntityType", "OwnerEntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_ContractsSet_ContractorId",
                table: "ContractsSet",
                column: "ContractorId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractsSet_LotId",
                table: "ContractsSet",
                column: "LotId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractsSet_ProcedureId",
                table: "ContractsSet",
                column: "ProcedureId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractsSet_Status",
                table: "ContractsSet",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ContractsSet_Status_EndDate",
                table: "ContractsSet",
                columns: new[] { "Status", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_ContractMilestonesSet_PlannedDate_ProgressPercent",
                table: "ContractMilestonesSet",
                columns: new[] { "PlannedDate", "ProgressPercent" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProjectsSet_GipUserId",
                table: "ProjectsSet");

            migrationBuilder.DropIndex(
                name: "IX_ProceduresSet_Status",
                table: "ProceduresSet");

            migrationBuilder.DropIndex(
                name: "IX_ProceduresSet_Status_ProposalDueDate",
                table: "ProceduresSet");

            migrationBuilder.DropIndex(
                name: "IX_ProceduresSet_Status_RequiredSubcontractorDeadline",
                table: "ProceduresSet");

            migrationBuilder.DropIndex(
                name: "IX_ProcedureApprovalStepsSet_Status_ApproverUserId_ApproverRoleName",
                table: "ProcedureApprovalStepsSet");

            migrationBuilder.DropIndex(
                name: "IX_LotsSet_Status",
                table: "LotsSet");

            migrationBuilder.DropIndex(
                name: "IX_FilesSet_OwnerEntityType_OwnerEntityId",
                table: "FilesSet");

            migrationBuilder.DropIndex(
                name: "IX_ContractsSet_ContractorId",
                table: "ContractsSet");

            migrationBuilder.DropIndex(
                name: "IX_ContractsSet_LotId",
                table: "ContractsSet");

            migrationBuilder.DropIndex(
                name: "IX_ContractsSet_ProcedureId",
                table: "ContractsSet");

            migrationBuilder.DropIndex(
                name: "IX_ContractsSet_Status",
                table: "ContractsSet");

            migrationBuilder.DropIndex(
                name: "IX_ContractsSet_Status_EndDate",
                table: "ContractsSet");

            migrationBuilder.DropIndex(
                name: "IX_ContractMilestonesSet_PlannedDate_ProgressPercent",
                table: "ContractMilestonesSet");

            migrationBuilder.CreateIndex(
                name: "IX_ContractMilestonesSet_ContractId",
                table: "ContractMilestonesSet",
                column: "ContractId");
        }
    }
}
