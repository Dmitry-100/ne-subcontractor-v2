using Microsoft.EntityFrameworkCore;
using Subcontractor.Domain.ContractorRatings;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Files;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Domain.Projects;
using Subcontractor.Domain.ReferenceData;
using Subcontractor.Domain.Sla;
using Subcontractor.Domain.Users;

namespace Subcontractor.Application.Abstractions;

public interface IApplicationDbContext
{
    IQueryable<AppUser> Users { get; }
    IQueryable<AppRole> Roles { get; }
    IQueryable<Project> Projects { get; }
    IQueryable<Contractor> Contractors { get; }
    IQueryable<ContractorRatingModelVersion> ContractorRatingModelVersions { get; }
    IQueryable<ContractorRatingWeight> ContractorRatingWeights { get; }
    IQueryable<ContractorRatingManualAssessment> ContractorRatingManualAssessments { get; }
    IQueryable<ContractorRatingHistoryEntry> ContractorRatingHistoryEntries { get; }
    IQueryable<Lot> Lots { get; }
    IQueryable<LotStatusHistory> LotStatusHistory { get; }
    IQueryable<ProcurementProcedure> Procedures { get; }
    IQueryable<ProcurementProcedureStatusHistory> ProcedureStatusHistory { get; }
    IQueryable<ProcedureApprovalStep> ProcedureApprovalSteps { get; }
    IQueryable<ProcedureExternalApproval> ProcedureExternalApprovals { get; }
    IQueryable<ProcedureShortlistItem> ProcedureShortlistItems { get; }
    IQueryable<ProcedureShortlistAdjustmentLog> ProcedureShortlistAdjustmentLogs { get; }
    IQueryable<ProcedureOffer> ProcedureOffers { get; }
    IQueryable<ProcedureOutcome> ProcedureOutcomes { get; }
    IQueryable<Contract> Contracts { get; }
    IQueryable<ContractStatusHistory> ContractStatusHistory { get; }
    IQueryable<ContractMilestone> ContractMilestones { get; }
    IQueryable<ContractMonitoringControlPoint> ContractMonitoringControlPoints { get; }
    IQueryable<ContractMonitoringControlPointStage> ContractMonitoringControlPointStages { get; }
    IQueryable<ContractMdrCard> ContractMdrCards { get; }
    IQueryable<ContractMdrRow> ContractMdrRows { get; }
    IQueryable<StoredFile> Files { get; }
    IQueryable<ReferenceDataEntry> ReferenceDataEntries { get; }
    IQueryable<SourceDataImportBatch> SourceDataImportBatches { get; }
    IQueryable<SourceDataImportRow> SourceDataImportRows { get; }
    IQueryable<SourceDataImportBatchStatusHistory> SourceDataImportBatchStatusHistory { get; }
    IQueryable<SourceDataLotReconciliationRecord> SourceDataLotReconciliationRecords { get; }
    IQueryable<XmlSourceDataImportInboxItem> XmlSourceDataImportInboxItems { get; }
    IQueryable<SlaRule> SlaRules { get; }
    IQueryable<SlaViolation> SlaViolations { get; }

    DbSet<TEntity> Set<TEntity>() where TEntity : class;

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
