# Email Template Pack v1

## Scope

Templates used by SLA monitoring notifications.

## Template: `SLA_WARNING`

Subject:

`Предупреждение SLA: {Title}`

Body:

```text
Событие SLA: Предупреждение SLA
Объект: {Title}
Срок: {DueDate:yyyy-MM-dd}
Тип: {EntityType}
```

## Template: `SLA_OVERDUE`

Subject:

`Просрочка SLA: {Title}`

Body:

```text
Событие SLA: Просрочка SLA
Объект: {Title}
Срок: {DueDate:yyyy-MM-dd}
Тип: {EntityType}
```

## Placeholders

- `Title`: domain label of violated deadline.
- `DueDate`: monitored due date.
- `EntityType`: source discriminator:
  - `ProcedureProposalDueDate`
  - `ProcedureRequiredSubcontractorDeadline`
  - `ContractEndDate`
  - `ContractMilestone`

## Localization

Current baseline is Russian text in subject/body.
Future extension can route templates by culture if multilingual outbound communication is required.
