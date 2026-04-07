using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Contractors.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;

namespace Subcontractor.Application.Contractors;

public sealed class ContractorsService : IContractorsService
{
    private readonly IApplicationDbContext _dbContext;

    public ContractorsService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ContractorListItemDto>> ListAsync(string? search, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Contractors.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(x =>
                x.Name.Contains(normalizedSearch) ||
                x.Inn.Contains(normalizedSearch) ||
                x.City.Contains(normalizedSearch));
        }

        return await query
            .OrderBy(x => x.Name)
            .Select(x => new ContractorListItemDto(
                x.Id,
                x.Inn,
                x.Name,
                x.City,
                x.Status,
                x.ReliabilityClass,
                x.CurrentRating,
                x.CurrentLoadPercent))
            .ToListAsync(cancellationToken);
    }

    public async Task<ContractorDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var contractor = await _dbContext.Set<Contractor>()
            .AsNoTracking()
            .Include(x => x.Qualifications)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return contractor is null ? null : ToDetailsDto(contractor);
    }

    public async Task<ContractorDetailsDto> CreateAsync(CreateContractorRequest request, CancellationToken cancellationToken = default)
    {
        ValidateCreateRequest(request);

        var normalizedInn = request.Inn.Trim();
        var exists = await _dbContext.Contractors.AnyAsync(x => x.Inn == normalizedInn, cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException($"Contractor with INN '{normalizedInn}' already exists.");
        }

        var contractor = new Contractor
        {
            Inn = normalizedInn,
            Name = request.Name.Trim(),
            City = request.City.Trim(),
            ContactName = request.ContactName.Trim(),
            Phone = request.Phone.Trim(),
            Email = request.Email.Trim(),
            CapacityHours = request.CapacityHours,
            CurrentRating = request.CurrentRating,
            CurrentLoadPercent = request.CurrentLoadPercent,
            ManualSupportCoefficient = request.ManualSupportCoefficient,
            ReliabilityClass = request.ReliabilityClass,
            Status = request.Status
        };

        foreach (var disciplineCode in NormalizeDisciplineCodes(request.DisciplineCodes))
        {
            contractor.Qualifications.Add(new ContractorQualification
            {
                Contractor = contractor,
                DisciplineCode = disciplineCode
            });
        }

        await _dbContext.Set<Contractor>().AddAsync(contractor, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToDetailsDto(contractor);
    }

    public async Task<ContractorDetailsDto?> UpdateAsync(Guid id, UpdateContractorRequest request, CancellationToken cancellationToken = default)
    {
        ValidateUpdateRequest(request);

        var contractor = await _dbContext.Set<Contractor>()
            .Include(x => x.Qualifications)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (contractor is null)
        {
            return null;
        }

        contractor.Name = request.Name.Trim();
        contractor.City = request.City.Trim();
        contractor.ContactName = request.ContactName.Trim();
        contractor.Phone = request.Phone.Trim();
        contractor.Email = request.Email.Trim();
        contractor.CapacityHours = request.CapacityHours;
        contractor.CurrentRating = request.CurrentRating;
        contractor.CurrentLoadPercent = request.CurrentLoadPercent;
        contractor.ManualSupportCoefficient = request.ManualSupportCoefficient;
        contractor.ReliabilityClass = request.ReliabilityClass;
        contractor.Status = request.Status;

        var normalizedCodes = NormalizeDisciplineCodes(request.DisciplineCodes).ToHashSet();
        var qualificationsToRemove = contractor.Qualifications
            .Where(x => !normalizedCodes.Contains(x.DisciplineCode))
            .ToArray();

        foreach (var qualification in qualificationsToRemove)
        {
            contractor.Qualifications.Remove(qualification);
        }

        var existingCodes = contractor.Qualifications.Select(x => x.DisciplineCode).ToHashSet();
        foreach (var disciplineCode in normalizedCodes)
        {
            if (existingCodes.Contains(disciplineCode))
            {
                continue;
            }

            contractor.Qualifications.Add(new ContractorQualification
            {
                ContractorId = contractor.Id,
                DisciplineCode = disciplineCode
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToDetailsDto(contractor);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var contractor = await _dbContext.Set<Contractor>()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (contractor is null)
        {
            return false;
        }

        _dbContext.Set<Contractor>().Remove(contractor);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<int> RecalculateCurrentLoadsAsync(CancellationToken cancellationToken = default)
    {
        var activeLoadByContractor = await (
                from contract in _dbContext.Set<Contract>().AsNoTracking()
                join item in _dbContext.Set<LotItem>().AsNoTracking()
                    on contract.LotId equals item.LotId
                where contract.Status == ContractStatus.Signed || contract.Status == ContractStatus.Active
                group item by contract.ContractorId
                into grouped
                select new
                {
                    ContractorId = grouped.Key,
                    TotalManHours = grouped.Sum(x => x.ManHours)
                })
            .ToDictionaryAsync(
                x => x.ContractorId,
                x => x.TotalManHours,
                cancellationToken);

        var contractors = await _dbContext.Set<Contractor>()
            .Where(x => x.Status == ContractorStatus.Active)
            .ToListAsync(cancellationToken);

        var updatedCount = 0;
        foreach (var contractor in contractors)
        {
            var activeLoadHours = activeLoadByContractor.GetValueOrDefault(contractor.Id);
            var calculatedLoadPercent = CalculateLoadPercent(activeLoadHours, contractor.CapacityHours);
            if (contractor.CurrentLoadPercent == calculatedLoadPercent)
            {
                continue;
            }

            contractor.CurrentLoadPercent = calculatedLoadPercent;
            updatedCount++;
        }

        if (updatedCount > 0)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return updatedCount;
    }

    private static ContractorDetailsDto ToDetailsDto(Contractor contractor)
    {
        return new ContractorDetailsDto(
            contractor.Id,
            contractor.Inn,
            contractor.Name,
            contractor.City,
            contractor.ContactName,
            contractor.Phone,
            contractor.Email,
            contractor.CapacityHours,
            contractor.CurrentRating,
            contractor.CurrentLoadPercent,
            contractor.ManualSupportCoefficient,
            contractor.ReliabilityClass,
            contractor.Status,
            contractor.Qualifications.Select(x => x.DisciplineCode).OrderBy(x => x).ToArray());
    }

    private static void ValidateCreateRequest(CreateContractorRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Inn))
        {
            throw new ArgumentException("INN is required.", nameof(request.Inn));
        }

        ValidateUpdateRequest(new UpdateContractorRequest
        {
            Name = request.Name,
            City = request.City,
            ContactName = request.ContactName,
            Phone = request.Phone,
            Email = request.Email,
            CapacityHours = request.CapacityHours,
            CurrentRating = request.CurrentRating,
            CurrentLoadPercent = request.CurrentLoadPercent,
            ManualSupportCoefficient = request.ManualSupportCoefficient,
            ReliabilityClass = request.ReliabilityClass,
            Status = request.Status,
            DisciplineCodes = request.DisciplineCodes
        });
    }

    private static void ValidateUpdateRequest(UpdateContractorRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Contractor name is required.", nameof(request.Name));
        }

        if (request.CapacityHours < 0)
        {
            throw new ArgumentException("Capacity hours must be non-negative.", nameof(request.CapacityHours));
        }

        if (request.CurrentLoadPercent < 0)
        {
            throw new ArgumentException("Load percent must be non-negative.", nameof(request.CurrentLoadPercent));
        }
    }

    private static IReadOnlyCollection<string> NormalizeDisciplineCodes(IReadOnlyCollection<string> codes)
    {
        return codes
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToUpperInvariant())
            .Distinct()
            .ToArray();
    }

    private static decimal CalculateLoadPercent(decimal activeLoadHours, decimal capacityHours)
    {
        if (capacityHours <= 0)
        {
            return activeLoadHours > 0 ? 100m : 0m;
        }

        var value = activeLoadHours * 100m / capacityHours;
        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }
}
