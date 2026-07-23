# DealSpine — Monetization & the Consent-Key Model

*How DealSpine earns sustained (recurring) revenue when the customer receives full source. Read `docs/DECISIONS.md` D18–D19 first for the decisions this implements.*

Last updated: 2026-07-23.

---

## The one hard truth to design around

The customer gets the **entire source** (D18). Therefore **no technical lock is unbreakable** — a customer with the code can, in principle, edit out any check. This is not a flaw to engineer away; it is the terrain. It has two consequences:

1. The **legal license agreement is the primary control** — it forbids removing the lock, redistributing, or using past the paid term.
2. **Durable recurring revenue must be anchored in things only the vendor can supply** — a signing key the customer can't forge, and value (updates, data, support) the customer can't self-generate. The technical unlock's real job is to create the **renewal touchpoint**, not to be uncrackable.

Design to that, and the model is strong. Pretend the code lock is DRM, and it's brittle.

---

## The consent key — how the vendor gates the unlock

The mechanism the user asked for ("a key that can only be unlocked with my consent, after paying"):

- **The vendor holds a private signing key.** The delivered source contains only the matching **public key**. The customer can read it but cannot mint a valid license with it.
- **Payment → the vendor mints a signed, time-bound activation key** (license token) carrying: customer id, edition, **entitlements** (features, seats, environment), issue date, **expiry**, and the vendor signature.
- **The app ships locked and unlocks only against a valid key.** On expiry it follows the graceful, data-preserving ladder (warn → read-only grace → block writes, never delete data — `docs/PRODUCTION-READINESS.md` group 11).
- **Renewal = a fresh vendor-signed key = the vendor's consent = the recurring payment.** No new key, no new term.
- **Two consent modes:**
  - *Offline token drop* (default) — the vendor issues a renewed token file each term; works air-gapped. Consent is per-renewal.
  - *Online activation/heartbeat* (optional) — the app periodically fetches a short-lived token from a vendor endpoint; consent is continuous and **remotely revocable**. Off by default so air-gapped customers work.

Because the customer cannot forge the vendor signature, a **legitimate** deployment must come back to the vendor every term. That is the sustained-revenue hinge — enforced in good faith technically, guaranteed by the legal agreement.

---

## The revenue lines — ranked by how durable they are under source delivery

Combine several; the durable ones (bottom) are what keep customers paying even though the code lock is bypassable.

| Line | What it is | Durability under source delivery | Notes |
|---|---|---|---|
| **Term license (the key)** | Annual/multi-year subscription; renewal issues a new signed activation key. | **Medium** — the renewal touchpoint, but the lock is bypassable; leans on the legal agreement. | The baseline recurring line. |
| **Maintenance & support** | Updates, security patches, new LLM provider adapters, and the framework's **quarterly model rate-card refresh**; SLA support. | **High** — models and rates change constantly; the customer wants the stream, and it's painful to self-maintain. | The framework itself says "reprice quarterly" — build the subscription around that cadence. |
| **Benchmark / knowledge-base subscription** | Vendor-curated cross-engagement calibration, playbooks, and the MCP knowledge base (D7), delivered as ongoing updates. | **Highest** — the customer *cannot self-generate* cross-customer intelligence; pure vendor-only value, strongest lock-in. | Repositions the D7 end-state as a *recurring product*, not just a feature. |
| **Metered / entitlement add-ons** | Insights via a vendor-operated LLM gateway (metered); optional modules (subscription-pricing, etc.); seat tiers — all as license entitlements. | **Medium–High** — genuine if the vendor gateway/module adds value the customer won't rebuild. | Entitlements live in the signed key, so add-ons are sold by re-issuing the key. |
| **Professional services** | Integration, calibration onboarding, training. | **Medium** — recurring per engagement, not per term. | Natural attach at sale and expansion. |

**Recommendation:** price a **term license** (the key + renewal), bundle a **maintenance & support subscription** (the quarterly refresh cadence makes it near-mandatory), and sell the **knowledge-base/benchmark subscription** as the premium, highest-retention line. Treat the code lock as the billing trigger; treat the vendor-only value as the reason to renew.

---

## What must be built to operate this (maps to the readiness plan)

- The **signed activation key** + boot/periodic enforcement + graceful expiry ladder + tamper-evidence — `docs/PRODUCTION-READINESS.md` group 11.
- **Entitlements in the key** (features, seats, modules) enforced in-app — group 11.
- **Vendor key-ops tooling** — mint / renew / revoke, private key held by the vendor; renewal is a single signed-file swap — group 11.
- **License injection into the packaging utility** so each customer's source distribution ships with its initial key — group 10.
- **Optional online activation service** for continuous consent, metering, and remote revocation — group 11 (P2).
- The **knowledge base as a delivered subscription** (curated Markdown corpus + updates) — `docs/ROADMAP.md` Phase 3 / D7, now with a recurring-revenue framing.

## What NOT to do

- **Don't rely on obfuscation or a bare config flag.** Both are trivially defeated with source and add false confidence.
- **Don't make expiry destroy or lock away customer data.** It poisons renewals and invites contract disputes; degrade to read-only/exportable instead (group 11).
- **Don't gate the *engine module* on the license.** It must stay clean and importable for customer integration (D18); gate the *product/app*, not the embeddable engine.
- **Don't assume online activation.** Many enterprise/air-gapped customers forbid phone-home; offline token drops must remain the default.
