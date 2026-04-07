using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Domain.Common;
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

namespace Subcontractor.Infrastructure.Persistence;

public sealed class AppDbContext : DbContext, IApplicationDbContext
{
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeProvider _dateTimeProvider;

    public AppDbContext(
        DbContextOptions<AppDbContext> options,
        ICurrentUserService? currentUserService = null,
        IDateTimeProvider? dateTimeProvider = null) : base(options)
    {
        _currentUserService = currentUserService ?? new FallbackCurrentUserService();
        _dateTimeProvider = dateTimeProvider ?? new FallbackDateTimeProvider();
    }

    public DbSet<AppUser> UsersSet => Set<AppUser>();
    public DbSet<AppRole> RolesSet => Set<AppRole>();
    public DbSet<AppUserRole> UserRolesSet => Set<AppUserRole>();
    public DbSet<RolePermission> RolePermissionsSet => Set<RolePermission>();
    public DbSet<Project> ProjectsSet => Set<Project>();
    public DbSet<Contractor> ContractorsSet => Set<Contractor>();
    public DbSet<ContractorQualification> ContractorQualificationsSet => Set<ContractorQualification>();
    public DbSet<ContractorRatingModelVersion> ContractorRatingModelVersionsSet => Set<ContractorRatingModelVersion>();
    public DbSet<ContractorRatingWeight> ContractorRatingWeightsSet => Set<ContractorRatingWeight>();
    public DbSet<ContractorRatingManualAssessment> ContractorRatingManualAssessmentsSet => Set<ContractorRatingManualAssessment>();
    public DbSet<ContractorRatingHistoryEntry> ContractorRatingHistoryEntriesSet => Set<ContractorRatingHistoryEntry>();
    public DbSet<Lot> LotsSet => Set<Lot>();
    public DbSet<LotItem> LotItemsSet => Set<LotItem>();
    public DbSet<LotStatusHistory> LotStatusHistorySet => Set<LotStatusHistory>();
    public DbSet<ProcurementProcedure> ProceduresSet => Set<ProcurementProcedure>();
    public DbSet<ProcurementProcedureStatusHistory> ProcedureStatusHistorySet => Set<ProcurementProcedureStatusHistory>();
    public DbSet<ProcedureApprovalStep> ProcedureApprovalStepsSet => Set<ProcedureApprovalStep>();
    public DbSet<ProcedureExternalApproval> ProcedureExternalApprovalsSet => Set<ProcedureExternalApproval>();
    public DbSet<ProcedureShortlistItem> ProcedureShortlistItemsSet => Set<ProcedureShortlistItem>();
    public DbSet<ProcedureShortlistAdjustmentLog> ProcedureShortlistAdjustmentLogsSet => Set<ProcedureShortlistAdjustmentLog>();
    public DbSet<ProcedureOffer> ProcedureOffersSet => Set<ProcedureOffer>();
    public DbSet<ProcedureOutcome> ProcedureOutcomesSet => Set<ProcedureOutcome>();
    public DbSet<Contract> ContractsSet => Set<Contract>();
    public DbSet<ContractStatusHistory> ContractStatusHistorySet => Set<ContractStatusHistory>();
    public DbSet<ContractMilestone> ContractMilestonesSet => Set<ContractMilestone>();
    public DbSet<ContractMonitoringControlPoint> ContractMonitoringControlPointsSet => Set<ContractMonitoringControlPoint>();
    public DbSet<ContractMonitoringControlPointStage> ContractMonitoringControlPointStagesSet => Set<ContractMonitoringControlPointStage>();
    public DbSet<ContractMdrCard> ContractMdrCardsSet => Set<ContractMdrCard>();
    public DbSet<ContractMdrRow> ContractMdrRowsSet => Set<ContractMdrRow>();
    public DbSet<StoredFile> FilesSet => Set<StoredFile>();
    public DbSet<ReferenceDataEntry> ReferenceDataEntriesSet => Set<ReferenceDataEntry>();
    public DbSet<SourceDataImportBatch> SourceDataImportBatchesSet => Set<SourceDataImportBatch>();
    public DbSet<SourceDataImportRow> SourceDataImportRowsSet => Set<SourceDataImportRow>();
    public DbSet<SourceDataImportBatchStatusHistory> SourceDataImportBatchStatusHistorySet => Set<SourceDataImportBatchStatusHistory>();
    public DbSet<SourceDataLotReconciliationRecord> SourceDataLotReconciliationRecordsSet => Set<SourceDataLotReconciliationRecord>();
    public DbSet<XmlSourceDataImportInboxItem> XmlSourceDataImportInboxItemsSet => Set<XmlSourceDataImportInboxItem>();
    public DbSet<SlaRule> SlaRulesSet => Set<SlaRule>();
    public DbSet<SlaViolation> SlaViolationsSet => Set<SlaViolation>();

