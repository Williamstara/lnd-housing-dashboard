# Graph Report - /Users/williamstara/Documents/Systemutvecklare Kurser/Webbtjänster 2/untitled2/lnd-housing-dashboard  (2026-08-13)

## Corpus Check
- 145 files · ~163,964 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1063 nodes · 2827 edges · 51 communities (40 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.62)
- Token cost: 182,254 input · 0 output

## Community Hubs (Navigation)
- Admin & Nation Settings
- Apartment Management
- Shared Todo List
- Besiktningar (Inspections)
- Fastigheter & Role Access
- Rental Object Database
- Andrahandsgäster & Tenants
- Arkiv (Signed Contracts)
- Statistics Charts
- Tenant & Uppsägning Actions
- TypeScript Build Config
- Missed Rent Tracking
- API Route Handlers (auth-scoped)
- Email Template Editing UI
- Root Layout & Home Page
- Agent Workflow & Skills Policy
- API Route Handlers (CRUD)
- Postgres Schema & Fixed Workflows
- Apartment Data Access Layer
- API Route Handlers (misc)
- npm Dependencies
- Session Change Log
- Dev Tooling Dependencies
- Statistik Page & Queries
- Floor Plan Management
- Project Tech Stack Overview
- Laundry Account Provisioning
- Mongo→Supabase Migration Notes
- Architecture Known Limitations
- SaaS Readiness Roadmap
- Mail Template Image Handling
- package.json Scripts
- Core App Conventions
- Floor Plan Download Routes
- Recipient Group Queries
- Mail Template Library UI
- Mail Attachment Routes
- Hyresgästlista Linking
- Mongo Nations-ID Backfill Script
- Mongo Data-Quality Fix Script
- ESLint Config
- googleapis Dependency
- MUI Icons Dependency
- MUI Material Dependency
- Next.js Config
- nodemailer Dependency
- react-dom Dependency
- server-only Dependency
- nodemailer Types Dependency
- PostCSS Config

## God Nodes (most connected - your core abstractions)
1. `createSupabaseServerClient()` - 128 edges
2. `requireNationsId()` - 46 edges
3. `auth0` - 41 edges
4. `hasRole()` - 36 edges
5. `requireNationsIdOrRedirect()` - 26 edges
6. `useColumnVisibility()` - 23 edges
7. `exportRowsToXlsx()` - 21 edges
8. `BesiktningarTable()` - 19 edges
9. `ApartmentsTable()` - 17 edges
10. `getFastighetNamn()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Tier 6.2: Swedish locale hardcoded across 6+ call sites` --conceptually_related_to--> `getNationSettings()`  [INFERRED]
  /Users/williamstara/Documents/Systemutvecklare Kurser/Webbtjänster 2/untitled2/lnd-housing-dashboard/docs/SAAS-READINESS-ROADMAP.md → lib/nation-settings.ts
- `Missade hyror can anchor to a Databas rental object, not just an Apartment` --conceptually_related_to--> `findRentalObjectForApartment()`  [INFERRED]
  /Users/williamstara/Documents/Systemutvecklare Kurser/Webbtjänster 2/untitled2/lnd-housing-dashboard/docs/DECISIONS.md → lib/rentalobjects.ts
- `Tier 6.1: currency hardcoded to Swedish kronor` --conceptually_related_to--> `getBestandsoversikt()`  [INFERRED]
  /Users/williamstara/Documents/Systemutvecklare Kurser/Webbtjänster 2/untitled2/lnd-housing-dashboard/docs/SAAS-READINESS-ROADMAP.md → lib/statistik.ts
- `Tier 5.2: laundry-room integration is unconditional and vendor-specific` --references--> `createLaundryAccount()`  [EXTRACTED]
  /Users/williamstara/Documents/Systemutvecklare Kurser/Webbtjänster 2/untitled2/lnd-housing-dashboard/docs/SAAS-READINESS-ROADMAP.md → lib/laundry-account.ts
