using Subcontractor.Domain.Common;
using Subcontractor.Domain.Imports;

namespace Subcontractor.Domain.Procurement;

public sealed class ProcurementProcedureSourceDataRow : AuditableEntity
{
    public Guid ProcedureId { get; set; }
    public ProcurementProcedure Procedure { get; set; } = null!;

    public Guid SourceDataImportRowId { get; set; }
    public SourceDataImportRow SourceDataImportRow { get; set; } = null!;
}
