using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Subcontractor.Application.Abstractions;
using Subcontractor.Infrastructure.Configuration;

namespace Subcontractor.Infrastructure.Services;

public sealed class SmtpNotificationEmailSender : INotificationEmailSender
{
    private readonly ILogger<SmtpNotificationEmailSender> _logger;
    private readonly SmtpOptions _options;

    public SmtpNotificationEmailSender(
        ILogger<SmtpNotificationEmailSender> logger,
        IOptions<SmtpOptions> options)
    {
        _logger = logger;
        _options = options.Value;
    }

    public async Task<NotificationEmailSendResult> SendAsync(
        NotificationEmailMessage message,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(message);

        if (!_options.Enabled)
        {
            _logger.LogDebug(
                "SMTP notifications are disabled. Email to {Recipient} was skipped.",
                message.ToEmail);
            return new NotificationEmailSendResult(true, null);
        }

        if (_options.DryRun)
        {
            _logger.LogInformation(
                "[SMTP dry-run] To: {Recipient}; Subject: {Subject}; Body: {Body}",
                message.ToEmail,
                message.Subject,
                message.Body);
            return new NotificationEmailSendResult(true, null);
        }

        if (string.IsNullOrWhiteSpace(_options.Host))
        {
            return new NotificationEmailSendResult(false, "SMTP host is not configured.");
        }

        if (string.IsNullOrWhiteSpace(_options.FromAddress))
        {
            return new NotificationEmailSendResult(false, "SMTP from address is not configured.");
        }

        try
        {
            using var smtpClient = new SmtpClient(_options.Host, _options.Port)
            {
                EnableSsl = _options.EnableSsl
            };

            if (!string.IsNullOrWhiteSpace(_options.Username))
            {
                smtpClient.Credentials = new NetworkCredential(_options.Username, _options.Password ?? string.Empty);
            }

            using var mailMessage = new MailMessage
            {
                From = CreateFromAddress(),
                Subject = message.Subject,
                Body = message.Body
            };
            mailMessage.To.Add(message.ToEmail);

            cancellationToken.ThrowIfCancellationRequested();
            await smtpClient.SendMailAsync(mailMessage);
            return new NotificationEmailSendResult(true, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SMTP send failed for recipient {Recipient}.", message.ToEmail);
            return new NotificationEmailSendResult(false, ex.Message);
        }
    }

    private MailAddress CreateFromAddress()
    {
        if (string.IsNullOrWhiteSpace(_options.FromDisplayName))
        {
            return new MailAddress(_options.FromAddress);
        }

        return new MailAddress(_options.FromAddress, _options.FromDisplayName);
    }
}