- `Tier 1.2: exactly one nationsID per Auth0 user, no multi-org support` --references--> `getNationsId()`  [EXTRACTED]
  /Users/williamstara/Documents/Systemutvecklare Kurser/Webbtjänster 2/untitled2/lnd-housing-dashboard/docs/SAAS-READINESS-ROADMAP.md → lib/nations.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **MongoDB to Supabase Migration** — docs_session_migration_phases, docs_decisions_mongodb_to_supabase_migration_complete, docs_decisions_supabase_third_party_auth_role_claim, docs_decisions_postgres_grants_required, docs_decisions_supabase_ssr_incompatible_accesstoken, docs_decisions_missed_rent_cross_database_id_mismatch, docs_handoff_completed_migration_summary [EXTRACTED 1.00]
- **Shared Excel Importer Pattern** — agents_excel_importer_pattern, docs_decisions_excel_date_cell_local_getters, docs_decisions_money_reduction_mathabs_normalization, docs_decisions_excel_import_skip_reasons_per_row, lib_table_columns_exceldatecelltoiso [EXTRACTED 1.00]
- **Role-Based Access Control Guard Functions** — agents_role_based_access, docs_saas_readiness_roadmap_role_gating_duplication, app_besiktningar_actions_requirehusvdrole, app_besiktningar_actions_requirearchiverole, app_admin_actions_requireadmin [EXTRACTED 1.00]

## Communities (51 total, 11 thin omitted)

### Community 0 - "Admin & Nation Settings"
Cohesion: 0.05
Nodes (96): assignNationsIdAction(), createNationAction(), getAvailableRolesAction(), getNationSettingsAction(), requireAdmin(), saveFastighetAliasesAction(), saveImportMappingAction(), saveRentalobjectsMultiTabAction() (+88 more)

### Community 1 - "Apartment Management"
Cohesion: 0.05
Nodes (90): Actor, archiveByLedigFromAction(), assignTenantAction(), createApartmentAction(), deleteApartmentAction(), importApartmentsFromExcelAction(), lookupApartmentSpecsAction(), markContractSentAction() (+82 more)

### Community 2 - "Shared Todo List"
Cohesion: 0.06
Nodes (65): deleteUserAction(), Admin, addSubtaskAction(), createTodoAction(), deleteSubtaskAction(), deleteTodoAction(), requireUser(), resolveAssignee() (+57 more)

### Community 3 - "Besiktningar (Inspections)"
Cohesion: 0.07
Nodes (62): archiveBesiktningAction(), archiveBesiktningarBulkAction(), createBesiktningAction(), deleteBesiktningAction(), importBesiktningarFromExcelAction(), markBetalningGjordAction(), markBetalningGjordBulkAction(), markKlarForBetalningAction() (+54 more)

### Community 4 - "Fastigheter & Role Access"
Cohesion: 0.07
Nodes (52): Role-based access control, NavGrid(), cleanPrefixes(), createFastighetAction(), deleteFastighetAction(), requireHusformanRole(), updateFastighetAction(), FastigheterPage (+44 more)

### Community 5 - "Rental Object Database"
Cohesion: 0.07
Nodes (49): createRentalObjectAction(), deleteRentalObjectAction(), importRentalObjectsAction(), requireUser(), updateRentalObjectAction(), validate(), detectGroup(), normalizeRenoveringsbehov() (+41 more)

### Community 6 - "Andrahandsgäster & Tenants"
Cohesion: 0.12
Nodes (32): createAndrahandsgastAction(), createAndrahandsgastLaundryAccountAction(), deleteAndrahandsgastAction(), importAndrahandsgasterFromExcelAction(), importTenantsFromExcelAction(), requireUser(), sanitizeAndrahandsgastInput(), updateAndrahandsgastAction() (+24 more)

### Community 7 - "Arkiv (Signed Contracts)"
Cohesion: 0.09
Nodes (29): ArkivPage, ArchiveTable(), ColumnKey, columns, columnValue, compareValues(), currency, CURRENCY_KEYS (+21 more)

