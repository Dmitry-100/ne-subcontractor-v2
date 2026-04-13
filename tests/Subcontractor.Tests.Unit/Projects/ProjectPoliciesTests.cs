using Subcontractor.Application.Projects;
using Subcontractor.Application.Projects.Models;
using Subcontractor.Domain.Projects;

namespace Subcontractor.Tests.Unit.Projects;

public sealed class ProjectPoliciesTests
{
    [Fact]
    public void EnsureCreateRequestValid_EmptyCode_ShouldThrow()
    {
        var error = Assert.Throws<ArgumentException>(() => ProjectRequestPolicy.EnsureCreateRequestValid(
            new CreateProjectRequest
            {
                Code = " ",
                Name = "Valid name"
            }));

        Assert.Equal("code", error.ParamName);
    }

    [Fact]
    public void EnsureUpdateRequestValid_EmptyName_ShouldThrow()
    {
        var error = Assert.Throws<ArgumentException>(() => ProjectRequestPolicy.EnsureUpdateRequestValid(
            new UpdateProjectRequest
            {
                Name = " "
            }));

        Assert.Equal("name", error.ParamName);
    }

    [Fact]
    public void NormalizeCode_ShouldTrim()
    {
        var result = ProjectRequestPolicy.NormalizeCode(" PRJ-001 ");

        Assert.Equal("PRJ-001", result);
    }

    [Fact]
    public void NormalizeName_ShouldTrim()
    {
        var result = ProjectRequestPolicy.NormalizeName(" Project name ");

        Assert.Equal("Project name", result);
    }

    [Fact]
    public void ApplyReadScope_ScopedUser_ShouldFilterByGipUser()
    {
        var currentUserId = Guid.NewGuid();
        var projects = new[]
        {
            new Project { Code = "PRJ-1", Name = "One", GipUserId = currentUserId },
            new Project { Code = "PRJ-2", Name = "Two", GipUserId = Guid.NewGuid() },
            new Project { Code = "PRJ-3", Name = "Three", GipUserId = null }
        }.AsQueryable();

        var filtered = ProjectReadScopePolicy.ApplyReadScope(
            projects,
            new ProjectAccessScope(currentUserId, false))
            .ToArray();

        var item = Assert.Single(filtered);
        Assert.Equal("PRJ-1", item.Code);
    }
}
