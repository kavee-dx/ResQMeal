// frontend/src/navigation/types.ts

export type Role = "DONOR" | "RECIPIENT" | "NGO" | "VOLUNTEER";

export type HomeParams = {
  fullName: string;
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;

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

  VerifyAccount: {
    email: string;
    fullName?: string;
  };

  RegistrationPending: { fullName?: string } | undefined;

  DonorHome: HomeParams;
  RecipientHome: HomeParams;
  NgoHome: HomeParams;
  VolunteerHome: HomeParams;

  DeleteAccount: undefined;
  NotificationSettings: undefined;
  PrivacySettings: undefined;

  // volunteer availability screen
  VolunteerAvailability: undefined;

  // NEW — volunteer assignment status screen
  AssignmentStatus: undefined;

  AdminLogin: undefined;
  AdminDashboard: undefined;

  CreateDonation: undefined;
  MyDonations: undefined;
  DonationDetail: { donationId: string };

  FoodRescueRequests: undefined;
  NGOCommunities: undefined;

  // Recipient management
  AvailableFood: undefined;
  FoodRequest: { urgency?: "URGENT" | "NORMAL" } | undefined;
  RequestStatus: undefined;
  RequestProgress: { requestId: string };
  RequestBoard: undefined;
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
  DONOR: [{ key: "home", label: "Home", screen: "DonorHome" }],

  RECIPIENT: [{ key: "home", label: "Home", screen: "RecipientHome" }],

  NGO: [{ key: "home", label: "Home", screen: "NgoHome" }],

  VOLUNTEER: [
    { key: "home", label: "Home", screen: "VolunteerHome" },
    { key: "availability", label: "Availability", screen: "VolunteerAvailability" },
    { key: "assignment", label: "My Assignment", screen: "AssignmentStatus" },
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
export function getInitialRouteForRole(role: Role): keyof RootStackParamList {
  return getHomeRouteForRole(role);
}

export function canAccessScreen(
  role: Role,
  screen: keyof RootStackParamList,
): boolean {
  return getMenuForRole(role).some((item) => item.screen === screen);
}