### Community 8 - "Statistics Charts"
Cohesion: 0.10
Nodes (29): BarChart(), BarDatum, Props, DonutChart(), DonutSegment, Props, CATEGORICAL, ChartMode (+21 more)

### Community 9 - "Tenant & Uppsägning Actions"
Cohesion: 0.10
Nodes (28): createLaundryAccountAction(), createTenantAction(), deleteTenantAction(), sanitizeInput(), updateTenantAction(), ConfirmUppsagningDialog(), Props, LaundryAccountDialog() (+20 more)

### Community 10 - "TypeScript Build Config"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 11 - "Missed Rent Tracking"
Cohesion: 0.13
Nodes (24): createManualMissedRentAction(), createManualMissedRentFromRentalObjectAction(), deleteMissedRentAction(), requireHusformanRole(), requireUser(), updateMissedRentAction(), AddSource, ColumnKey (+16 more)

### Community 12 - "API Route Handlers (auth-scoped)"
Cohesion: 0.16
Nodes (15): GET(), DELETE(), GET(), requireAuth(), POST(), requireAuth(), ProfilPage(), ProfileGmailSection() (+7 more)

### Community 13 - "Email Template Editing UI"
Cohesion: 0.15
Nodes (17): EmailPreview(), FloorPlan, Props, Template, Props, Props, RecipientGroupPicker(), FloorPlan (+9 more)

### Community 14 - "Root Layout & Home Page"
Cohesion: 0.18
Nodes (11): generateMetadata(), montserrat, Home, auth0, getNationsId(), NATIONS_ID_CLAIM, theme, config (+3 more)

### Community 15 - "Agent Workflow & Skills Policy"
Cohesion: 0.18
Nodes (15): "This is NOT the Next.js you know" warning, Ponytail skill (implementation policy), Standard Agent Workflow, supabase-postgres-best-practices skill, supabase skill, vercel-react-best-practices skill, web-design-guidelines skill, CLAUDE.md ponytail-skill directive (+7 more)

### Community 16 - "API Route Handlers (CRUD)"
Cohesion: 0.19
Nodes (17): DELETE(), PATCH(), PUT(), requireAuth(), RouteContext, GET(), POST(), requireAuth() (+9 more)

### Community 17 - "Postgres Schema & Fixed Workflows"
Cohesion: 0.18
Nodes (19): Tier 3.1: leasing pipeline and besiktningar workflow are fixed state machines, previousWorkday(), public.todo_subtasks, andrahandsgaster, apartments, besiktningar, fastigheter, floor_plans (+11 more)

### Community 18 - "Apartment Data Access Layer"
Cohesion: 0.24
Nodes (17): getAllApartments(), getApartmentsByIds(), getApartmentsWithPastLedigFrom(), getLedigaLagenheter(), getRedoForKontrakt(), mapRow(), getApartmentsAvailableForManualEntry(), getMissedRentRows() (+9 more)

### Community 19 - "API Route Handlers (misc)"
Cohesion: 0.22
Nodes (14): DELETE(), PUT(), requireAuth(), RouteContext, GET(), POST(), requireAuth(), createFloorPlan() (+6 more)

### Community 20 - "npm Dependencies"
Cohesion: 0.12
Nodes (17): @auth0/nextjs-auth0, @emotion/react, @emotion/styled, @mui/material-nextjs, next, dependencies, @auth0/nextjs-auth0, @emotion/react (+9 more)

### Community 21 - "Session Change Log"
Cohesion: 0.12
Nodes (16): LineChart component (added then deleted), App Router route/feature structure, Error handling conventions, Apartments' fastighet derived from lägenhetsnummer prefix, Besiktningar bulk-mark/archive gained select-by-date shortcut, Besiktningar gained shared "Övriga anteckningar" field, not role-gated, Besiktningar Status card is a segmented bar, not a chart component, Desktop navigation is a left rail; mobile stays a drawer (+8 more)

