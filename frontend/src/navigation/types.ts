// frontend/src/navigation/types.ts

export type Role =
  | "DONOR"
  | "RECIPIENT"
  | "NGO"
  | "VOLUNTEER";

export type RootStackParamList = {
  Splash: undefined;

  Login: undefined;

  ForgotPassword: undefined;

  Register: undefined;

  VerifyAccount: {
    email: string;
  };

  Home: {
    role: Role;
  };
};

export type MenuItem = {
  key: string;
  label: string;
  screen: keyof RootStackParamList;
};

// Sprint 1 only ships auth + profile foundation.
const ROLE_MENUS: Record<Role, MenuItem[]> = {
  DONOR: [
    {
      key: "home",
      label: "Home",
      screen: "Home",
    },
  ],

  RECIPIENT: [
    {
      key: "home",
      label: "Home",
      screen: "Home",
    },
  ],

  NGO: [
    {
      key: "home",
      label: "Home",
      screen: "Home",
    },
  ],

  VOLUNTEER: [
    {
      key: "home",
      label: "Home",
      screen: "Home",
    },
  ],
};

export function getMenuForRole(role: Role): MenuItem[] {
  return ROLE_MENUS[role] ?? [];
}

export function getInitialRouteForRole(_role: Role): keyof RootStackParamList {
  return "Home";
}

export function canAccessScreen(
  role: Role,
  screen: keyof RootStackParamList,
): boolean {
  return getMenuForRole(role).some(
    (item) => item.screen === screen,
  );
}