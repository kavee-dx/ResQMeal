// frontend/src/navigation/types.ts

export type Role =
  | "DONOR"
  | "RECIPIENT"
  | "NGO"
  | "VOLUNTEER";

export type HomeParams = {
  fullName: string;
};

export type RootStackParamList = {
  Splash: undefined;

  Login: undefined;

  ForgotPassword: undefined;

  VerifyResetOtp: {
    email: string;
  };

  ResetPassword: {
    email: string;
    resetToken: string;
  };

  Register: undefined;
  Home: undefined;
  Profile: undefined;
};

  VerifyAccount: {
    email: string;
  };

  DonorHome: HomeParams;
  RecipientHome: HomeParams;
  NgoHome: HomeParams;
  VolunteerHome: HomeParams;
};

export type HomeRouteName =
  | "DonorHome"
  | "RecipientHome"
  | "NgoHome"
  | "VolunteerHome";

export type MenuItem = {
  key: string;
  label: string;
  screen: keyof RootStackParamList;
};

// Sprint 1 only ships auth + profile foundation.
const ROLE_MENUS: Record<Role, MenuItem[]> = {
  DONOR: [
    { key: "home", label: "Home", screen: "DonorHome" },
  ],

  RECIPIENT: [
    { key: "home", label: "Home", screen: "RecipientHome" },
  ],

  NGO: [
    { key: "home", label: "Home", screen: "NgoHome" },
  ],

  VOLUNTEER: [
    { key: "home", label: "Home", screen: "VolunteerHome" },
  ],
};

export function getMenuForRole(role: Role): MenuItem[] {
  return ROLE_MENUS[role] ?? [];
}

/** Maps a role to its dedicated home screen route name. */
export function getHomeRouteForRole(role: Role): HomeRouteName {
  switch (role) {
    case "DONOR":
      return "DonorHome";
    case "RECIPIENT":
      return "RecipientHome";
    case "NGO":
      return "NgoHome";
    case "VOLUNTEER":
      return "VolunteerHome";
  }
}

// Kept for backward compatibility with any existing callers.
export function getInitialRouteForRole(
  role: Role,
): keyof RootStackParamList {
  return getHomeRouteForRole(role);
}

export function canAccessScreen(
  role: Role,
  screen: keyof RootStackParamList,
): boolean {
  return getMenuForRole(role).some(
    (item) => item.screen === screen,
  );
}
