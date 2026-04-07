namespace Subcontractor.Application.ProcurementProcedures.Models;

public sealed class ConfigureProcedureApprovalRequest
{
    public IReadOnlyCollection<ConfigureProcedureApprovalStepRequest> Steps { get; set; } =
        Array.Empty<ConfigureProcedureApprovalStepRequest>();
}
