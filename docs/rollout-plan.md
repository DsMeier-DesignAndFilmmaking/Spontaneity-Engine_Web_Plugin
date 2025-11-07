# Settings & Navigation Rollout Plan

## Alpha (Internal – ~1%)
- Audience: internal travel-ai team members and trusted QA devices.
- Flags: enable `settings_ui_enabled`, `auto_join_v1`, and `live_location` only for test accounts.
- Goals:
  - Validate privacy guardrails (audit + telemetry tables receiving pref changes).
  - Confirm error handling for disabled flags (UI hidden/403).
  - Exercise export/deletion queues end to end.

## Beta (Opt-in 5–10%)
- Gradually enable `settings_ui_enabled` for opt-in cohort while keeping `auto_join_v1` scoped to ~5% of active users.
- Live location flag remains off by default; whitelist early adopters.
- Monitor metrics:
  - `pref_changed` volume per user – no spikes beyond forecast.
  - `auto_join_triggered` outcome ratios (success vs failed).
  - Privacy/audit latency < 2 minutes.
- Ship weekly fixes; toggle flags without redeploy via admin API.

## General Availability
- Flip `settings_ui_enabled` and `live_location` to true for all tenants once:
  - Safety regression suite passes.
  - Auto-join failure rate < 0.5% for two consecutive weeks.
- Keep `auto_join_v1` behind flag for staged ramp (25% → 50% → 100%).
- Post-GA monitoring:
  - Alert on telemetry gaps (>5 minutes without events).
  - Review audit trail completeness weekly.

## Operational Controls
- Feature toggles managed through `/api/admin/feature-flags` (GET/PATCH) with JWT auth.
- Rollback steps:
  1. Disable `auto_join_v1` → immediately halts auto RSVP path.
  2. Disable `live_location` → reverts location sharing to "off" for all users.
  3. Disable `settings_ui_enabled` → hides settings surface and returns 404 from API.
- All changes logged via telemetry and stored in `feature_flags` table for auditing.
