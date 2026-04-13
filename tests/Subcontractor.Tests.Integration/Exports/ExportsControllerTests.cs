using Microsoft.AspNetCore.Mvc;
using Subcontractor.Application.Exports;
using Subcontractor.Application.Exports.Models;
using Subcontractor.Domain.Contracts;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Web.Controllers;

namespace Subcontractor.Tests.Integration.Exports;

public sealed class ExportsControllerTests
{
    [Fact]
    public async Task ExportProjects_ShouldReturnCsvFileAndPassSearch()
    {
        var service = new StubRegistryExportService();
        string? capturedSearch = null;
        service.ExportProjectsAsyncHandler = (search, _) =>
        {
            capturedSearch = search;
            return Task.FromResult(CreateCsv("projects-export.csv"));
        };

        var controller = new ExportsController(service);
        var result = await controller.ExportProjects("pipeline", CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/csv; charset=utf-8", file.ContentType);
        Assert.Equal("projects-export.csv", file.FileDownloadName);
        Assert.NotEmpty(file.FileContents);
        Assert.Equal("pipeline", capturedSearch);
    }

    [Fact]
    public async Task ExportContractors_ShouldReturnCsvFileAndPassSearch()
    {
        var service = new StubRegistryExportService();
        string? capturedSearch = null;
        service.ExportContractorsAsyncHandler = (search, _) =>
        {
            capturedSearch = search;
            return Task.FromResult(CreateCsv("contractors-export.csv"));
        };

        var controller = new ExportsController(service);
        var result = await controller.ExportContractors("rating", CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("contractors-export.csv", file.FileDownloadName);
        Assert.Equal("rating", capturedSearch);
    }

    [Fact]
    public async Task ExportLots_ShouldReturnCsvFileAndPassFilters()
    {
        var service = new StubRegistryExportService();
        string? capturedSearch = null;
        LotStatus? capturedStatus = null;
        Guid? capturedProjectId = null;
        var projectId = Guid.NewGuid();

        service.ExportLotsAsyncHandler = (search, status, incomingProjectId, _) =>
        {
            capturedSearch = search;
            capturedStatus = status;
            capturedProjectId = incomingProjectId;
            return Task.FromResult(CreateCsv("lots-export.csv"));
        };

        var controller = new ExportsController(service);
        var result = await controller.ExportLots("lot", LotStatus.InExecution, projectId, CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("lots-export.csv", file.FileDownloadName);
        Assert.Equal("lot", capturedSearch);
        Assert.Equal(LotStatus.InExecution, capturedStatus);
        Assert.Equal(projectId, capturedProjectId);
    }

    [Fact]
    public async Task ExportProcedures_ShouldReturnCsvFileAndPassFilters()
    {
        var service = new StubRegistryExportService();
        string? capturedSearch = null;
        ProcurementProcedureStatus? capturedStatus = null;
        Guid? capturedLotId = null;
        var lotId = Guid.NewGuid();

        service.ExportProceduresAsyncHandler = (search, status, incomingLotId, _) =>
        {
            capturedSearch = search;
            capturedStatus = status;
            capturedLotId = incomingLotId;
            return Task.FromResult(CreateCsv("procedures-export.csv"));
        };

        var controller = new ExportsController(service);
        var result = await controller.ExportProcedures("approval", ProcurementProcedureStatus.OnApproval, lotId, CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("procedures-export.csv", file.FileDownloadName);
        Assert.Equal("approval", capturedSearch);
        Assert.Equal(ProcurementProcedureStatus.OnApproval, capturedStatus);
        Assert.Equal(lotId, capturedLotId);
    }

    [Fact]
    public async Task ExportContracts_ShouldReturnCsvFileAndPassFilters()
    {
        var service = new StubRegistryExportService();
        string? capturedSearch = null;
        ContractStatus? capturedStatus = null;
        Guid? capturedLotId = null;
        Guid? capturedProcedureId = null;
        Guid? capturedContractorId = null;
        var lotId = Guid.NewGuid();
        var procedureId = Guid.NewGuid();
        var contractorId = Guid.NewGuid();

        service.ExportContractsAsyncHandler = (search, status, incomingLotId, incomingProcedureId, incomingContractorId, _) =>
        {
            capturedSearch = search;
            capturedStatus = status;
            capturedLotId = incomingLotId;
            capturedProcedureId = incomingProcedureId;
            capturedContractorId = incomingContractorId;
            return Task.FromResult(CreateCsv("contracts-export.csv"));
        };

        var controller = new ExportsController(service);
        var result = await controller.ExportContracts(
            "active",
            ContractStatus.Active,
            lotId,
            procedureId,
            contractorId,
            CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("contracts-export.csv", file.FileDownloadName);
        Assert.Equal("active", capturedSearch);
        Assert.Equal(ContractStatus.Active, capturedStatus);
        Assert.Equal(lotId, capturedLotId);
        Assert.Equal(procedureId, capturedProcedureId);
        Assert.Equal(contractorId, capturedContractorId);
    }

    private static RegistryExportFileDto CreateCsv(string fileName)
    {
        return new RegistryExportFileDto(
            fileName,
            "text/csv; charset=utf-8",
            "col1,col2\nv1,v2"u8.ToArray());
    }

    private sealed class StubRegistryExportService : IRegistryExportService
    {
        public Func<string?, CancellationToken, Task<RegistryExportFileDto>> ExportProjectsAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult(CreateCsv("projects.csv"));

        public Func<string?, CancellationToken, Task<RegistryExportFileDto>> ExportContractorsAsyncHandler { get; set; } =
            static (_, _) => Task.FromResult(CreateCsv("contractors.csv"));

        public Func<string?, LotStatus?, Guid?, CancellationToken, Task<RegistryExportFileDto>> ExportLotsAsyncHandler { get; set; } =
            static (_, _, _, _) => Task.FromResult(CreateCsv("lots.csv"));

        public Func<string?, ProcurementProcedureStatus?, Guid?, CancellationToken, Task<RegistryExportFileDto>> ExportProceduresAsyncHandler { get; set; } =
            static (_, _, _, _) => Task.FromResult(CreateCsv("procedures.csv"));

        public Func<string?, ContractStatus?, Guid?, Guid?, Guid?, CancellationToken, Task<RegistryExportFileDto>> ExportContractsAsyncHandler { get; set; } =
            static (_, _, _, _, _, _) => Task.FromResult(CreateCsv("contracts.csv"));

        public Task<RegistryExportFileDto> ExportProjectsAsync(string? search, CancellationToken cancellationToken = default)
            => ExportProjectsAsyncHandler(search, cancellationToken);

        public Task<RegistryExportFileDto> ExportContractorsAsync(string? search, CancellationToken cancellationToken = default)
            => ExportContractorsAsyncHandler(search, cancellationToken);

        public Task<RegistryExportFileDto> ExportLotsAsync(
            string? search,
            LotStatus? status,
            Guid? projectId,
            CancellationToken cancellationToken = default)
            => ExportLotsAsyncHandler(search, status, projectId, cancellationToken);

        public Task<RegistryExportFileDto> ExportProceduresAsync(
            string? search,
            ProcurementProcedureStatus? status,
            Guid? lotId,
            CancellationToken cancellationToken = default)
            => ExportProceduresAsyncHandler(search, status, lotId, cancellationToken);

        public Task<RegistryExportFileDto> ExportContractsAsync(
            string? search,
            ContractStatus? status,
            Guid? lotId,
            Guid? procedureId,
            Guid? contractorId,
            CancellationToken cancellationToken = default)
            => ExportContractsAsyncHandler(search, status, lotId, procedureId, contractorId, cancellationToken);
    }
}
