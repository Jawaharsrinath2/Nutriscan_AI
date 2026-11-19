/** Every URL the app knows, in one place. Keep these in sync with the SPA fallback in backend/app/main.py (any
 *  non-/api, non-file path serves index.html, so new pages need no backend change). */
export const PATHS = {
  landing: "/",
  login: "/login",
  signup: "/signup",
  onboarding: "/onboarding",
  profileEdit: (step) => `/profile/edit/${step}`,
  scan: "/scan",
  dashboard: "/dashboard",
  dietPlan: "/dietplan",
  profile: "/profile",
  admin: "/admin",
};

/** Where a signed-in person lands after login, signup or onboarding. */
export const HOME = PATHS.scan;
