---
name: copy-site-to-product
description: Rebuild a reference website as a production-ready, independently branded product, including content mapping, functional interactions, persistent data, an admin console, verification, and deployment. Use when a user asks to copy, clone, reproduce, or productize a live site or an existing prototype; do not use for a simple visual critique or isolated component recreation.
---

# Copy Site to Product

Turn the reference into a maintainable product, not a screenshot-shaped demo. Preserve the user's requested content and behavior while separating the result from the reference site's identity.

## Establish the contract

- Inspect the current repository before choosing frameworks, routes, or data storage. Preserve its package manager, conventions, deployment metadata, and unrelated user changes.
- When the reference is a live URL, inspect the current site and record the pages, navigation, content groups, interactions, responsive behavior, and data-backed features that define the experience.
- Treat "copy" as behavioral and structural parity unless the user explicitly requests pixel-level reproduction. Do not reuse protected branding, logos, proprietary assets, private data, or source code without authorization.
- Resolve the new product name, identity, retained content, removed content, and required management workflows from the conversation. Do not silently restore features the user removed earlier.

## Build from an inventory

Create a compact source-to-target inventory before broad implementation:

- Route or state
- Visible content and hierarchy
- User action and resulting behavior
- Data source and persistence requirement
- Target disposition: retain, rename, redesign, replace, or remove

Store repeated content as structured data instead of duplicating it across components. Use a parser or browser-visible structure when available; avoid fragile text scraping.

## Productize the clone

1. Reproduce the primary workflow and information architecture in the existing stack.
2. Replace the reference identity with a coherent name, logo, palette, typography, and layout. Keep the new brand visible in the first viewport.
3. Convert mock interactions into working flows. Buttons, links, filters, search, anchors, dialogs, forms, and empty/error/loading states must have intentional behavior.
4. When content must be maintained after deployment, add durable storage and a protected admin console. Keep public read paths separate from authenticated mutation paths.
5. Seed the production data from the approved content inventory. Ensure the seed is idempotent and does not overwrite later admin edits.
6. Keep credentials and secrets in deployment environment settings. Never place them in client bundles, tracked files, examples, screenshots, or reusable skill assets.

## Admin baseline

For a content-driven product, the admin console should cover the operations implied by the public surface: authentication, overview, create/edit/delete, publish visibility, ordering or grouping, validation feedback, and sign-out. Add broader roles, audit logs, or workflows only when requested or required by risk.

## Verify parity and readiness

Read [references/acceptance.md](references/acceptance.md) before final verification. Check content parity against the approved inventory and exercise every meaningful clickable region. Test the public and admin paths separately, including persistence across a fresh request or reload.

Run the repository's build and focused tests. For visual work, inspect representative desktop and mobile states when browser testing is requested or required by the active frontend workflow. Fix blocking runtime, overflow, overlap, blank-state, and navigation failures before delivery.

## Deploy and hand off

- Use the repository's existing hosting integration and its applicable deployment skill. Do not replace a working deployment path merely for convenience.
- Confirm the intended audience before changing access. A successful deployment is not proof that public access is enabled.
- After deployment, report the canonical URL, access level, admin entry point, and any credentials created for the user. Keep infrastructure credentials private.
- Update project documentation and durable project memory with the delivered URL, material decisions, and remaining operational work.
