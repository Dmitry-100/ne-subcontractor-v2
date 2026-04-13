using Subcontractor.Application.Contractors;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Procurement;

public sealed class ProcedureShortlistRecommendationsTests
{
    [Fact]
    public async Task BuildShortlistRecommendationsAsync_ShouldReturnExplainableCandidates()
    {
        await using var db = TestDbContextFactory.Create("proc-user");
        var setup = await SeedProcedureForRecommendationsAsync(db);

        var contractorsService = new ContractorsService(db);
        var service = new ProcurementProceduresService(db, new TestCurrentUserService("proc-user"), contractorsService);

        var recommendations = await service.BuildShortlistRecommendationsAsync(setup.ProcedureId);

        Assert.True(recommendations.Count >= 4);

        var recommended = recommendations.First(x => x.IsRecommended);
        Assert.Equal(setup.RecommendedContractorId, recommended.ContractorId);
        Assert.Equal(0, recommended.SuggestedSortOrder);
        Assert.True(recommended.HasRequiredQualifications);

        var overloaded = recommendations.Single(x => x.ContractorId == setup.OverloadedContractorId);
        Assert.False(overloaded.IsRecommended);
        Assert.Contains(overloaded.DecisionFactors, x => x.Contains("Загрузка превышает 100%", StringComparison.OrdinalIgnoreCase));

        var missingQualification = recommendations.Single(x => x.ContractorId == setup.MissingQualificationContractorId);
        Assert.False(missingQualification.IsRecommended);
        Assert.False(missingQualification.HasRequiredQualifications);
        Assert.Contains("ELEC", missingQualification.MissingDisciplineCodes);
    }

    [Fact]
    public async Task ApplyShortlistRecommendationsAsync_ShouldPersistShortlistAndAdjustmentLogs()
    {
        await using var db = TestDbContextFactory.Create("proc-user");
        var setup = await SeedProcedureForRecommendationsAsync(db);

        var contractorsService = new ContractorsService(db);
        var service = new ProcurementProceduresService(db, new TestCurrentUserService("proc-user"), contractorsService);

        await service.UpsertShortlistAsync(setup.ProcedureId, new UpdateProcedureShortlistRequest
        {
            Items =
            [
                new UpsertProcedureShortlistItemRequest
                {
                    ContractorId = setup.OverloadedContractorId,
                    IsIncluded = true,
                    SortOrder = 0
                }
            ]
        });

        var apply = await service.ApplyShortlistRecommendationsAsync(
            setup.ProcedureId,
            new ApplyProcedureShortlistRecommendationsRequest
            {
                MaxIncluded = 3,
                AdjustmentReason = "Корректировка по автоподбору"
            });

        Assert.True(apply.TotalCandidates >= 4);
        Assert.Equal(1, apply.IncludedCandidates);
        Assert.Single(apply.Shortlist);
        Assert.Equal(setup.RecommendedContractorId, apply.Shortlist[0].ContractorId);

        var logs = await service.GetShortlistAdjustmentsAsync(setup.ProcedureId);
        Assert.NotEmpty(logs);
        Assert.Contains(logs, x => x.Reason == "Корректировка по автоподбору");
    }

    [Fact]
    public async Task ApplyShortlistRecommendationsAsync_WithZeroMaxAndEmptyReason_ShouldUseDefaultReasonAndClampLimit()
    {
        await using var db = TestDbContextFactory.Create("proc-user");
        var setup = await SeedProcedureForRecommendationsAsync(db);

        var contractorsService = new ContractorsService(db);
        var service = new ProcurementProceduresService(db, new TestCurrentUserService("proc-user"), contractorsService);

        await service.UpsertShortlistAsync(setup.ProcedureId, new UpdateProcedureShortlistRequest
        {
            Items =
            [
                new UpsertProcedureShortlistItemRequest
                {
                    ContractorId = setup.OverloadedContractorId,
                    IsIncluded = true,
                    SortOrder = 0
                }
            ]
        });

        var apply = await service.ApplyShortlistRecommendationsAsync(
            setup.ProcedureId,
            new ApplyProcedureShortlistRecommendationsRequest
            {
                MaxIncluded = 0,
                AdjustmentReason = "  "
            });

        Assert.Equal(1, apply.IncludedCandidates);
        Assert.Single(apply.Shortlist);
        Assert.Equal(setup.RecommendedContractorId, apply.Shortlist[0].ContractorId);

        var logs = await service.GetShortlistAdjustmentsAsync(setup.ProcedureId);
        Assert.Contains(logs, x => x.Reason == "Auto shortlist apply");
    }

