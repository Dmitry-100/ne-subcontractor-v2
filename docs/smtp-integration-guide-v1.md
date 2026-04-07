# SMTP Integration Guide v1

## Purpose

Configure SMTP channel (Exchange-compatible) for SLA notifications.

Implementation:

- `INotificationEmailSender` abstraction in Application layer;
- `SmtpNotificationEmailSender` in Infrastructure layer;
- options section `Smtp` in appsettings.

## Configuration

Example:

```json
{
  "Smtp": {
    "Enabled": true,
    "DryRun": false,
    "Host": "mail.company.local",
    "Port": 587,
    "EnableSsl": true,
    "Username": "svc-subcontractor-notify",
    "Password": "from-secret-store",
    "FromAddress": "subcontractor-notify@company.local",
    "FromDisplayName": "Subcontractor SLA Bot"
  }
}
```

Fields:

- `Enabled`: global on/off switch for sending.
- `DryRun`: if `true`, messages are logged but not sent to SMTP server.
- `Host`, `Port`, `EnableSsl`: SMTP connection parameters.
- `Username`, `Password`: optional credentials.
- `FromAddress`, `FromDisplayName`: sender identity.

## Environments

- Development: recommended `Enabled=false` or `DryRun=true`.
- Test/Pilot: `Enabled=true`, `DryRun=true` for routing validation.
- Production: `Enabled=true`, `DryRun=false`.

## Exchange notes

- For Exchange relay with integrated trust, credentials may be omitted.
- For authenticated relay, store credentials in infra secret manager and inject via environment variables.
- Ensure SMTP egress from application host is allowed by firewall.

## Troubleshooting

1. `Recipient email is not specified` in violation record:
   - check `ResponsibleCommercialUser` assignment and user email.
2. `SMTP host is not configured`:
   - configure `Smtp:Host`.
3. Connection/auth failures:
   - check TLS mode, port, relay policy, and service-account permissions.
