using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Contractors;
using Subcontractor.Application.Contractors.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Contractors;

public sealed class ContractorWriteWorkflowServiceTests
{
    [Fact]
    public async Task CreateAsync_ShouldNormalizeFieldsAndQualificationCodes()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new ContractorWriteWorkflowService(db);

        var created = await service.CreateAsync(new CreateContractorRequest
        {
            Inn = " 7700000001 ",
            Name = " Alpha Build ",
            City = " Moscow ",
            ContactName = " Ivan ",
            Phone = " +70000000001 ",
            Email = " alpha@test.local ",
            CapacityHours = 100m,
            CurrentRating = 3.4m,
            CurrentLoadPercent = 22m,
            ReliabilityClass = ReliabilityClass.A,
            Status = ContractorStatus.Active,
            DisciplineCodes = [" piping ", "PIPING", " elec "]
        });

        Assert.Equal("7700000001", created.Inn);
        Assert.Equal("Alpha Build", created.Name);
        Assert.Equal("Moscow", created.City);
        Assert.Equal(["ELEC", "PIPING"], created.DisciplineCodes);
    }

    [Fact]
    public async Task CreateAsync_DuplicateInn_ShouldThrowInvalidOperationException()
    {
        await using var db = TestDbContextFactory.Create();
        await db.Set<Contractor>().AddAsync(new Contractor
        {
            Inn = "7700000002",
            Name = "Existing",
            City = "Moscow",
            ContactName = "Existing",
            Phone = "+70000000002",
            Email = "existing@test.local",
            CapacityHours = 80m,
            Status = ContractorStatus.Active
        });
        await db.SaveChangesAsync();

        var service = new ContractorWriteWorkflowService(db);
        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(
            new CreateContractorRequest
            {
                Inn = "7700000002",
                Name = "Duplicate",
                City = "Moscow",
                ContactName = "D",
                Phone = "+70000000003",
                Email = "duplicate@test.local",
                CapacityHours = 40m
            }));

        Assert.Contains("already exists", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateAsync_UnknownContractor_ShouldReturnNull()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new ContractorWriteWorkflowService(db);

        var result = await service.UpdateAsync(Guid.NewGuid(), new UpdateContractorRequest
        {
            Name = "Unknown"
        });

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateAsync_ShouldSyncQualificationsAndPersistTrimmedFields()
    {
        await using var db = TestDbContextFactory.Create();
        var contractor = new Contractor
        {
            Inn = "7700000005",
            Name = "Original",
            City = "Moscow",
            ContactName = "Original",
            Phone = "+70000000005",
            Email = "original@test.local",
            CapacityHours = 120m,
            Status = ContractorStatus.Active,
            Qualifications =
            [
                new ContractorQualification { DisciplineCode = "PIPING" },
                new ContractorQualification { DisciplineCode = "ELEC" }
            ]
        };
        await db.Set<Contractor>().AddAsync(contractor);
        await db.SaveChangesAsync();

        var service = new ContractorWriteWorkflowService(db);
        var updated = await service.UpdateAsync(contractor.Id, new UpdateContractorRequest
        {
            Name = " Updated name ",
            City = " Saint Petersburg ",
            ContactName = " Updated contact ",
            Phone = " +79990000000 ",
            Email = " updated@test.local ",
            CapacityHours = 140m,
            CurrentRating = 4.5m,
            CurrentLoadPercent = 35m,
            ManualSupportCoefficient = 1.1m,
            ReliabilityClass = ReliabilityClass.B,
            Status = ContractorStatus.Blocked,
            DisciplineCodes = [" elec ", "civil "]
        });

        Assert.NotNull(updated);
        Assert.Equal("Updated name", updated!.Name);
        Assert.Equal("Saint Petersburg", updated.City);
        Assert.Equal(["CIVIL", "ELEC"], updated.DisciplineCodes);

        var persisted = await db.Set<Contractor>()
            .AsNoTracking()
            .Include(x => x.Qualifications)
            .FirstOrDefaultAsync(x => x.Id == contractor.Id);
        Assert.NotNull(persisted);
        Assert.Equal(2, persisted!.Qualifications.Count);
        Assert.Contains(persisted.Qualifications, x => x.DisciplineCode == "ELEC");
        Assert.Contains(persisted.Qualifications, x => x.DisciplineCode == "CIVIL");
        Assert.DoesNotContain(persisted.Qualifications, x => x.DisciplineCode == "PIPING");
    }

    [Fact]
    public async Task DeleteAsync_ShouldReturnFalseForUnknown_AndSoftDeleteKnown()
    {
        await using var db = TestDbContextFactory.Create();
        var service = new ContractorWriteWorkflowService(db);

        var unknownDeleted = await service.DeleteAsync(Guid.NewGuid());
        Assert.False(unknownDeleted);

        var contractor = new Contractor
        {
            Inn = "7700000010",
            Name = "Delete target",
            City = "Moscow",
            ContactName = "Delete",
            Phone = "+70000000010",
            Email = "delete@test.local",
            CapacityHours = 50m,
            Status = ContractorStatus.Active
        };
        await db.Set<Contractor>().AddAsync(contractor);
        await db.SaveChangesAsync();

        var deleted = await service.DeleteAsync(contractor.Id);
        Assert.True(deleted);

        var active = await db.Set<Contractor>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == contractor.Id);
        Assert.Null(active);

        var all = await db.Set<Contractor>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(x => x.Id == contractor.Id);
        Assert.NotNull(all);
        Assert.True(all!.IsDeleted);
    }
}
