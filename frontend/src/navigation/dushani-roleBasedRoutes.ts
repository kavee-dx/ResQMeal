
export type Role = "DONOR" | "RECIPIENT" | "NGO" | "VOLUNTEER";

export type MenuItem = {
  key: string;
  label: string;
  screen: string; // screen name registered in AppNavigator
};

// Sprint 1 only ships auth + profile foundation, so menus point at screens
// that exist today (Home/Profile). Role-specific dashboards land in Sprint 2.
const ROLE_MENUS: Record<Role, MenuItem[]> = {
  DONOR: [
    { key: "home", label: "Home", screen: "Home" },
    { key: "profile", label: "Profile", screen: "Profile" },
  ],
  RECIPIENT: [
    { key: "home", label: "Home", screen: "Home" },
    { key: "profile", label: "Profile", screen: "Profile" },
  ],
  NGO: [
    { key: "home", label: "Home", screen: "Home" },
    { key: "profile", label: "Profile", screen: "Profile" },
  ],
  VOLUNTEER: [
    { key: "home", label: "Home", screen: "Home" },
    { key: "profile", label: "Profile", screen: "Profile" },
  ],
};

/** Menu items to render for a given user's role. */
export function getMenuForRole(role: Role): MenuItem[] {
  return ROLE_MENUS[role] ?? [];
}

/** Screen name to land on right after login/verification, based on role. */
export function getInitialRouteForRole(_role: Role): string {
  return "Home";
}

/** Guard used by ProtectedRoute-style wrappers to gate a screen to certain roles. */
export function canAccessScreen(role: Role, screen: string): boolean {
  return getMenuForRole(role).some((item) => item.screen === screen);
}
