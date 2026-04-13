using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Subcontractor.Domain.Users;
using Subcontractor.Web.Authorization;
using Subcontractor.Web.Configuration;
using WebAuthorizationServiceCollectionExtensions = Subcontractor.Web.Configuration.AuthorizationServiceCollectionExtensions;

namespace Subcontractor.Tests.Integration.Security;

public sealed class AuthorizationServiceCollectionExtensionsTests
{
    [Fact]
    public async Task AddSubcontractorAuthorization_ShouldRegisterAllMappedPolicies()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSubcontractorAuthorization();

        using var provider = services.BuildServiceProvider();
        var policyProvider = provider.GetRequiredService<IAuthorizationPolicyProvider>();

        foreach (var mapping in WebAuthorizationServiceCollectionExtensions.PolicyMappings)
        {
            var policy = await policyProvider.GetPolicyAsync(mapping.PolicyCode);

            Assert.NotNull(policy);
            Assert.Contains(policy.Requirements, requirement => requirement is DenyAnonymousAuthorizationRequirement);

            var permissionRequirement = Assert.Single(policy.Requirements.OfType<PermissionRequirement>());
            Assert.Equal(mapping.PermissionCode, permissionRequirement.PermissionCode);
        }
    }

    [Fact]
    public void AddSubcontractorAuthorization_ShouldRegisterPermissionAuthorizationHandler()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSubcontractorAuthorization();

        Assert.Contains(
            services,
            descriptor =>
                descriptor.ServiceType == typeof(IAuthorizationHandler) &&
                descriptor.ImplementationType == typeof(PermissionAuthorizationHandler) &&
                descriptor.Lifetime == ServiceLifetime.Scoped);
    }

    [Fact]
    public void PolicyMappings_ShouldCoverAllPolicyCodeConstants_WithoutDuplicates()
    {
        var declaredPolicyCodes = typeof(PolicyCodes)
            .GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(field => field.FieldType == typeof(string))
            .Select(field => (string?)field.GetValue(null))
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value!)
            .ToArray();

        var mappedPolicyCodes = WebAuthorizationServiceCollectionExtensions.PolicyMappings
            .Select(mapping => mapping.PolicyCode)
            .ToArray();

        Assert.Equal(mappedPolicyCodes.Length, mappedPolicyCodes.Distinct(StringComparer.Ordinal).Count());
        Assert.Equal(declaredPolicyCodes.Length, mappedPolicyCodes.Length);
        Assert.True(declaredPolicyCodes.All(code => mappedPolicyCodes.Contains(code, StringComparer.Ordinal)));
    }
}
