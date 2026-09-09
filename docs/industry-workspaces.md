# Independent industry dashboards

Entry: `/industry-workspaces` (shop OWNER or FRONTDESK only).

| Route | Ticket deviceCategory | Product grouping |
| --- | --- | --- |
| appliances | APPLIANCE | Household appliances |
| facilities | FACILITIES | Heating/cooling facilities |
| vehicles | VEHICLE | Vehicles and motorcycles |
| industrial | INDUSTRIAL | Electrical/industrial equipment |

These are Peyvo product groups, informed by the TVTO archive's electricity,
electronics, facilities, automotive and mechanics groups at https://rpcd.irantvto.ir/.
They are not a claim of official occupational codes or TVTO approval.

## Scope shipped

- Separate read-only dashboards with real, tenant-scoped counts and 30 latest records.
- Invalid industry keys rejected; legacy MOBILE/COMPUTER records never reused.
- No schema migrations, automatic reclassification, signup changes, navigation changes,
  changes to existing dashboards or writes to existing repair records.
- Independent, route-scoped CSS. Explicit errors, loading and empty states.

## Not activated yet

Industry selection at signup, specialized intake, service visits/scheduling, vehicle
identifiers and per-industry billing/SMS workflows. Existing intake validation only
accepts MOBILE/COMPUTER, so newly introduced groups initially have no records.
Do not advertise these dashboards as a complete usable intake workflow. Enabling
intake later requires server validation, quota enforcement, customer receipts and
notification templates to be verified together.
