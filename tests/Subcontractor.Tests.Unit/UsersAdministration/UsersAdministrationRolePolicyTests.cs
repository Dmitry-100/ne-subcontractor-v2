using Subcontractor.Application.UsersAdministration;
using Subcontractor.Domain.Users;

namespace Subcontractor.Tests.Unit.UsersAdministration;

public sealed class UsersAdministrationRolePolicyTests
{
    [Fact]
    public void NormalizeRoleNames_ShouldTrimDistinctAndIgnoreCase()
    {
        var normalized = UsersAdministrationRolePolicy.NormalizeRoleNames([" ADMIN ", "admin", " VIEWER "]);

        Assert.Equal(new[] { "ADMIN", "VIEWER" }, normalized);
    }

    [Fact]
    public void EnsureRequestedRolesKnown_WithUnknownRole_ShouldThrowArgumentException()
    {
        var requested = new[] { "admin", "MISSING_ROLE" };
        var knownRoles = new[] { new AppRole { Name = "ADMIN", Description = "Admin role" } };

        var error = Assert.Throws<ArgumentException>(() =>
            UsersAdministrationRolePolicy.EnsureRequestedRolesKnown(
                requested,
                knownRoles,
                "RoleNames"));

        Assert.Contains("MISSING_ROLE", error.Message);
        Assert.DoesNotContain("admin", error.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("RoleNames", error.ParamName);
    }

    [Fact]
    public void EnsureRequestedRolesKnown_WithKnownRoles_ShouldNotThrow()
    {
        var requested = new[] { "ADMIN", "VIEWER" };
        var knownRoles = new[]
        {
            new AppRole { Name = "ADMIN", Description = "Admin role" },
            new AppRole { Name = "VIEWER", Description = "Viewer role" }
        };

        var error = Record.Exception(() =>
            UsersAdministrationRolePolicy.EnsureRequestedRolesKnown(
                requested,
                knownRoles,
                "RoleNames"));

        Assert.Null(error);
    }
}
