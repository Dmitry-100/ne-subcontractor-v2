using Subcontractor.Application.ContractorRatings;
using Subcontractor.Domain.ContractorRatings;
using Subcontractor.Domain.Contractors;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Contractors;

public sealed class ContractorRatingReadQueryServiceTests
{
    [Fact]
    public async Task GetAnalyticsAsync_EmptyDatabase_ShouldReturnEmptyRows()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new ContractorRatingReadQueryService(db);

        var rows = await service.GetAnalyticsAsync(CancellationToken.None);

        Assert.NotNull(rows);
        Assert.Empty(rows);
    }

    [Fact]
    public async Task GetHistoryAsync_UnknownContractor_ShouldThrow()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new ContractorRatingReadQueryService(db);

        var unknownContractorId = Guid.NewGuid();
        var ex = await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            service.GetHistoryAsync(unknownContractorId, 10, CancellationToken.None));

        Assert.Contains(unknownContractorId.ToString(), ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetHistoryAsync_TopLessThanOne_ShouldClampToSingleRow()
    {
        await using var db = TestDbContextFactory.Create();

        var contractor = new Contractor
        {
            Inn = "1234567890",
            Name = "ООО Тест Подрядчик",
            City = "Москва",
            ContactName = "Иванов И.И.",
            Phone = "+7-900-000-00-00",
            Email = "test@noreply.local",
            CapacityHours = 1000m,
            CurrentRating = 4.0m,
            CurrentLoadPercent = 20m,
            Status = ContractorStatus.Active
        };
        db.Set<Contractor>().Add(contractor);
        await db.SaveChangesAsync();

        var model = new ContractorRatingModelVersion
        {
            VersionCode = "R-TOP-CLAMP",
            Name = "Тестовая модель",
            IsActive = true,
            ActivatedAtUtc = new DateTimeOffset(2026, 4, 1, 9, 0, 0, TimeSpan.Zero)
        };
        db.Set<ContractorRatingModelVersion>().Add(model);
        await db.SaveChangesAsync();

        var older = new ContractorRatingHistoryEntry
        {
            ContractorId = contractor.Id,
            ModelVersionId = model.Id,
            SourceType = ContractorRatingRecordSourceType.AutoRecalculation,
            CalculatedAtUtc = new DateTimeOffset(2026, 4, 1, 9, 0, 0, TimeSpan.Zero),
            DeliveryDisciplineScore = 70m,
            CommercialDisciplineScore = 70m,
            ClaimDisciplineScore = 70m,
            ManualExpertScore = 70m,
            WorkloadPenaltyScore = 70m,
            FinalScore = 70m
        };
        var newer = new ContractorRatingHistoryEntry
        {
            ContractorId = contractor.Id,
            ModelVersionId = model.Id,
            SourceType = ContractorRatingRecordSourceType.AutoRecalculation,
            CalculatedAtUtc = new DateTimeOffset(2026, 4, 2, 9, 0, 0, TimeSpan.Zero),
            DeliveryDisciplineScore = 85m,
            CommercialDisciplineScore = 85m,
            ClaimDisciplineScore = 85m,
            ManualExpertScore = 85m,
            WorkloadPenaltyScore = 85m,
            FinalScore = 85m
        };
        db.Set<ContractorRatingHistoryEntry>().AddRange([older, newer]);
        await db.SaveChangesAsync();

        var service = new ContractorRatingReadQueryService(db);
        var history = await service.GetHistoryAsync(contractor.Id, 0, CancellationToken.None);

        Assert.Single(history);
        Assert.Equal(newer.Id, history[0].Id);
    }
}
