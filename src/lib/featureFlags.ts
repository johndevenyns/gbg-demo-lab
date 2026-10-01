/**
 * Simple build-time feature flags.
 *
 * INDUSTRIES_ENABLED hides the Industries concept from the admin UI
 * (settings tab, demo creation step, "Save as Industry", industry form
 * templates) without removing any data or code paths. Flip to `true` to
 * bring the functionality back.
 */
export const INDUSTRIES_ENABLED = false;

/** Automatic screenshot fetching of customer sites (unreliable) — admins upload their own instead. */
export const AUTO_SCREENSHOT_FETCH_ENABLED = false;
