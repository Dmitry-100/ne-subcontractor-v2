using Microsoft.EntityFrameworkCore;
using Subcontractor.Application.ProcurementProcedures;
using Subcontractor.Application.ProcurementProcedures.Models;
using Subcontractor.Domain.Files;
using Subcontractor.Domain.Imports;
using Subcontractor.Domain.Lots;
using Subcontractor.Domain.Procurement;
using Subcontractor.Domain.Projects;
using Subcontractor.Tests.Integration.TestInfrastructure;

namespace Subcontractor.Tests.Integration.Procurement;

public sealed class ProcedureFromSourceDataWorkflowTests
{
    [Fact]
    public async Task CreateFromSourceDataAsync_ShouldCreateLotProcedureSourceLinksAndBindTechnicalAssignment()
    {
        await using var db = TestDbContextFactory.Create();
        var project = new Project { Code = "25-089", Name = "ЦХПП" };
        var batch = new SourceDataImportBatch
        {
            FileName = "express.xlsx",
            Status = SourceDataImportBatchStatus.Validated,
            TotalRows = 2,
            ValidRows = 2
        };
        var row1 = new SourceDataImportRow
        {
            Batch = batch,
            RowNumber = 2,
            ProjectCode = "25-089",
            ProjectName = "ЦХПП",
            ObjectWbs = "1",
            DisciplineCode = "Технологическая компоновка и обвязка промышленных объектов",
            ResourceDisciplineName = "01.6 Отдел технологического проектирования (механики)",
            ManHours = 635.2m,
            IsValid = true
        };
        var row2 = new SourceDataImportRow
        {
            Batch = batch,
            RowNumber = 3,
            ProjectCode = "25-089",
            ProjectName = "ЦХПП",
            ObjectWbs = "2",
            DisciplineCode = "Технологическая компоновка и обвязка промышленных объектов",
            ResourceDisciplineName = "01.6 Отдел технологического проектирования (механики)",
            ManHours = 104.8m,
            IsValid = true
        };
        var technicalAssignment = new StoredFile
        {
            FileName = "ТЗ.pdf",
            ContentType = "application/pdf",
            FileSizeBytes = 12,
            Content = [1, 2, 3],
            OwnerEntityType = "UNASSIGNED",
            OwnerEntityId = Guid.Empty
        };

        await db.Set<Project>().AddAsync(project);
        await db.Set<SourceDataImportBatch>().AddAsync(batch);
        await db.Set<SourceDataImportRow>().AddRangeAsync(row1, row2);
        await db.Set<StoredFile>().AddAsync(technicalAssignment);
        await db.SaveChangesAsync();

        var service = new ProcedureFromSourceDataWorkflowService(
            db,
            new ProcedureAttachmentBindingService(db));

        var result = await service.CreateFromSourceDataAsync(new CreateProcedureFromSourceDataRequest
        {
            SourceDataRowIds = [row1.Id, row2.Id],
            TechnicalAssignmentFileId = technicalAssignment.Id,
            PurchaseTypeCode = "subcontract",
            RequestTitle = "Закупка технологических работ ЦХПП"
        });

        Assert.Equal(2, result.SourceRowsCount);
        Assert.Equal(740m, result.TotalManHours);
        Assert.Equal("SUBCONTRACT", result.Procedure.PurchaseTypeCode);
        Assert.Equal("Закупка технологических работ ЦХПП", result.Procedure.ObjectName);
        var attachment = Assert.Single(result.Procedure.Attachments);
        Assert.Equal("ТЗ.pdf", attachment.FileName);

        var lot = await db.Set<Lot>().Include(x => x.Items).SingleAsync(x => x.Id == result.LotId);
        Assert.Equal(LotStatus.InProcurement, lot.Status);
        Assert.Equal(2, lot.Items.Count);

        var links = await db.Set<ProcurementProcedureSourceDataRow>()
            .Where(x => x.ProcedureId == result.ProcedureId)
            .ToListAsync();
        Assert.Equal(2, links.Count);
    }
}
