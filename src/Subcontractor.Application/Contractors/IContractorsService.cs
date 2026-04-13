using Subcontractor.Application.Contractors.Models;

namespace Subcontractor.Application.Contractors;

public interface IContractorsService
{
    Task<IReadOnlyList<ContractorListItemDto>> ListAsync(string? search, CancellationToken cancellationToken = default);
    Task<ContractorListPageDto> ListPageAsync(
        string? search,
        int skip,
        int take,
        CancellationToken cancellationToken = default);
    Task<ContractorDetailsDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ContractorDetailsDto> CreateAsync(CreateContractorRequest request, CancellationToken cancellationToken = default);
    Task<ContractorDetailsDto?> UpdateAsync(Guid id, UpdateContractorRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<int> RecalculateCurrentLoadsAsync(CancellationToken cancellationToken = default);
}