### Community 22 - "Dev Tooling Dependencies"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+9 more)

### Community 23 - "Statistik Page & Queries"
Cohesion: 0.24
Nodes (13): StatistikPage, Statistik gained "bostäder per typ" and "lägenheter per status" charts as a symmetric pair, getAndrahandsgaster(), getRentalObjects(), getBestandsoversikt(), getGenerelltSkick(), getLagenheterPerStatus(), getMissedIncomeByYear() (+5 more)

### Community 24 - "Floor Plan Management"
Cohesion: 0.18
Nodes (9): FloorPlan, FloorPlan, FloorPlanCard(), Props, FloorPlan, Props, RenamePlanDialog(), Props (+1 more)

### Community 25 - "Project Tech Stack Overview"
Cohesion: 0.15
Nodes (13): frontend-design skill, LND Housing Dashboard (project), Material UI policy, MUI v9, Next.js 16.2.10 App Router, nodemailer + googleapis Gmail sending, React 19.2.4, Supabase (Postgres) Data API (+5 more)

### Community 26 - "Laundry Account Provisioning"
Cohesion: 0.24
Nodes (12): Building, createLaundryAccount(), deleteUser(), FASTIGHET_BUILDING, FASTIGHET_LAUNDRY_BUILDING, findExistingUser(), findUserByEmail(), getMgmtToken() (+4 more)

### Community 27 - "Mongo→Supabase Migration Notes"
Cohesion: 0.21
Nodes (8): Postgres Row Level Security tenant isolation, Supabase Storage buckets (floor-plans, uppsagningar-dokument, mail-template-attachments), missed-rent.ts cross-database ID mismatch: expected phased-migration gotcha, New Postgres tables need explicit GRANTs to authenticated, Supabase third-party auth requires plain role:"authenticated" claim, Completed this session: full four-phase Mongo-to-Supabase migration, Four-phase Mongo-to-Supabase migration plan, sync_todo_completion Postgres trigger

### Community 28 - "Architecture Known Limitations"
Cohesion: 0.22
Nodes (9): Deployment target (needs verification), Known technical limitations, Second Auth0 tenant for laundry-room provisioning, lib/ module-per-table responsibilities, Deferred: stale fastighet naming in laundry-account.ts and rentalobjects.ts, Tier 3.3: three inconsistent fastighet-name-resolution mechanisms (one stale), Tier 1.1: fastighet→lagenhetsnummer hierarchy baked into schema, TODO: fix stale building-name lookup tables in laundry-account.ts/rentalobjects.ts (+1 more)

### Community 29 - "SaaS Readiness Roadmap"
Cohesion: 0.22
Nodes (10): Tier 6.1: currency hardcoded to Swedish kronor, Tier 7.2: email template quick-insert variables fixed to rental concepts, Tier 4.1: create/edit form dialogs bypass NationSettings entirely, Tier 7.1: physical key-handover tracking is schema-level, not optional, Tier 5.2: laundry-room integration is unconditional and vendor-specific, Tier 6.2: Swedish locale hardcoded across 6+ call sites, Post-migration security audit (zero confirmed vulnerabilities), Tier 1.2: exactly one nationsID per Auth0 user, no multi-org support (+2 more)

### Community 30 - "Mail Template Image Handling"
Cohesion: 0.38
Nodes (9): embedUrlImages(), extractBase64Images(), POST(), requireAuth(), resolvePlaceholders(), stripHtml(), getFloorPlanByAptName(), getTemplateAttachment() (+1 more)

### Community 31 - "package.json Scripts"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, check:statistik, dev, lint, start (+1 more)

### Community 32 - "Core App Conventions"
Cohesion: 0.22
Nodes (9): Auth0 identity/roles/tenant system, Shared Excel importer shape, Multi-tenant nationsID scoping, Server Actions convention, xlsx (SheetJS) client-side Excel import/export, Server Component to Server Action data flow, Excel-import skip reasons shown per row, not just as a count, Money/reduction fields normalized with Math.abs() at parse time (+1 more)

