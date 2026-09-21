# LotSpace Expanded Master Blueprint

> **Spec:** `docs/superpowers/specs/2026-09-20-lotspace-expanded-master-blueprint-design.md`

## 0. Executive Summary

LotSpace is a **social ledger** rather than a conventional social network. It is the public, human-facing identity and trust layer on top of the verified **Auctum Ledger** (the transactional and provenance backbone). Every visible social primitive is dual-purpose: a profile is also a trading instrument, a story is also provenance, a follow is also a relationship signal, a cupping result is also reputation telemetry, a QR scan is also a demand bridge, a tip is also a trust event, and a collector is also a field agent.

### Core Thesis

Every farm gets a Space. Every lot gets a ledger. Every relationship becomes durable. Every consumer interaction can point back to a person, a place, a process, and a verified economic record.

### Source Alignment

This document preserves the source blueprint's terminology, architecture, business doctrine, and launch sequence while adding an implementation-grade expansion layer. Proposed additions are framed as design recommendations rather than source facts. Where the source blueprint makes factual claims about markets, regulations, adoption, competitors, or benchmarks, those claims remain source-attributed and should be independently re-verified before external publication.

---

## 1. Design Constitution

| Rule | Implication |
|------|-------------|
| **One Ledger** | No social object can contradict the verified Auctum Ledger record. |
| **Four Doors** | SMS/USSD/IVR, offline PWA/super-app, full social web/mobile, and human agents resolve to the same underlying identity and ledger. |
| **Transaction-first** | Social features should create, accelerate, document, or retain commercial relationships. |
| **Farmer sovereignty** | The farmer is the author and owner of the identity/reputation layer, not merely an object inside a QR trace. |
| **System-constrained personalization** | Spaces feel personal without becoming visually chaotic, unsafe, slow, or unmaintainable. |
| **Revenue before scale** | SaaS, trade services, verification, collector economics, and tipping rails exist from the first serious release; advertising is excluded. |
| **Trust is a product feature** | Verification, auditability, ledger-linked price claims, payment integrity, and human verification are first-class UX. |
| **Origin dignity** | Language, imagery, pricing, and storytelling must show people doing real work with real names and documented economics. |

---

## 2. Product System Architecture

The source blueprint describes LotSpace as “MySpace for coffee,” but cautions against copying MySpace literally. The reusable insight is the personalized identity layer; the failure modes — ad clutter, chaotic customization, and experience decay — are rejected. LotSpace therefore treats identity as a structured interface over a verified ledger.

- A **farmer Space** = identity + shopfront + compliance file + income ledger
- A **roaster Space** = menu + sourcing record + consumer proof
- A **consumer Space** = taste identity + followed farms + participation history

### Bounded Contexts

The four new bounded contexts are:

1. **Spaces**
2. **Feeds**
3. **Reputation**
4. **Connections**

The existing Auctum Ledger contexts — **Catalog, CRM, Campaign, Samples, Orders, and Billing** — remain authoritative and are reused. The expanded architecture keeps those boundaries visible in code and in the user experience so the social layer never becomes an ungoverned content silo.

---

## 3. Actor Universe and Jobs-to-Be-Done

The platform does not collapse archetypes into one generalized account type. Each archetype requires a distinct Space grammar, onboarding flow, permissions model, and economic reason to return.

| Archetype | Primary Job | Proof Needed | High-Value Action |
|-----------|-------------|--------------|-------------------|
| Smallholder farmer | Receive clearer economic visibility, recognition, market access, and an owned identity. | Farm data, verified location, receipts, harvest/process evidence, reputation. | List lots, receive tips, verify provenance. |
| Collector/middleman | Source efficiently, control quality, and access markets. | Purchase history, quality grades, logistics records. | Broker deals, collect samples, build reputation. |
| Cooperative/producer organization | Bargain collectively, share resources, and secure fair pricing. | Membership records, aggregate production data, certifications. | Manage group lots, negotiate contracts. |
| Exporter/importer | Trade efficiently, comply with regulation, and expand market reach. | Licenses, phytosanitary certs, customs records, insurance. | Manage shipments, verify origins, build trust. |
| Roaster/café | Source quality, differentiate menus, and prove consumer value. | Cupping scores, origin stories, roast profiles, certifications. | Source lots, display provenance, engage consumers. |
| End consumer | Discover taste, consume ethically, and join community. | Taste preferences, followed farms, purchase history, reviews. | Follow farms, tip producers, share reviews. |

---

## 4. Expert Council Operating Model

Each discipline acts as a product “agent” with explicit ownership, handoffs, and acceptance criteria.

