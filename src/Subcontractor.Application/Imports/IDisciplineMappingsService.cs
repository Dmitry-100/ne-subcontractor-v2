using Subcontractor.Application.Imports.Models;

namespace Subcontractor.Application.Imports;

public interface IDisciplineMappingsService
{
    Task<IReadOnlyList<DisciplineMappingDto>> ListAsync(CancellationToken cancellationToken = default);

    Task<UpsertDisciplineMappingsResultDto> UpsertAsync(
        UpsertDisciplineMappingsRequest request,
        CancellationToken cancellationToken = default);
}