    public IQueryable<AppUser> Users => UsersSet.AsQueryable();
    public IQueryable<AppRole> Roles => RolesSet.AsQueryable();
    public IQueryable<Project> Projects => ProjectsSet.AsQueryable();
    public IQueryable<Contractor> Contractors => ContractorsSet.AsQueryable();
    public IQueryable<ContractorRatingModelVersion> ContractorRatingModelVersions => ContractorRatingModelVersionsSet.AsQueryable();
    public IQueryable<ContractorRatingWeight> ContractorRatingWeights => ContractorRatingWeightsSet.AsQueryable();
    public IQueryable<ContractorRatingManualAssessment> ContractorRatingManualAssessments => ContractorRatingManualAssessmentsSet.AsQueryable();
    public IQueryable<ContractorRatingHistoryEntry> ContractorRatingHistoryEntries => ContractorRatingHistoryEntriesSet.AsQueryable();
    public IQueryable<Lot> Lots => LotsSet.AsQueryable();
    public IQueryable<LotStatusHistory> LotStatusHistory => LotStatusHistorySet.AsQueryable();
    public IQueryable<ProcurementProcedure> Procedures => ProceduresSet.AsQueryable();
    public IQueryable<ProcurementProcedureStatusHistory> ProcedureStatusHistory => ProcedureStatusHistorySet.AsQueryable();
    public IQueryable<ProcedureApprovalStep> ProcedureApprovalSteps => ProcedureApprovalStepsSet.AsQueryable();
    public IQueryable<ProcedureExternalApproval> ProcedureExternalApprovals => ProcedureExternalApprovalsSet.AsQueryable();
    public IQueryable<ProcedureShortlistItem> ProcedureShortlistItems => ProcedureShortlistItemsSet.AsQueryable();
    public IQueryable<ProcedureShortlistAdjustmentLog> ProcedureShortlistAdjustmentLogs => ProcedureShortlistAdjustmentLogsSet.AsQueryable();
    public IQueryable<ProcedureOffer> ProcedureOffers => ProcedureOffersSet.AsQueryable();
    public IQueryable<ProcedureOutcome> ProcedureOutcomes => ProcedureOutcomesSet.AsQueryable();
    public IQueryable<Contract> Contracts => ContractsSet.AsQueryable();
    public IQueryable<ContractStatusHistory> ContractStatusHistory => ContractStatusHistorySet.AsQueryable();
    public IQueryable<ContractMilestone> ContractMilestones => ContractMilestonesSet.AsQueryable();
    public IQueryable<ContractMonitoringControlPoint> ContractMonitoringControlPoints => ContractMonitoringControlPointsSet.AsQueryable();
    public IQueryable<ContractMonitoringControlPointStage> ContractMonitoringControlPointStages => ContractMonitoringControlPointStagesSet.AsQueryable();
    public IQueryable<ContractMdrCard> ContractMdrCards => ContractMdrCardsSet.AsQueryable();
    public IQueryable<ContractMdrRow> ContractMdrRows => ContractMdrRowsSet.AsQueryable();
    public IQueryable<StoredFile> Files => FilesSet.AsQueryable();
    public IQueryable<ReferenceDataEntry> ReferenceDataEntries => ReferenceDataEntriesSet.AsQueryable();
    public IQueryable<SourceDataImportBatch> SourceDataImportBatches => SourceDataImportBatchesSet.AsQueryable();
    public IQueryable<SourceDataImportRow> SourceDataImportRows => SourceDataImportRowsSet.AsQueryable();
    public IQueryable<SourceDataImportBatchStatusHistory> SourceDataImportBatchStatusHistory => SourceDataImportBatchStatusHistorySet.AsQueryable();
    public IQueryable<SourceDataLotReconciliationRecord> SourceDataLotReconciliationRecords => SourceDataLotReconciliationRecordsSet.AsQueryable();
    public IQueryable<XmlSourceDataImportInboxItem> XmlSourceDataImportInboxItems => XmlSourceDataImportInboxItemsSet.AsQueryable();
    public IQueryable<SlaRule> SlaRules => SlaRulesSet.AsQueryable();
    public IQueryable<SlaViolation> SlaViolations => SlaViolationsSet.AsQueryable();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.HasQueryFilter(x => !x.IsDeleted);
            entity.HasIndex(x => x.Login).IsUnique();
            entity.Property(x => x.Login).HasMaxLength(128).IsRequired();
            entity.Property(x => x.DisplayName).HasMaxLength(256).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(256);
        });

        modelBuilder.Entity<AppRole>(entity =>
        {
            entity.HasQueryFilter(x => !x.IsDeleted);
            entity.HasIndex(x => x.Name).IsUnique();
            entity.Property(x => x.Name).HasMaxLength(64).IsRequired();
        });

        modelBuilder.Entity<AppUserRole>(entity =>
        {
            entity.HasQueryFilter(x => !x.AppUser.IsDeleted && !x.AppRole.IsDeleted);
            entity.HasKey(x => new { x.AppUserId, x.AppRoleId });
            entity.HasOne(x => x.AppUser).WithMany(x => x.Roles).HasForeignKey(x => x.AppUserId);
            entity.HasOne(x => x.AppRole).WithMany(x => x.Users).HasForeignKey(x => x.AppRoleId);
        });

        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasQueryFilter(x => !x.AppRole.IsDeleted);
            entity.HasKey(x => new { x.AppRoleId, x.PermissionCode });
            entity.Property(x => x.PermissionCode).HasMaxLength(128).IsRequired();
            entity.HasOne(x => x.AppRole).WithMany(x => x.Permissions).HasForeignKey(x => x.AppRoleId);
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasQueryFilter(x => !x.IsDeleted);
            entity.HasIndex(x => x.Code).IsUnique();
            entity.HasIndex(x => x.GipUserId);
            entity.Property(x => x.Code).HasMaxLength(64).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(256).IsRequired();
        });

        modelBuilder.Entity<Contractor>(entity =>
        {
            entity.HasQueryFilter(x => !x.IsDeleted);
            entity.HasIndex(x => x.Inn).IsUnique();
            entity.Property(x => x.Inn).HasMaxLength(16).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(512).IsRequired();
            entity.Property(x => x.CapacityHours).HasColumnType("decimal(18,2)");
            entity.Property(x => x.CurrentRating).HasColumnType("decimal(6,3)");
            entity.Property(x => x.CurrentLoadPercent).HasColumnType("decimal(5,2)");
            entity.Property(x => x.ManualSupportCoefficient).HasColumnType("decimal(8,4)");
        });

        modelBuilder.Entity<ContractorQualification>(entity =>
        {
            entity.HasQueryFilter(x => !x.Contractor.IsDeleted);
            entity.HasKey(x => new { x.ContractorId, x.DisciplineCode });
            entity.Property(x => x.DisciplineCode).HasMaxLength(64).IsRequired();
            entity.HasOne(x => x.Contractor).WithMany(x => x.Qualifications).HasForeignKey(x => x.ContractorId);
        });

        modelBuilder.Entity<ContractorRatingModelVersion>(entity =>
        {
            entity.HasQueryFilter(x => !x.IsDeleted);
            entity.HasIndex(x => x.VersionCode).IsUnique();
            entity.HasIndex(x => x.IsActive);
            entity.HasIndex(x => new { x.IsActive, x.CreatedAtUtc });
            entity.Property(x => x.VersionCode).HasMaxLength(64).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(256).IsRequired();
            entity.Property(x => x.Notes).HasMaxLength(2000);
        });

        modelBuilder.Entity<ContractorRatingWeight>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.ModelVersionId);
            entity.HasIndex(x => new { x.ModelVersionId, x.FactorCode }).IsUnique();
            entity.Property(x => x.Weight).HasColumnType("decimal(9,6)");
            entity.Property(x => x.Notes).HasMaxLength(2000);
            entity.HasOne(x => x.ModelVersion)
                .WithMany(x => x.Weights)
                .HasForeignKey(x => x.ModelVersionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ContractorRatingManualAssessment>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.ContractorId);
            entity.HasIndex(x => x.ModelVersionId);
            entity.HasIndex(x => new { x.ContractorId, x.CreatedAtUtc });
            entity.Property(x => x.Score).HasColumnType("decimal(6,3)");
            entity.Property(x => x.Comment).HasMaxLength(2000);
            entity.HasOne(x => x.Contractor)
                .WithMany()
                .HasForeignKey(x => x.ContractorId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.ModelVersion)
                .WithMany()
                .HasForeignKey(x => x.ModelVersionId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ContractorRatingHistoryEntry>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.ContractorId);
            entity.HasIndex(x => x.ModelVersionId);
            entity.HasIndex(x => x.ManualAssessmentId);
            entity.HasIndex(x => new { x.ContractorId, x.CalculatedAtUtc });
            entity.HasIndex(x => new { x.ContractorId, x.SourceType, x.CalculatedAtUtc });
            entity.Property(x => x.DeliveryDisciplineScore).HasColumnType("decimal(6,3)");
            entity.Property(x => x.CommercialDisciplineScore).HasColumnType("decimal(6,3)");
            entity.Property(x => x.ClaimDisciplineScore).HasColumnType("decimal(6,3)");
            entity.Property(x => x.ManualExpertScore).HasColumnType("decimal(6,3)");
            entity.Property(x => x.WorkloadPenaltyScore).HasColumnType("decimal(6,3)");
            entity.Property(x => x.FinalScore).HasColumnType("decimal(6,3)");
            entity.Property(x => x.Notes).HasMaxLength(2000);
            entity.HasOne(x => x.Contractor)
                .WithMany()
                .HasForeignKey(x => x.ContractorId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.ModelVersion)
                .WithMany()
                .HasForeignKey(x => x.ModelVersionId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.ManualAssessment)
                .WithMany()
                .HasForeignKey(x => x.ManualAssessmentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Lot>(entity =>
        {
            entity.HasQueryFilter(x => !x.IsDeleted);
            entity.HasIndex(x => x.Code).IsUnique();
            entity.HasIndex(x => x.Status);
            entity.Property(x => x.Code).HasMaxLength(64).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(512).IsRequired();
        });

        modelBuilder.Entity<LotItem>(entity =>
        {
            entity.HasQueryFilter(x => !x.Lot.IsDeleted);
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ObjectWbs).HasMaxLength(128).IsRequired();
            entity.Property(x => x.DisciplineCode).HasMaxLength(64).IsRequired();
            entity.Property(x => x.ManHours).HasColumnType("decimal(18,2)");
            entity.HasOne(x => x.Lot).WithMany(x => x.Items).HasForeignKey(x => x.LotId);
        });

        modelBuilder.Entity<LotStatusHistory>(entity =>
        {
            entity.HasQueryFilter(x => !x.Lot.IsDeleted);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.LotId);
            entity.Property(x => x.Reason).HasMaxLength(1024);
            entity.HasOne(x => x.Lot).WithMany().HasForeignKey(x => x.LotId);
        });

        modelBuilder.Entity<ProcurementProcedure>(entity =>
        {
            entity.HasQueryFilter(x => !x.IsDeleted);
            entity.HasIndex(x => x.LotId).IsUnique();
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => new { x.Status, x.ProposalDueDate });
            entity.HasIndex(x => new { x.Status, x.RequiredSubcontractorDeadline });
            entity.Property(x => x.PurchaseTypeCode).HasMaxLength(64).IsRequired();
            entity.Property(x => x.ObjectName).HasMaxLength(512);
            entity.Property(x => x.WorkScope).HasMaxLength(4000);
            entity.Property(x => x.CustomerName).HasMaxLength(512);
            entity.Property(x => x.LeadOfficeCode).HasMaxLength(64);
            entity.Property(x => x.AnalyticsLevel1Code).HasMaxLength(128);
            entity.Property(x => x.AnalyticsLevel2Code).HasMaxLength(128);
            entity.Property(x => x.AnalyticsLevel3Code).HasMaxLength(128);
            entity.Property(x => x.AnalyticsLevel4Code).HasMaxLength(128);
            entity.Property(x => x.AnalyticsLevel5Code).HasMaxLength(128);
            entity.Property(x => x.CustomerContractNumber).HasMaxLength(128);
            entity.Property(x => x.ApprovalRouteCode).HasMaxLength(256);
            entity.Property(x => x.Notes).HasMaxLength(2000);
            entity.Property(x => x.PlannedBudgetWithoutVat).HasColumnType("decimal(18,2)");
        });

        modelBuilder.Entity<ProcurementProcedureStatusHistory>(entity =>
        {
            entity.HasQueryFilter(x => !x.Procedure.IsDeleted);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.ProcedureId);
            entity.Property(x => x.Reason).HasMaxLength(1024);
            entity.HasOne(x => x.Procedure).WithMany().HasForeignKey(x => x.ProcedureId);
        });

        modelBuilder.Entity<ProcedureApprovalStep>(entity =>
        {
            entity.HasQueryFilter(x => !x.Procedure.IsDeleted);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.ProcedureId, x.StepOrder }).IsUnique();
            entity.HasIndex(x => new { x.Status, x.ApproverUserId, x.ApproverRoleName });
            entity.Property(x => x.StepTitle).HasMaxLength(256).IsRequired();
            entity.Property(x => x.ApproverRoleName).HasMaxLength(64);
            entity.Property(x => x.DecisionComment).HasMaxLength(2000);
            entity.HasOne(x => x.Procedure).WithMany().HasForeignKey(x => x.ProcedureId);
        });

        modelBuilder.Entity<ProcedureExternalApproval>(entity =>
        {
            entity.HasQueryFilter(x => !x.Procedure.IsDeleted);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.ProcedureId).IsUnique();
            entity.Property(x => x.Comment).HasMaxLength(2000);
            entity.HasOne(x => x.Procedure).WithMany().HasForeignKey(x => x.ProcedureId);
        });

        modelBuilder.Entity<ProcedureShortlistItem>(entity =>
        {
            entity.HasQueryFilter(x => !x.Procedure.IsDeleted && !x.Contractor.IsDeleted);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.ProcedureId, x.ContractorId }).IsUnique();
            entity.Property(x => x.ExclusionReason).HasMaxLength(1000);
            entity.Property(x => x.Notes).HasMaxLength(1000);
            entity.HasOne(x => x.Procedure).WithMany().HasForeignKey(x => x.ProcedureId);
            entity.HasOne(x => x.Contractor).WithMany().HasForeignKey(x => x.ContractorId);
        });

        modelBuilder.Entity<ProcedureShortlistAdjustmentLog>(entity =>
        {
            entity.HasQueryFilter(x => !x.Procedure.IsDeleted && !x.Contractor.IsDeleted);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.OperationId);
            entity.HasIndex(x => x.ProcedureId);
            entity.HasIndex(x => x.ContractorId);
            entity.HasIndex(x => new { x.ProcedureId, x.CreatedAtUtc });
            entity.Property(x => x.PreviousExclusionReason).HasMaxLength(1000);
            entity.Property(x => x.NewExclusionReason).HasMaxLength(1000);
            entity.Property(x => x.Reason).HasMaxLength(1024).IsRequired();
            entity.HasOne(x => x.Procedure).WithMany().HasForeignKey(x => x.ProcedureId);
            entity.HasOne(x => x.Contractor).WithMany().HasForeignKey(x => x.ContractorId);
        });

        modelBuilder.Entity<ProcedureOffer>(entity =>
        {
            entity.HasQueryFilter(x => !x.Procedure.IsDeleted && !x.Contractor.IsDeleted);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.ProcedureId, x.ContractorId }).IsUnique();
            entity.Property(x => x.OfferNumber).HasMaxLength(64).IsRequired();
            entity.Property(x => x.CurrencyCode).HasMaxLength(8).IsRequired();
            entity.Property(x => x.AmountWithoutVat).HasColumnType("decimal(18,2)");
            entity.Property(x => x.VatAmount).HasColumnType("decimal(18,2)");
            entity.Property(x => x.TotalAmount).HasColumnType("decimal(18,2)");
            entity.Property(x => x.Notes).HasMaxLength(2000);
            entity.HasOne(x => x.Procedure).WithMany().HasForeignKey(x => x.ProcedureId);
            entity.HasOne(x => x.Contractor).WithMany().HasForeignKey(x => x.ContractorId);
        });

        modelBuilder.Entity<ProcedureOutcome>(entity =>
        {
            entity.HasQueryFilter(x => !x.Procedure.IsDeleted);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.ProcedureId).IsUnique();
            entity.Property(x => x.CancellationReason).HasMaxLength(1000);
            entity.Property(x => x.Comment).HasMaxLength(2000);
            entity.HasOne(x => x.Procedure).WithMany().HasForeignKey(x => x.ProcedureId);
            entity.HasOne(x => x.WinnerContractor).WithMany().HasForeignKey(x => x.WinnerContractorId);
        });

        modelBuilder.Entity<Contract>(entity =>
        {
            entity.HasQueryFilter(x => !x.IsDeleted);
            entity.HasIndex(x => x.ContractNumber);
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => new { x.Status, x.EndDate });
            entity.HasIndex(x => x.LotId);
            entity.HasIndex(x => x.ProcedureId);
            entity.HasIndex(x => x.ContractorId);
            entity.Property(x => x.ContractNumber).HasMaxLength(128).IsRequired();
            entity.Property(x => x.AmountWithoutVat).HasColumnType("decimal(18,2)");
            entity.Property(x => x.VatAmount).HasColumnType("decimal(18,2)");
            entity.Property(x => x.TotalAmount).HasColumnType("decimal(18,2)");
        });

        modelBuilder.Entity<ContractStatusHistory>(entity =>
        {
            entity.HasQueryFilter(x => !x.Contract.IsDeleted);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.ContractId);
            entity.Property(x => x.Reason).HasMaxLength(1024);
            entity.HasOne(x => x.Contract).WithMany().HasForeignKey(x => x.ContractId);
        });

        modelBuilder.Entity<ContractMilestone>(entity =>
        {
            entity.HasQueryFilter(x => !x.Contract.IsDeleted);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.ContractId, x.SortOrder });
            entity.HasIndex(x => new { x.PlannedDate, x.ProgressPercent });
            entity.Property(x => x.Title).HasMaxLength(256).IsRequired();
            entity.Property(x => x.ProgressPercent).HasColumnType("decimal(5,2)");
            entity.Property(x => x.Notes).HasMaxLength(2000);
            entity.HasOne(x => x.Contract).WithMany().HasForeignKey(x => x.ContractId);
        });

        modelBuilder.Entity<ContractMonitoringControlPoint>(entity =>
        {
            entity.HasQueryFilter(x => !x.Contract.IsDeleted);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.ContractId);
            entity.HasIndex(x => new { x.ContractId, x.SortOrder });
            entity.HasIndex(x => new { x.ContractId, x.PlannedDate });
            entity.Property(x => x.Name).HasMaxLength(256).IsRequired();
            entity.Property(x => x.ResponsibleRole).HasMaxLength(128);
            entity.Property(x => x.ProgressPercent).HasColumnType("decimal(5,2)");
            entity.Property(x => x.Notes).HasMaxLength(2000);
            entity.HasOne(x => x.Contract).WithMany().HasForeignKey(x => x.ContractId);
            entity.HasMany(x => x.Stages)
                .WithOne(x => x.ControlPoint)
                .HasForeignKey(x => x.ControlPointId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ContractMonitoringControlPointStage>(entity =>
        {
            entity.HasQueryFilter(x => !x.ControlPoint.IsDeleted && !x.ControlPoint.Contract.IsDeleted);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.ControlPointId);
            entity.HasIndex(x => new { x.ControlPointId, x.SortOrder });
            entity.HasIndex(x => new { x.ControlPointId, x.PlannedDate });
            entity.Property(x => x.Name).HasMaxLength(256).IsRequired();
            entity.Property(x => x.ProgressPercent).HasColumnType("decimal(5,2)");
            entity.Property(x => x.Notes).HasMaxLength(2000);
            entity.HasOne(x => x.ControlPoint).WithMany(x => x.Stages).HasForeignKey(x => x.ControlPointId);
        });

        modelBuilder.Entity<ContractMdrCard>(entity =>
        {
            entity.HasQueryFilter(x => !x.Contract.IsDeleted);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.ContractId);
            entity.HasIndex(x => new { x.ContractId, x.SortOrder });
            entity.HasIndex(x => new { x.ContractId, x.ReportingDate });
            entity.Property(x => x.Title).HasMaxLength(256).IsRequired();
            entity.Property(x => x.Notes).HasMaxLength(2000);
            entity.HasOne(x => x.Contract).WithMany().HasForeignKey(x => x.ContractId);
            entity.HasMany(x => x.Rows)
                .WithOne(x => x.Card)
                .HasForeignKey(x => x.CardId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ContractMdrRow>(entity =>
        {
            entity.HasQueryFilter(x => !x.Card.IsDeleted && !x.Card.Contract.IsDeleted);
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.CardId);
            entity.HasIndex(x => new { x.CardId, x.SortOrder });
            entity.Property(x => x.RowCode).HasMaxLength(128).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(512).IsRequired();
            entity.Property(x => x.UnitCode).HasMaxLength(32).IsRequired();
            entity.Property(x => x.PlanValue).HasColumnType("decimal(18,2)");
            entity.Property(x => x.ForecastValue).HasColumnType("decimal(18,2)");
            entity.Property(x => x.FactValue).HasColumnType("decimal(18,2)");
            entity.Property(x => x.Notes).HasMaxLength(2000);
            entity.HasOne(x => x.Card).WithMany(x => x.Rows).HasForeignKey(x => x.CardId);
        });

        modelBuilder.Entity<StoredFile>(entity =>
        {
            entity.HasQueryFilter(x => !x.IsDeleted);
            entity.HasIndex(x => new { x.OwnerEntityType, x.OwnerEntityId });
            entity.Property(x => x.FileName).HasMaxLength(260).IsRequired();
            entity.Property(x => x.ContentType).HasMaxLength(256).IsRequired();
            entity.Property(x => x.OwnerEntityType).HasMaxLength(128).IsRequired();
        });

        modelBuilder.Entity<ReferenceDataEntry>(entity =>
        {
            entity.HasQueryFilter(x => !x.IsDeleted);
            entity.HasIndex(x => new { x.TypeCode, x.ItemCode }).IsUnique();
            entity.Property(x => x.TypeCode).HasMaxLength(64).IsRequired();
            entity.Property(x => x.ItemCode).HasMaxLength(128).IsRequired();
            entity.Property(x => x.DisplayName).HasMaxLength(512).IsRequired();
        });

        modelBuilder.Entity<SourceDataImportBatch>(entity =>
        {
            entity.HasQueryFilter(x => !x.IsDeleted);
            entity.HasIndex(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.Status);
            entity.Property(x => x.FileName).HasMaxLength(260).IsRequired();
            entity.Property(x => x.Notes).HasMaxLength(2000);
            entity.HasMany(x => x.Rows)
                .WithOne(x => x.Batch)
                .HasForeignKey(x => x.BatchId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.StatusHistory)
                .WithOne(x => x.Batch)
                .HasForeignKey(x => x.BatchId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SourceDataImportRow>(entity =>
        {
            entity.HasIndex(x => new { x.BatchId, x.RowNumber }).IsUnique();
            entity.Property(x => x.ProjectCode).HasMaxLength(64).IsRequired();
            entity.Property(x => x.ObjectWbs).HasMaxLength(128).IsRequired();
            entity.Property(x => x.DisciplineCode).HasMaxLength(64).IsRequired();
            entity.Property(x => x.ManHours).HasColumnType("decimal(18,2)");
            entity.Property(x => x.ValidationMessage).HasMaxLength(2000);
        });

        modelBuilder.Entity<SourceDataImportBatchStatusHistory>(entity =>
        {
            entity.HasQueryFilter(x => !x.Batch.IsDeleted);
            entity.HasIndex(x => x.BatchId);
            entity.Property(x => x.Reason).HasMaxLength(1024).IsRequired();
        });

        modelBuilder.Entity<SourceDataLotReconciliationRecord>(entity =>
        {
            entity.HasQueryFilter(x => !x.SourceDataImportBatch.IsDeleted);
            entity.HasIndex(x => x.SourceDataImportBatchId);
            entity.HasIndex(x => x.ApplyOperationId);
            entity.HasIndex(x => x.LotId);
            entity.HasIndex(x => x.IsCreated);
            entity.HasIndex(x => new { x.SourceDataImportBatchId, x.CreatedAtUtc });
            entity.Property(x => x.RecommendationGroupKey).HasMaxLength(160).IsRequired();
            entity.Property(x => x.ProjectCode).HasMaxLength(64).IsRequired();
            entity.Property(x => x.DisciplineCode).HasMaxLength(64).IsRequired();
            entity.Property(x => x.RequestedLotCode).HasMaxLength(64).IsRequired();
            entity.Property(x => x.RequestedLotName).HasMaxLength(512).IsRequired();
            entity.Property(x => x.TotalManHours).HasColumnType("decimal(18,2)");
            entity.Property(x => x.SkipReason).HasMaxLength(1024);
            entity.HasOne(x => x.SourceDataImportBatch)
                .WithMany()
                .HasForeignKey(x => x.SourceDataImportBatchId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Lot)
                .WithMany()
                .HasForeignKey(x => x.LotId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<XmlSourceDataImportInboxItem>(entity =>
        {
            entity.HasQueryFilter(x => !x.IsDeleted);
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.SourceDataImportBatchId);
            entity.Property(x => x.SourceSystem).HasMaxLength(128).IsRequired();
            entity.Property(x => x.ExternalDocumentId).HasMaxLength(128);
            entity.Property(x => x.FileName).HasMaxLength(260).IsRequired();
            entity.Property(x => x.XmlContent).IsRequired();
            entity.Property(x => x.ErrorMessage).HasMaxLength(2000);
            entity.HasOne<SourceDataImportBatch>()
                .WithMany()
                .HasForeignKey(x => x.SourceDataImportBatchId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SlaRule>(entity =>
        {
            entity.HasQueryFilter(x => !x.IsDeleted);
            entity.HasIndex(x => x.PurchaseTypeCode).IsUnique();
            entity.Property(x => x.PurchaseTypeCode).HasMaxLength(64).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(512);
        });

        modelBuilder.Entity<SlaViolation>(entity =>
        {
            entity.HasIndex(x => new { x.EntityType, x.EntityId, x.DueDate, x.Severity }).IsUnique();
            entity.HasIndex(x => x.IsResolved);
            entity.HasIndex(x => x.Severity);
            entity.HasIndex(x => x.DueDate);
            entity.Property(x => x.Title).HasMaxLength(512).IsRequired();
            entity.Property(x => x.RecipientEmail).HasMaxLength(256);
            entity.Property(x => x.LastNotificationError).HasMaxLength(2000);
            entity.Property(x => x.ReasonCode).HasMaxLength(128);
            entity.Property(x => x.ReasonComment).HasMaxLength(2000);
        });
    }

    public override int SaveChanges()
    {
        ApplyAuditing();
        ApplySoftDelete();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditing();
        ApplySoftDelete();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyAuditing()
    {
        var utcNow = _dateTimeProvider.UtcNow;
        var currentUser = _currentUserService.UserLogin;

        foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAtUtc = utcNow;
                entry.Entity.CreatedBy = currentUser;
            }

            if (entry.State == EntityState.Modified)
            {
                entry.Entity.LastModifiedAtUtc = utcNow;
                entry.Entity.LastModifiedBy = currentUser;
            }
        }
    }

    private void ApplySoftDelete()
    {
        var utcNow = _dateTimeProvider.UtcNow;
        var currentUser = _currentUserService.UserLogin;

        foreach (var entry in ChangeTracker.Entries<SoftDeletableEntity>())
        {
            if (entry.State == EntityState.Deleted)
            {
                entry.Entity.MarkDeleted(currentUser, utcNow);
                entry.State = EntityState.Modified;
            }
        }
    }

    private sealed class FallbackCurrentUserService : ICurrentUserService
    {
        public string UserLogin => "system";
    }

    private sealed class FallbackDateTimeProvider : IDateTimeProvider
    {
        public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
    }
}
