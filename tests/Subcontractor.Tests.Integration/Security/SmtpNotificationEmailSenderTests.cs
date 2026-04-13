using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Subcontractor.Application.Abstractions;
using Subcontractor.Infrastructure.Configuration;
using Subcontractor.Infrastructure.Services;

namespace Subcontractor.Tests.Integration.Security;

public sealed class SmtpNotificationEmailSenderTests
{
    [Fact]
    public async Task SendAsync_WhenSmtpIsDisabled_ShouldReturnSuccess()
    {
        var sender = CreateSender(new SmtpOptions
        {
            Enabled = false
        });

        var result = await sender.SendAsync(CreateMessage());

        Assert.True(result.IsSuccess);
        Assert.Null(result.ErrorMessage);
    }

    [Fact]
    public async Task SendAsync_WhenDryRunIsEnabled_ShouldReturnSuccessWithoutHostValidation()
    {
        var sender = CreateSender(new SmtpOptions
        {
            Enabled = true,
            DryRun = true,
            Host = string.Empty,
            FromAddress = string.Empty
        });

        var result = await sender.SendAsync(CreateMessage());

        Assert.True(result.IsSuccess);
        Assert.Null(result.ErrorMessage);
    }

    [Fact]
    public async Task SendAsync_WhenHostIsMissing_ShouldReturnConfigurationError()
    {
        var sender = CreateSender(new SmtpOptions
        {
            Enabled = true,
            DryRun = false,
            Host = string.Empty,
            FromAddress = "noreply@example.test"
        });

        var result = await sender.SendAsync(CreateMessage());

        Assert.False(result.IsSuccess);
        Assert.Equal("SMTP host is not configured.", result.ErrorMessage);
    }

    [Fact]
    public async Task SendAsync_WhenFromAddressIsMissing_ShouldReturnConfigurationError()
    {
        var sender = CreateSender(new SmtpOptions
        {
            Enabled = true,
            DryRun = false,
            Host = "localhost",
            FromAddress = string.Empty
        });

        var result = await sender.SendAsync(CreateMessage());

        Assert.False(result.IsSuccess);
        Assert.Equal("SMTP from address is not configured.", result.ErrorMessage);
    }

    [Fact]
    public async Task SendAsync_WhenCancellationIsRequestedBeforeSend_ShouldReturnFailure()
    {
        var sender = CreateSender(new SmtpOptions
        {
            Enabled = true,
            DryRun = false,
            Host = "localhost",
            Port = 2525,
            FromAddress = "noreply@example.test"
        });

        using var cts = new CancellationTokenSource();
        cts.Cancel();

        var result = await sender.SendAsync(CreateMessage(), cts.Token);

        Assert.False(result.IsSuccess);
        Assert.False(string.IsNullOrWhiteSpace(result.ErrorMessage));
    }

    private static SmtpNotificationEmailSender CreateSender(SmtpOptions options)
    {
        return new SmtpNotificationEmailSender(
            NullLogger<SmtpNotificationEmailSender>.Instance,
            Options.Create(options));
    }

    private static NotificationEmailMessage CreateMessage()
    {
        return new NotificationEmailMessage(
            "recipient@example.test",
            "SLA notification",
            "Body");
    }
}
