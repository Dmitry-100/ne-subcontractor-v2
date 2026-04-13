using Subcontractor.Application.Imports;
using Subcontractor.Domain.Imports;

namespace Subcontractor.Tests.Unit.Imports;

public sealed class XmlSourceDataImportInboxPoliciesTests
{
    [Fact]
    public void NormalizeFileName_ShouldTrimValue()
    {
        var normalized = XmlSourceDataImportInboxRequestPolicy.NormalizeFileName("  source.xml  ");

        Assert.Equal("source.xml", normalized);
    }

    [Fact]
    public void NormalizeFileName_WhenMissing_ShouldThrowArgumentException()
    {
        var error = Assert.Throws<ArgumentException>(() => XmlSourceDataImportInboxRequestPolicy.NormalizeFileName("  "));

        Assert.Equal("fileName", error.ParamName);
    }

    [Fact]
    public void EnsureWellFormedXml_WhenPayloadInvalid_ShouldThrowArgumentException()
    {
        var error = Assert.Throws<ArgumentException>(() => XmlSourceDataImportInboxRequestPolicy.EnsureWellFormedXml("<root><row></root>"));

        Assert.Equal("xmlContent", error.ParamName);
        Assert.Contains("Invalid XML payload", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ParseRows_ShouldParseAttributesElementsAndFallbacks()
    {
        const string xml = """
            <root>
              <row rowNumber="5" projectCode="PRJ-001" objectWbs="A.01" disciplineCode="PIPING" manHours="12,5" plannedStartDate="2026-04-01" plannedFinishDate="2026-04-11" />
              <item>
                <ProjectCode>PRJ-002</ProjectCode>
                <ObjectWbs>B.02</ObjectWbs>
                <DisciplineCode>ELEC</DisciplineCode>
                <ManHours>7.25</ManHours>
              </item>
            </root>
            """;

        var rows = XmlSourceDataImportXmlParserPolicy.ParseRows(xml);

        Assert.Equal(2, rows.Count);

        var first = rows.First();
        Assert.Equal(5, first.RowNumber);
        Assert.Equal("PRJ-001", first.ProjectCode);
        Assert.Equal("A.01", first.ObjectWbs);
        Assert.Equal("PIPING", first.DisciplineCode);
        Assert.Equal(12.5m, first.ManHours);
        Assert.Equal(new DateTime(2026, 4, 1), first.PlannedStartDate);
        Assert.Equal(new DateTime(2026, 4, 11), first.PlannedFinishDate);

        var second = rows.Last();
        Assert.Equal(2, second.RowNumber);
        Assert.Equal("PRJ-002", second.ProjectCode);
        Assert.Equal("B.02", second.ObjectWbs);
        Assert.Equal("ELEC", second.DisciplineCode);
        Assert.Equal(7.25m, second.ManHours);
        Assert.Null(second.PlannedStartDate);
    }

    [Fact]
    public void ParseRows_WhenRootLooksLikeRow_ShouldUseRootAsSingleRow()
    {
        const string xml = """
            <work>
              <projectCode>PRJ-ROOT</projectCode>
              <objectWbs>ROOT.01</objectWbs>
              <disciplineCode>PIP</disciplineCode>
              <manHours>9</manHours>
            </work>
            """;

        var rows = XmlSourceDataImportXmlParserPolicy.ParseRows(xml);

        var row = Assert.Single(rows);
        Assert.Equal(1, row.RowNumber);
        Assert.Equal("PRJ-ROOT", row.ProjectCode);
        Assert.Equal("ROOT.01", row.ObjectWbs);
        Assert.Equal("PIP", row.DisciplineCode);
        Assert.Equal(9m, row.ManHours);
    }

    [Fact]
    public void BuildBatchNotes_ShouldIncludeExternalDocumentIdWhenPresent()
    {
        var item = new XmlSourceDataImportInboxItem
        {
            SourceSystem = "ExpressPlanning",
            ExternalDocumentId = "DOC-42"
        };

        var notes = XmlSourceDataImportInboxRequestPolicy.BuildBatchNotes(item);

        Assert.Equal("XML SourceSystem: ExpressPlanning; ExternalDocumentId: DOC-42", notes);
    }

    [Fact]
    public void TruncateError_ShouldFallbackAndLimitTo2000Chars()
    {
        var fallback = XmlSourceDataImportInboxRequestPolicy.TruncateError("   ");
        var truncated = XmlSourceDataImportInboxRequestPolicy.TruncateError(new string('x', 2500));

        Assert.Equal("XML processing failed.", fallback);
        Assert.Equal(2000, truncated.Length);
    }
}