    private static async Task<RecommendationSeedResult> SeedProcedureForRecommendationsAsync(
        Infrastructure.Persistence.AppDbContext db)
    {
        var lotMain = new Lot
        {
            Code = "LOT-SR-001",
            Name = "Recommendation lot",
            Status = LotStatus.InProcurement,
            Items =
            [
                new LotItem { ObjectWbs = "R.01", DisciplineCode = "PIPING", ManHours = 30m },
                new LotItem { ObjectWbs = "R.02", DisciplineCode = "ELEC", ManHours = 20m }
            ]
        };

        var lotLoad = new Lot
        {
            Code = "LOT-SR-002",
            Name = "Load lot",
            Status = LotStatus.Contracted,
            Items =
            [
                new LotItem { ObjectWbs = "L.01", DisciplineCode = "PIPING", ManHours = 150m }
            ]
        };

        var recommendedContractor = CreateContractor(
            "7700000101",
            "Recommended contractor",
            200m,
            4.6m,
            ReliabilityClass.A,
            ContractorStatus.Active,
            ["PIPING", "ELEC"]);

        var overloadedContractor = CreateContractor(
            "7700000102",
            "Overloaded contractor",
            100m,
            4.9m,
            ReliabilityClass.B,
            ContractorStatus.Active,
            ["PIPING", "ELEC"]);

        var blockedContractor = CreateContractor(
            "7700000103",
            "Blocked contractor",
            150m,
            4.7m,
            ReliabilityClass.A,
            ContractorStatus.Blocked,
            ["PIPING", "ELEC"]);

        var missingQualificationContractor = CreateContractor(
            "7700000104",
            "Missing qualification contractor",
            150m,
            4.2m,
            ReliabilityClass.A,
            ContractorStatus.Active,
            ["PIPING"]);

        await db.Set<Lot>().AddRangeAsync(lotMain, lotLoad);
        await db.Set<Contractor>().AddRangeAsync(
            recommendedContractor,
            overloadedContractor,
            blockedContractor,
            missingQualificationContractor);

        var procedure = new ProcurementProcedure
        {
            LotId = lotMain.Id,
            Status = ProcurementProcedureStatus.Sent,
            PurchaseTypeCode = "OPEN",
            ObjectName = "Procedure recommendation test",
            WorkScope = "Scope",
            CustomerName = "Customer",
            LeadOfficeCode = "MAIN",
            AnalyticsLevel1Code = "A1",
            AnalyticsLevel2Code = "A2",
            AnalyticsLevel3Code = "A3",
            AnalyticsLevel4Code = "A4",
            AnalyticsLevel5Code = "A5"
        };
        await db.Set<ProcurementProcedure>().AddAsync(procedure);

        await db.Set<Contract>().AddAsync(new Contract
        {
            LotId = lotLoad.Id,
            ProcedureId = Guid.NewGuid(),
            ContractorId = overloadedContractor.Id,
            ContractNumber = "CTR-SR-LOAD",
            Status = ContractStatus.Active
        });

        await db.SaveChangesAsync();

        return new RecommendationSeedResult(
            procedure.Id,
            recommendedContractor.Id,
            overloadedContractor.Id,
            missingQualificationContractor.Id);
    }

    private static Contractor CreateContractor(
        string inn,
        string name,
        decimal capacityHours,
        decimal rating,
        ReliabilityClass reliabilityClass,
        ContractorStatus status,
        IReadOnlyList<string> disciplineCodes)
    {
        var contractor = new Contractor
        {
            Inn = inn,
            Name = name,
            City = "Moscow",
            ContactName = name,
            Phone = "+70000000000",
            Email = $"{inn}@example.local",
            CapacityHours = capacityHours,
            CurrentRating = rating,
            ReliabilityClass = reliabilityClass,
            Status = status
        };

        foreach (var disciplineCode in disciplineCodes)
        {
            contractor.Qualifications.Add(new ContractorQualification
            {
                Contractor = contractor,
                DisciplineCode = disciplineCode
            });
        }

        return contractor;
    }

    private sealed record RecommendationSeedResult(
        Guid ProcedureId,
        Guid RecommendedContractorId,
        Guid OverloadedContractorId,
        Guid MissingQualificationContractorId);
}
