-- Per-nation opt-out feature flags (docs/SAAS-READINESS-ROADMAP.md Tier 3.2 +
-- 5.2's flag half + 7.1). NULL/absent means "everything enabled" -- today's
-- exact behavior for every nation until an admin explicitly disables
-- something via /admin, matching every other NationSettings field's
-- "saved ?? default" convention (lib/table-columns.ts's isFeatureEnabled).

alter table nations add column enabled_features text[];