### Community 33 - "Floor Plan Download Routes"
Cohesion: 0.33
Nodes (7): GET(), RouteContext, GET(), RouteContext, getFloorPlanFile(), requireNationsId(), getUppsagningFile()

### Community 34 - "Recipient Group Queries"
Cohesion: 0.47
Nodes (7): GET(), requireAuth(), getAllTenantRecipients(), getInflyttningRecipients(), getTenantRecipientsByFastighet(), getUtflyttningRecipients(), RecipientEntry

### Community 35 - "Mail Template Library UI"
Cohesion: 0.29
Nodes (5): MailTemplate, MailTemplate, Props, TemplateEditorDialog(), VARIABLES

### Community 36 - "Mail Attachment Routes"
Cohesion: 0.48
Nodes (6): DELETE(), POST(), requireAuth(), RouteContext, removeTemplateAttachment(), setTemplateAttachment()

### Community 37 - "Hyresgästlista Linking"
Cohesion: 0.60
Nodes (5): addToHyresgastlistaAction(), requireUser(), getApartmentById(), markAddedToHyresgastlista(), upsertTenantByLagenhetsnummer()

### Community 38 - "Mongo Nations-ID Backfill Script"
Cohesion: 0.50
Nodes (3): COLLECTIONS, db, DEFAULT_FASTIGHETER

## Knowledge Gaps
- **272 isolated node(s):** `RouteContext`, `RouteContext`, `RouteContext`, `RouteContext`, `RouteContext` (+267 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createSupabaseServerClient()` connect `Apartment Data Access Layer` to `Admin & Nation Settings`, `Apartment Management`, `Shared Todo List`, `Besiktningar (Inspections)`, `Fastigheter & Role Access`, `Rental Object Database`, `Andrahandsgäster & Tenants`, `Arkiv (Signed Contracts)`, `Tenant & Uppsägning Actions`, `Missed Rent Tracking`, `API Route Handlers (auth-scoped)`, `API Route Handlers (CRUD)`, `API Route Handlers (misc)`, `Session Change Log`, `Statistik Page & Queries`, `Project Tech Stack Overview`, `Mongo→Supabase Migration Notes`, `Mail Template Image Handling`, `Floor Plan Download Routes`, `Recipient Group Queries`, `Mail Attachment Routes`, `Hyresgästlista Linking`?**
  _High betweenness centrality (0.201) - this node is a cross-community bridge._
- **Why does `Four-phase Mongo-to-Supabase migration plan` connect `Mongo→Supabase Migration Notes` to `Postgres Schema & Fixed Workflows`, `Apartment Data Access Layer`, `Agent Workflow & Skills Policy`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `auth0` connect `Root Layout & Home Page` to `Admin & Nation Settings`, `Floor Plan Download Routes`, `Shared Todo List`, `Recipient Group Queries`, `Mail Attachment Routes`, `Hyresgästlista Linking`, `Besiktningar (Inspections)`, `Arkiv (Signed Contracts)`, `Rental Object Database`, `Fastigheter & Role Access`, `Andrahandsgäster & Tenants`, `Apartment Management`, `API Route Handlers (auth-scoped)`, `Missed Rent Tracking`, `API Route Handlers (CRUD)`, `API Route Handlers (misc)`, `Statistik Page & Queries`, `Mail Template Image Handling`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `RouteContext`, `RouteContext`, `RouteContext` to the rest of the system?**
  _272 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin & Nation Settings` be split into smaller, more focused modules?**
  _Cohesion score 0.053007135575942915 - nodes in this community are weakly interconnected._
- **Should `Apartment Management` be split into smaller, more focused modules?**
  _Cohesion score 0.05131578947368421 - nodes in this community are weakly interconnected._
- **Should `Shared Todo List` be split into smaller, more focused modules?**
  _Cohesion score 0.06479081821547575 - nodes in this community are weakly interconnected._