using Subcontractor.Application.Contractors.Models;

namespace Subcontractor.Application.Contractors;

public static class ContractorRequestPolicy
{
    public static void EnsureCreateRequestValid(CreateContractorRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Inn))
        {
            throw new ArgumentException("INN is required.", nameof(request.Inn));
        }

        EnsureUpdateRequestValid(new UpdateContractorRequest
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

    public static void EnsureUpdateRequestValid(UpdateContractorRequest request)
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

    public static string NormalizeInn(string inn)
    {
        return inn.Trim();
    }

    public static string NormalizeText(string value)
    {
        return value.Trim();
    }

    public static IReadOnlyCollection<string> NormalizeDisciplineCodes(IReadOnlyCollection<string> codes)
    {
        return (codes ?? Array.Empty<string>())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToUpperInvariant())
            .Distinct()
            .ToArray();
    }
}
