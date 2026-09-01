// No account currently has admin access. Previously hardcoded to a single
// owner's email, independently, in four separate files (admin/page.tsx,
// admin/jobs/[id]/page.tsx, api/admin/jobs/[jobId]/regenerate,
// api/admin/jobs/[jobId]/finalize) — one got updated when admin access was
// removed and the other three were missed. Centralized here so that can't
// happen again; re-enable admin access (for a real admin flow, on a different
// account) by setting this to that account's email.
//
// Unrelated to ADMIN_EMAIL in api/feedback/route.ts, which is a notification
// destination, not an access gate — leave that one alone.
export const ADMIN_EMAIL = "";
