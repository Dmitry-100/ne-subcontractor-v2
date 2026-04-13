using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Contractors;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Tests.SqlServer.TestInfrastructure;

namespace Subcontractor.Tests.SqlServer.Procurement;

[Trait("SqlSuite", "Core")]
public sealed class ProcurementProceduresSqlShortlistTests
{
    [SqlFact]
    public async Task BuildShortlistRecommendationsAsync_ShouldReturnExplainableCandidates()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var setup = await SeedProcedureForRecommendationsAsync(db);

        var contractorsService = new ContractorsService(db);
        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"), contractorsService);

        var recommendations = await service.BuildShortlistRecommendationsAsync(setup.ProcedureId);
        Assert.True(recommendations.Count >= 5);

        var topRecommended = recommendations.First(x => x.IsRecommended);
        Assert.Equal(setup.RecommendedPrimaryContractorId, topRecommended.ContractorId);
        Assert.Equal(0, topRecommended.SuggestedSortOrder);
        Assert.True(topRecommended.HasRequiredQualifications);

        var overloaded = recommendations.Single(x => x.ContractorId == setup.OverloadedContractorId);
        Assert.False(overloaded.IsRecommended);
        Assert.Contains(overloaded.DecisionFactors, x => x.Contains("Загрузка превышает 100%", StringComparison.OrdinalIgnoreCase));

