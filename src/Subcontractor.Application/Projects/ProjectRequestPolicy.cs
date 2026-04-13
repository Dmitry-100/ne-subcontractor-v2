using Subcontractor.Application.Projects.Models;

namespace Subcontractor.Application.Projects;

public static class ProjectRequestPolicy
{
    public static string NormalizeCode(string code)
    {
        var normalized = code.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new ArgumentException("Project code is required.", nameof(code));
        }

        return normalized;
    }

    public static string NormalizeName(string name)
    {
        var normalized = name.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new ArgumentException("Project name is required.", nameof(name));
        }

        return normalized;
    }

    public static void EnsureCreateRequestValid(CreateProjectRequest request)
    {
        NormalizeCode(request.Code);
        NormalizeName(request.Name);
    }

    public static void EnsureUpdateRequestValid(UpdateProjectRequest request)
    {
        NormalizeName(request.Name);
    }
}
