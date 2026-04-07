using Subcontractor.Application.Exports.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;

namespace Subcontractor.Application.Exports;

public interface IRegistryExportService
{
    Task<RegistryExportFileDto> ExportProjectsAsync(string? search, CancellationToken cancellationToken = default);
    Task<RegistryExportFileDto> ExportContractorsAsync(string? search, CancellationToken cancellationToken = default);
    Task<RegistryExportFileDto> ExportLotsAsync(
        string? search,
        LotStatus? status,
        Guid? projectId,
        CancellationToken cancellationToken = default);
    Task<RegistryExportFileDto> ExportProceduresAsync(
        string? search,
        ProcurementProcedureStatus? status,
        Guid? lotId,
        CancellationToken cancellationToken = default);
    Task<RegistryExportFileDto> ExportContractsAsync(
        string? search,
        ContractStatus? status,
        Guid? lotId,
        Guid? procedureId,
        Guid? contractorId,
        CancellationToken cancellationToken = default);
}
