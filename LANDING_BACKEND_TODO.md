# Landing Redesign Backend TODO

## 1. Categories and taxonomy
- [ ] Add `categories.slug` (unique, indexed) so UI can link by slug instead of display name.
- [ ] Add `categories.icon_key` (e.g. `design`, `labor`, `gardening`) for deterministic icon rendering.
- [ ] Add `categories.active_gig_count` materialized value or a query/view that returns live counts for "1.2k+ active gigs" style badges.
- [ ] Add `categories.display_order` for both desktop grid and mobile horizontal ordering.
- [ ] Add `categories.is_featured` to control which categories appear on landing without code edits.

## 2. Professional cards (new section)
- [ ] Add a `professional_profiles` table (or extend worker profile table) with:
  - `headline` (e.g. Senior UX Designer)
  - `avatar_url`
  - `cover_image_url`
  - `distance_label` or geospatial source (`lat`, `lng`)
  - `is_verified`
  - `rating_avg`, `rating_count`
- [ ] Add a `professional_skills` join table for 0..n skill chips per profile.
- [ ] Add `professional_metrics` fields for the three progress bars:
  - `jobs_completed_score` (0..100)
  - `responsiveness_score` (0..100)
  - `communication_score` (0..100)
- [ ] Add `is_featured_on_landing` + `featured_rank` so admins control who appears first.

## 3. Featured jobs cards
- [ ] Add job-level `featured_rank` and `is_featured_on_landing` flags for deterministic card ordering.
- [ ] Add/normalize `job_type_label` (Cleaning, Assembly, Delivery) for colored tag rendering.
- [ ] Ensure `budget_min`, `budget_max`, `budget_type`, and `currency_code` support formatted output (`$50-$80`, `$40/hr`).
- [ ] Add lightweight denormalized `location_short` for compact cards (`Downtown, SF`).

## 4. Search and discovery
- [ ] Update jobs search endpoint to accept both `keywords` and `location` from hero search.
- [ ] Add combined full-text index for title/description/category keywords to keep hero search fast.
- [ ] Add optional `nearby=true` filtering contract for mobile "Nearby" toggle.

## 5. Footer and static link management
- [ ] Create a small `site_links` table (or CMS config) for footer columns:
  - `group_key` (`company`, `resources`, `support`)
  - `label`
  - `href`
  - `display_order`
  - `is_active`

## 6. Notifications and mobile nav badges
- [ ] Expose unread notifications count endpoint for header bell badge.
- [ ] Expose unread messages count endpoint for mobile bottom-nav badge.

## 7. API response shape for landing page
- [ ] Add a dedicated `GET /landing` endpoint returning:
  - `hero` settings
  - featured categories
  - featured professionals + metrics + skills
  - featured jobs
  - footer link groups
- [ ] Cache this endpoint (edge/cache layer) because content changes infrequently.

## 8. Data quality and constraints
- [ ] Add check constraints for metric percentages (`0 <= value <= 100`).
- [ ] Add non-null constraints for fields required by cards (name, title, rating, primary image).
- [ ] Add indexes on `is_featured_on_landing`, `featured_rank`, and `slug`.

## 9. Admin tooling
- [ ] Add admin CRUD screens for:
  - featured category ordering
  - featured professional selection and metrics
  - featured job selection
  - footer links
- [ ] Add publish/unpublish workflow for landing content sets.
