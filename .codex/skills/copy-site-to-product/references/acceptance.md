# Acceptance Checklist

Use this checklist after implementation, not as a substitute for understanding the reference.

## Content parity

- Every retained source section has a target location.
- Titles, descriptions, labels, grouping, ordering, and item counts match the approved inventory.
- Removed or renamed concepts do not reappear in navigation, metadata, empty states, admin labels, or seeded data.
- The new product name, logo, favicon, page title, description, and social metadata are internally consistent.

## Interaction matrix

Exercise each distinct interaction type at least once and every unique destination:

| Area | Verify |
| --- | --- |
| Global navigation | Destination, active state, keyboard access, mobile behavior |
| Search and filters | Input, clearing, no results, combined filters, URL/state behavior |
| Cards and rows | Primary click target, nested actions, focus treatment |
| Anchors and tabs | Correct state, direct-link behavior, back/forward behavior when applicable |
| Forms | Required fields, invalid input, success, failure, duplicate submission |
| Admin mutations | Create, edit, visibility/publish, ordering/grouping, delete confirmation |
| Authentication | Invalid login, valid login, session persistence, logout, protected-route denial |

Do not count pointer cursor styling as working behavior. Confirm the resulting state or destination.

## Production readiness

- Public data comes from durable storage or an intentional static source.
- Initial seeding is repeatable and does not overwrite post-launch edits.
- Public endpoints expose no secrets or administrative mutation capability.
- Admin mutations require server-side authorization.
- Error responses are intentional and do not reveal stack traces or credentials.
- A fresh build succeeds and focused API/worker tests pass.
- Deployment uses the exact validated source state.
- The deployed access policy matches the user's intended audience.
- The public URL and admin route are recorded in project documentation or durable memory.
