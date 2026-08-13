-- Per-nation currency label and Intl locale (docs/SAAS-READINESS-ROADMAP.md
-- Tier 6.1 + 6.2). NULL/absent means "kr"/"sv-SE" -- LND's exact current
-- hardcoded values, matching every other NationSettings field's
-- "saved ?? default" convention (lib/table-columns.ts's
-- getCurrency/getLocale).

alter table nations add column currency text;
alter table nations add column locale text;
