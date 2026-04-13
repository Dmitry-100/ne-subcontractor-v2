using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.Abstractions;
using Subcontractor.Application.Contractors.Models;
using Subcontractor.Domain.Contractors;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;

namespace Subcontractor.Application.Contractors;

public sealed class ContractorWriteWorkflowService
{
    private readonly IApplicationDbContext _dbContext;

    public ContractorWriteWorkflowService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ContractorDetailsDto> CreateAsync(
        CreateContractorRequest request,
        CancellationToken cancellationToken = default)
    {
        ContractorRequestPolicy.EnsureCreateRequestValid(request);

        var normalizedInn = ContractorRequestPolicy.NormalizeInn(request.Inn);
        var exists = await _dbContext.Contractors.AnyAsync(x => x.Inn == normalizedInn, cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException($"Contractor with INN '{normalizedInn}' already exists.");
        }

        var contractor = new Contractor
        {
            Inn = normalizedInn,
            Name = ContractorRequestPolicy.NormalizeText(request.Name),
            City = ContractorRequestPolicy.NormalizeText(request.City),
            ContactName = ContractorRequestPolicy.NormalizeText(request.ContactName),
            Phone = ContractorRequestPolicy.NormalizeText(request.Phone),
            Email = ContractorRequestPolicy.NormalizeText(request.Email),
            CapacityHours = request.CapacityHours,
            CurrentRating = request.CurrentRating,
            CurrentLoadPercent = request.CurrentLoadPercent,
            ManualSupportCoefficient = request.ManualSupportCoefficient,
            ReliabilityClass = request.ReliabilityClass,
            Status = request.Status
        };

        foreach (var disciplineCode in ContractorRequestPolicy.NormalizeDisciplineCodes(request.DisciplineCodes))
        {
            contractor.Qualifications.Add(new ContractorQualification
            {
                Contractor = contractor,
                DisciplineCode = disciplineCode
            });
        }

        await _dbContext.Set<Contractor>().AddAsync(contractor, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ContractorReadProjectionPolicy.ToDetailsDto(contractor);
    }

    public async Task<ContractorDetailsDto?> UpdateAsync(
        Guid id,
        UpdateContractorRequest request,
        CancellationToken cancellationToken = default)
    {
        ContractorRequestPolicy.EnsureUpdateRequestValid(request);

        var contractor = await _dbContext.Set<Contractor>()
            .Include(x => x.Qualifications)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (contractor is null)
        {
            return null;
        }

        contractor.Name = ContractorRequestPolicy.NormalizeText(request.Name);
        contractor.City = ContractorRequestPolicy.NormalizeText(request.City);
        contractor.ContactName = ContractorRequestPolicy.NormalizeText(request.ContactName);
        contractor.Phone = ContractorRequestPolicy.NormalizeText(request.Phone);
        contractor.Email = ContractorRequestPolicy.NormalizeText(request.Email);
        contractor.CapacityHours = request.CapacityHours;
        contractor.CurrentRating = request.CurrentRating;
        contractor.CurrentLoadPercent = request.CurrentLoadPercent;
        contractor.ManualSupportCoefficient = request.ManualSupportCoefficient;
        contractor.ReliabilityClass = request.ReliabilityClass;
        contractor.Status = request.Status;

        var normalizedCodes = ContractorRequestPolicy.NormalizeDisciplineCodes(request.DisciplineCodes)
            .ToHashSet(StringComparer.Ordinal);
        var qualificationsToRemove = contractor.Qualifications
            .Where(x => !normalizedCodes.Contains(x.DisciplineCode))
            .ToArray();

        foreach (var qualification in qualificationsToRemove)
        {
            contractor.Qualifications.Remove(qualification);
        }

        var existingCodes = contractor.Qualifications.Select(x => x.DisciplineCode)
            .ToHashSet(StringComparer.Ordinal);
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
        return ContractorReadProjectionPolicy.ToDetailsDto(contractor);
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
            var calculatedLoadPercent = ContractorLoadCalculationPolicy.CalculateLoadPercent(
                activeLoadHours,
                contractor.CapacityHours);
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
}