        var missingQualification = recommendations.Single(x => x.ContractorId == setup.MissingQualificationContractorId);
        Assert.False(missingQualification.IsRecommended);
        Assert.False(missingQualification.HasRequiredQualifications);
        Assert.Contains("ELEC", missingQualification.MissingDisciplineCodes);
    }

    [SqlFact]
    public async Task ApplyShortlistRecommendationsAsync_ShouldPersistShortlistAndAdjustmentLogs()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var setup = await SeedProcedureForRecommendationsAsync(db);

        var contractorsService = new ContractorsService(db);
        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"), contractorsService);

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
                AdjustmentReason = "Корректировка shortlist по SQL-автоподбору"
            });

        Assert.True(apply.TotalCandidates >= 5);
        Assert.Equal(2, apply.IncludedCandidates);
        Assert.Equal(2, apply.Shortlist.Count);
        Assert.Contains(apply.Shortlist, x => x.ContractorId == setup.RecommendedPrimaryContractorId);
        Assert.Contains(apply.Shortlist, x => x.ContractorId == setup.RecommendedSecondaryContractorId);

        var logs = await service.GetShortlistAdjustmentsAsync(setup.ProcedureId);
        Assert.True(logs.Count >= 3);
        Assert.Contains(logs, x => x.Reason == "Корректировка shortlist по SQL-автоподбору");
    }

    [SqlFact]
    public async Task ApplyShortlistRecommendationsAsync_WithMaxIncludedLessThanOne_ShouldClampToOne()
    {
        await using var database = await SqlServerTestDatabase.CreateMigratedAsync("proc-user");
        await using var db = database.CreateDbContext("proc-user");
        var setup = await SeedProcedureForRecommendationsAsync(db);

        var contractorsService = new ContractorsService(db);
        var service = new ProcurementProceduresService(db, new SqlTestCurrentUserService("proc-user"), contractorsService);

        var apply = await service.ApplyShortlistRecommendationsAsync(
            setup.ProcedureId,
            new ApplyProcedureShortlistRecommendationsRequest
            {
                MaxIncluded = 0,
                AdjustmentReason = "Clamp check"
            });

        Assert.Equal(1, apply.IncludedCandidates);
        var selected = Assert.Single(apply.Shortlist);
        Assert.Equal(setup.RecommendedPrimaryContractorId, selected.ContractorId);

        var persistedShortlist = await db.Set<ProcedureShortlistItem>()
            .AsNoTracking()
            .Where(x => x.ProcedureId == setup.ProcedureId)
            .ToListAsync();
        Assert.Single(persistedShortlist);
        Assert.Equal(setup.RecommendedPrimaryContractorId, persistedShortlist[0].ContractorId);
    }

    private static async Task<RecommendationSeedResult> SeedProcedureForRecommendationsAsync(
        Subcontractor.Infrastructure.Persistence.AppDbContext db)
    {
        var lotMain = new Lot
        {
            Code = $"LOT-SQL-SR-M-{Guid.NewGuid():N}"[..20],
            Name = "SQL shortlist recommendation lot",
            Status = LotStatus.InProcurement,
            Items =
            [
                new LotItem { ObjectWbs = "R.01", DisciplineCode = "PIPING", ManHours = 30m },
                new LotItem { ObjectWbs = "R.02", DisciplineCode = "ELEC", ManHours = 20m }
            ]
        };

        var lotLoad = new Lot
        {
            Code = $"LOT-SQL-SR-L-{Guid.NewGuid():N}"[..20],
            Name = "SQL shortlist load lot",
            Status = LotStatus.Contracted,
            Items =
            [
                new LotItem { ObjectWbs = "L.01", DisciplineCode = "PIPING", ManHours = 150m }
            ]
        };

        var recommendedPrimary = CreateContractor(
            inn: Guid.NewGuid().ToString("N")[..16],
            name: "Recommended primary contractor",
            capacityHours: 220m,
            rating: 4.9m,
            reliabilityClass: ReliabilityClass.A,
            status: ContractorStatus.Active,
            disciplineCodes: ["PIPING", "ELEC"]);

        var recommendedSecondary = CreateContractor(
            inn: Guid.NewGuid().ToString("N")[..16],
            name: "Recommended secondary contractor",
            capacityHours: 200m,
            rating: 4.4m,
            reliabilityClass: ReliabilityClass.B,
            status: ContractorStatus.Active,
            disciplineCodes: ["PIPING", "ELEC"]);

        var overloaded = CreateContractor(
            inn: Guid.NewGuid().ToString("N")[..16],
            name: "Overloaded contractor",
            capacityHours: 100m,
            rating: 4.8m,
            reliabilityClass: ReliabilityClass.B,
            status: ContractorStatus.Active,
            disciplineCodes: ["PIPING", "ELEC"]);

        var blocked = CreateContractor(
            inn: Guid.NewGuid().ToString("N")[..16],
            name: "Blocked contractor",
            capacityHours: 150m,
            rating: 4.7m,
            reliabilityClass: ReliabilityClass.A,
            status: ContractorStatus.Blocked,
            disciplineCodes: ["PIPING", "ELEC"]);

        var missingQualification = CreateContractor(
            inn: Guid.NewGuid().ToString("N")[..16],
            name: "Missing qualification contractor",
            capacityHours: 180m,
            rating: 4.1m,
            reliabilityClass: ReliabilityClass.A,
            status: ContractorStatus.Active,
            disciplineCodes: ["PIPING"]);

        await db.Set<Lot>().AddRangeAsync(lotMain, lotLoad);
        await db.Set<Contractor>().AddRangeAsync(
            recommendedPrimary,
            recommendedSecondary,
            overloaded,
            blocked,
            missingQualification);

        var procedure = new ProcurementProcedure
        {
            LotId = lotMain.Id,
            Status = ProcurementProcedureStatus.Sent,
            PurchaseTypeCode = "OPEN",
            ObjectName = "SQL shortlist recommendation procedure",
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
            ContractorId = overloaded.Id,
            ContractNumber = $"CTR-SQL-SR-{Guid.NewGuid():N}"[..20],
            Status = ContractStatus.Active
        });

        await db.SaveChangesAsync();

        return new RecommendationSeedResult(
            procedure.Id,
            recommendedPrimary.Id,
            recommendedSecondary.Id,
            overloaded.Id,
            missingQualification.Id);
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
            Email = $"{inn}@sql.local",
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
        Guid RecommendedPrimaryContractorId,
        Guid RecommendedSecondaryContractorId,
        Guid OverloadedContractorId,
        Guid MissingQualificationContractorId);
}
