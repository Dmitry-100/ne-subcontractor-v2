using Subcontractor.Domain.Common;
using Subcontractor.Domain.Contractors;

namespace Subcontractor.Domain.ContractorRatings;

public sealed class ContractorRatingHistoryEntry : AuditableEntity
{
    public Guid ContractorId { get; set; }
    public Contractor Contractor { get; set; } = null!;

    public Guid ModelVersionId { get; set; }
    public ContractorRatingModelVersion ModelVersion { get; set; } = null!;

    public Guid? ManualAssessmentId { get; set; }
    public ContractorRatingManualAssessment? ManualAssessment { get; set; }

    public ContractorRatingRecordSourceType SourceType { get; set; } = ContractorRatingRecordSourceType.AutoRecalculation;
    public DateTimeOffset CalculatedAtUtc { get; set; }

    public decimal DeliveryDisciplineScore { get; set; }
    public decimal CommercialDisciplineScore { get; set; }
    public decimal ClaimDisciplineScore { get; set; }
    public decimal ManualExpertScore { get; set; }
    public decimal WorkloadPenaltyScore { get; set; }
    public decimal FinalScore { get; set; }
    public string? Notes { get; set; }
}