| Discipline | Primary Mandate | LotSpace Leverage |
|------------|-----------------|-------------------|
| Software Engineer & Developer | Domain models, APIs, persistence, event integrity, observability, CI/CD, scalable product implementation. | Make every business rule explicit and every critical action auditable. |
| Graphic Artist & Brand Strategist | Identity, symbolism, typography, iconography, brand system, application rules. | Turn the ledger into a recognizable cultural object without losing rigor. |
| Marketing & Business Development Strategist | Positioning, GTM, partnerships, funnel economics, unit economics, growth loops. | Create a distribution system where supply density and demand reinforce one another. |
| Video Strategist & Marketing Practitioner | Narrative formats, motion psychology, production systems, channel-specific assets. | Make origin stories discoverable, repeatable, and conversion-aware. |
| Web Developer & Graphic Artist | Responsive UI, component systems, illustration, animation, performance, accessibility. | Deliver the premium social surface without breaking low-end access. |
| Video Game Creator | Core loops, progression, seasonal events, social mechanics, telemetry, live-ops thinking. | Translate coffee discovery into participation systems without turning trust into a gimmick. |
| Solutions Architect / Product Design | Product-business-technical-market alignment, C4/API/data maps, rollout governance, FinOps/security. | Keep the entire ecosystem coherent as scale, geography, and partners expand. |

### Operating Cadence

1. **Weekly product council:** activation, trust incidents, trade conversion, farmer participation, performance budget, content output.
2. **Biweekly design/engineering review:** component changes, API contracts, accessibility, analytics instrumentation, latency regressions.
3. **Monthly growth review:** CAC by channel, referral quality, agent economics, supply density, buyer conversion, content performance.
4. **Quarterly architecture review:** bounded-context integrity, data retention, privacy, disaster recovery, costs, regionalization readiness.
5. **Live-ops season review:** event performance, cohort behavior, economy health, community norms, moderation load, product debt.

---

## 5. Technical Architecture

### Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend:** Express + TypeScript
- **Data:** PostgreSQL + TimescaleDB, Redis
- **Messaging:** Kafka
- **Auth:** OIDC
- **Deployment:** Docker, GitHub Actions CI/CD
- **i18n:** en-US, zh-CN, es-MX, pt-BR (plus de-DE, fr-FR, vi-VN existing)

### Context-to-Service Mapping

| Context | Service | Schema | Events | Routes |
|---------|---------|--------|--------|--------|
| Spaces | `app/services/spaces/` | `spaces.*` | `space.*` | `/api/spaces/...` |
| Feeds | `app/services/feeds/` | `feeds.*` | `feed.*` | `/api/feeds/...` |
| Reputation | `app/services/reputation/` | `reputation.*` | `reputation.*` | `/api/reputation/...` |
| Connections | `app/services/connections/` | `connections.*` | `connection.*` | `/api/connections/...` |
| Integration | `app/services/integration/` | n/a | `ledger.*` | n/a |

### Data Integrity Rules

1. Every social object references a canonical Auctum Ledger record by immutable ID.
2. All writes to reputation or identity state flow through a single audit path.
3. Kafka events use a stable schema and are emitted with a version field.
4. Every major interface has accessibility and low-bandwidth fallbacks.
5. Every event required for KPI reporting is emitted with a stable schema.
6. Every major media asset maps back to a Space, farm, lot, campaign, or event.
7. Every agent action can be audited, and commission states are visible.
8. Every release can be feature-flagged, rolled back, and observed.
9. Every roadmap feature names its intended business event — not merely its engagement metric.

---

## 6. Non-Functional Requirements

- **Accessibility:** WCAG 2.2 AA baseline
- **Performance:** < 2s LCP, < 100ms CLS budget
- **Security:** OIDC auth, RBAC, audit trails, SLSA supply-chain provenance
- **Testing:** Vitest (frontend), pytest (backend scripts), Supertest (integration)
- **Observability:** logs, metrics, traces, error budgets
- **Deployment:** feature flags, rollback safety, blue-green primitives

---

## 7. Acceptance Criteria

1. All four new bounded contexts exist as independent service modules with their own schemas, routes, and Kafka event streams.
2. The Auctum Ledger remains the single source of truth; no social object contradicts a verified ledger record.
3. All six actor archetypes have distinct Space grammar, onboarding flows, permissions models, and economic reasons to return.
4. The Four Doors resolve to the same underlying identity and ledger.
5. Every critical action is auditable.
6. The system ships with i18n coverage for en-US, zh-CN, es-MX, and pt-BR.
7. The system meets WCAG 2.2 AA and performance budgets.
8. The expert council operating cadence is documented and executable.

---

## 8. Source Alignment Note

This document is an expansion of the supplied materials, not a replacement for them. Where the source blueprint makes factual claims about markets, regulations, adoption, competitors, or benchmarks, those claims remain source-attributed and should be independently re-verified before external publication. The added system designs, workflows, interfaces, events, and roadmap details are proposed implementation architecture derived from the source doctrine and expert-role descriptions.
