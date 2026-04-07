namespace Subcontractor.Application.Security;

public static class LoginNormalizer
{
    public static string Normalize(string? rawLogin)
    {
        if (string.IsNullOrWhiteSpace(rawLogin))
        {
            return string.Empty;
        }

        var login = rawLogin.Trim();
        var slashIndex = login.LastIndexOf('\\');
        if (slashIndex >= 0 && slashIndex + 1 < login.Length)
        {
            login = login[(slashIndex + 1)..];
        }

        var atIndex = login.IndexOf('@');
        if (atIndex > 0)
        {
            login = login[..atIndex];
        }

        return login.Trim().ToLowerInvariant();
    }
}
