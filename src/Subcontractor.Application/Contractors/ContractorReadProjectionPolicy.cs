using Subcontractor.Application.Contractors.Models;
using Subcontractor.Domain.Contractors;

namespace Subcontractor.Application.Contractors;

public static class ContractorReadProjectionPolicy
{
    public static ContractorDetailsDto ToDetailsDto(Contractor contractor)
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
            contractor.Qualifications
                .Select(x => x.DisciplineCode)
                .OrderBy(x => x)
                .ToArray());
    }
}
