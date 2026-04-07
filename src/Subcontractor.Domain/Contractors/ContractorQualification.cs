namespace Subcontractor.Domain.Contractors;

public sealed class ContractorQualification
{
    public Guid ContractorId { get; set; }
    public Contractor Contractor { get; set; } = null!;
    public string DisciplineCode { get; set; } = string.Empty;
}

