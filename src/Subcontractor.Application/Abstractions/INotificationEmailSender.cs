namespace Subcontractor.Application.Abstractions;

public interface INotificationEmailSender
{
    Task<NotificationEmailSendResult> SendAsync(
        NotificationEmailMessage message,
        CancellationToken cancellationToken = default);
}

public sealed record NotificationEmailMessage(
    string ToEmail,
    string Subject,
    string Body);

public sealed record NotificationEmailSendResult(
    bool IsSuccess,
    string? ErrorMessage);
