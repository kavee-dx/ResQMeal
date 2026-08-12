
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

// import { registerUser } from "../services/api";
import { Typography, Spacing, Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Role = "DONOR" | "RECIPIENT" | "NGO" | "VOLUNTEER";
type DonorType = "INDIVIDUAL" | "HOTEL" | "RESTAURANT" | "BAKERY" | "SUPERMARKET" | "CATERING" | "EVENT_ORGANIZER" | "OTHER";
type RecipientType = "INDIVIDUAL" | "FAMILY" | "CHARITY" | "COMMUNITY_CENTER" | "SCHOOL" | "DISASTER_RELIEF_ORGANIZATION" | "OTHER";
type NgoType = "NON_PROFIT_ORGANIZATION" | "CHARITY" | "COMMUNITY_ORGANIZATION" | "RELIEF_ORGANIZATION" | "SOCIAL_SERVICE_ORGANIZATION" | "OTHER";
type VehicleType = "WALKING" | "BICYCLE" | "MOTORBIKE" | "THREE_WHEELER" | "CAR" | "VAN" | "OTHER";

const DONOR_TYPES: { label: string; value: DonorType }[] = [
  { label: "Individual", value: "INDIVIDUAL" },
  { label: "Hotel", value: "HOTEL" },
  { label: "Restaurant", value: "RESTAURANT" },
  { label: "Bakery", value: "BAKERY" },
  { label: "Supermarket", value: "SUPERMARKET" },
  { label: "Catering", value: "CATERING" },
  { label: "Event Organizer", value: "EVENT_ORGANIZER" },
  { label: "Other", value: "OTHER" },
];

const RECIPIENT_TYPES: { label: string; value: RecipientType }[] = [
  { label: "Individual", value: "INDIVIDUAL" },
  { label: "Family", value: "FAMILY" },
  { label: "Charity", value: "CHARITY" },
  { label: "Community Center", value: "COMMUNITY_CENTER" },
  { label: "School", value: "SCHOOL" },
  { label: "Disaster Relief Organization", value: "DISASTER_RELIEF_ORGANIZATION" },
  { label: "Other", value: "OTHER" },
];

const NGO_TYPES: { label: string; value: NgoType }[] = [
  { label: "Non-Profit Organization", value: "NON_PROFIT_ORGANIZATION" },
  { label: "Charity", value: "CHARITY" },
  { label: "Community Organization", value: "COMMUNITY_ORGANIZATION" },
  { label: "Relief Organization", value: "RELIEF_ORGANIZATION" },
  { label: "Social Service Organization", value: "SOCIAL_SERVICE_ORGANIZATION" },
  { label: "Other", value: "OTHER" },
];

const VEHICLE_TYPES: { label: string; value: VehicleType }[] = [
  { label: "Walking", value: "WALKING" },
  { label: "Bicycle", value: "BICYCLE" },
  { label: "Motorbike", value: "MOTORBIKE" },
  { label: "Three-Wheeler", value: "THREE_WHEELER" },
  { label: "Car", value: "CAR" },
  { label: "Van", value: "VAN" },
  { label: "Other", value: "OTHER" },
];

const VEHICLE_TYPES_REQUIRING_NUMBER: VehicleType[] = ["MOTORBIKE", "THREE_WHEELER", "CAR", "VAN", "OTHER"];

const FOOD_OPTIONS = [
  "Rice",
  "Vegetables",
  "Fruits",
  "Bread",
  "Milk",
  "Dry Rations",
  "Meal Packets",
  "Drinking Water",
];

type FormState = {
  // common
  role: Role;
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  profilePicture: string;
  address: string;
  district: string;
  city: string;

  // donor
  donorType: DonorType;
  specifiedDonorType: string;
  businessName: string;
  authorizedPerson: string;
  position: string;
  businessRegistrationNumber: string;
  businessContactNumber: string;
  businessEmail: string;
  businessLogo: string;
  website: string;
  description: string;

  // recipient
  recipientType: RecipientType;
  specifiedRecipientType: string;
  organizationName: string;
  organizationRegistrationNumber: string;
  organizationLogo: string;
  peopleNeedingFood: string;
  foodRequirements: string[];
  specialRequirements: string;

  // ngo
  ngoRegistrationNumber: string;
  organizationType: NgoType;
  specifiedOrganizationType: string;

  // volunteer
  vehicleType: VehicleType;
  vehicleNumber: string;
  preferredDeliveryArea: string;
  availability: "AVAILABLE" | "UNAVAILABLE";
  preferredDeliveryTime: string;
};

const INITIAL_STATE: FormState = {
  role: "DONOR",
  fullName: "",
  email: "",
  phoneNumber: "",
  password: "",
  confirmPassword: "",
  profilePicture: "",
  address: "",
  district: "",
  city: "",

  donorType: "INDIVIDUAL",
  specifiedDonorType: "",
  businessName: "",
  authorizedPerson: "",
  position: "",
  businessRegistrationNumber: "",
  businessContactNumber: "",
  businessEmail: "",
  businessLogo: "",
  website: "",
  description: "",

  recipientType: "INDIVIDUAL",
  specifiedRecipientType: "",
  organizationName: "",
  organizationRegistrationNumber: "",
  organizationLogo: "",
  peopleNeedingFood: "",
  foodRequirements: [],
  specialRequirements: "",

  ngoRegistrationNumber: "",
  organizationType: "NON_PROFIT_ORGANIZATION",
  specifiedOrganizationType: "",

  vehicleType: "WALKING",
  vehicleNumber: "",
  preferredDeliveryArea: "",
  availability: "AVAILABLE",
  preferredDeliveryTime: "",
};

type Props = NativeStackScreenProps<any, "Register">;

export default function RegisterScreen({ navigation }: Props) {
  const theme = useTheme();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isBusinessDonor = form.role === "DONOR" && form.donorType !== "INDIVIDUAL";
  const isOrganizationRecipient =
    form.role === "RECIPIENT" && form.recipientType !== "INDIVIDUAL" && form.recipientType !== "FAMILY";
  const needsVehicleNumber = VEHICLE_TYPES_REQUIRING_NUMBER.includes(form.vehicleType);

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string]) setErrors((prev) => ({ ...prev, [field as string]: "" }));
  }

  function toggleFoodRequirement(item: string) {
    setForm((prev) => {
      const has = prev.foodRequirements.includes(item);
      return {
        ...prev,
        foodRequirements: has
          ? prev.foodRequirements.filter((f) => f !== item)
          : [...prev.foodRequirements, item],
      };
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[0-9+\-\s]{7,20}$/;

  function validate(): boolean {
    const next: Record<string, string> = {};
    const req = (v: string, field: string, message: string) => {
      if (!v || v.trim().length < 2) next[field] = message;
    };

    if (!phoneRegex.test(form.phoneNumber)) next.phoneNumber = "Enter a valid phone number.";
    if (form.password.length < 8) next.password = "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword) next.confirmPassword = "Passwords do not match.";
    req(form.address, "address", "Address is required.");
    req(form.district, "district", "District is required.");
    req(form.city, "city", "City is required.");

    if (form.role === "DONOR") {
      if (form.donorType === "INDIVIDUAL") {
        req(form.fullName, "fullName", "Full name is required.");
        if (!emailRegex.test(form.email)) next.email = "Enter a valid email address.";
      } else {
        if (form.donorType === "OTHER") req(form.specifiedDonorType, "specifiedDonorType", "Please specify your donor type.");
        req(form.businessName, "businessName", "Business name is required.");
        req(form.authorizedPerson, "authorizedPerson", "Authorized person is required.");
        req(form.position, "position", "Position is required.");
        req(form.businessRegistrationNumber, "businessRegistrationNumber", "Business registration number is required.");
        if (!phoneRegex.test(form.businessContactNumber)) next.businessContactNumber = "Enter a valid business contact number.";
      }
    }

    if (form.role === "RECIPIENT") {
      if (!isOrganizationRecipient) {
        req(form.fullName, "fullName", "Full name is required.");
        if (!emailRegex.test(form.email)) next.email = "Enter a valid email address.";
      } else {
        if (form.recipientType === "OTHER") req(form.specifiedRecipientType, "specifiedRecipientType", "Please specify your recipient type.");
        req(form.organizationName, "organizationName", "Organization name is required.");
        req(form.organizationRegistrationNumber, "organizationRegistrationNumber", "Organization registration number is required.");
        req(form.authorizedPerson, "authorizedPerson", "Authorized person is required.");
        req(form.position, "position", "Position is required.");
        if (form.email && !emailRegex.test(form.email)) next.email = "Enter a valid email address.";
      }
      const people = Number(form.peopleNeedingFood);
      if (!Number.isInteger(people) || people < 1) next.peopleNeedingFood = "Enter the number of people needing food.";
      if (form.foodRequirements.length === 0) next.foodRequirements = "Select at least one food requirement.";
    }

    if (form.role === "NGO") {
      req(form.organizationName, "organizationName", "Organization name is required.");
      req(form.ngoRegistrationNumber, "ngoRegistrationNumber", "NGO registration number is required.");
      if (form.organizationType === "OTHER") req(form.specifiedOrganizationType, "specifiedOrganizationType", "Please specify your organization type.");
      req(form.authorizedPerson, "authorizedPerson", "Authorized person is required.");
      req(form.position, "position", "Position is required.");
      if (!emailRegex.test(form.email)) next.email = "Enter a valid email address.";
    }

    if (form.role === "VOLUNTEER") {
      req(form.fullName, "fullName", "Full name is required.");
      if (!emailRegex.test(form.email)) next.email = "Enter a valid email address.";
      if (needsVehicleNumber && !form.vehicleNumber.trim()) next.vehicleNumber = "Vehicle number is required for this vehicle type.";
      req(form.preferredDeliveryArea, "preferredDeliveryArea", "Preferred delivery area is required.");
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        role: form.role,
        phoneNumber: form.phoneNumber,
        password: form.password,
        confirmPassword: form.confirmPassword,
        address: form.address,
        district: form.district,
        city: form.city,
        profilePicture: form.profilePicture || undefined,
      };

      if (form.role === "DONOR") {
        payload.donorType = form.donorType;
        if (form.donorType === "INDIVIDUAL") {
          payload.fullName = form.fullName;
          payload.email = form.email;
        } else {
          payload.specifiedDonorType = form.donorType === "OTHER" ? form.specifiedDonorType : undefined;
          payload.businessName = form.businessName;
          payload.authorizedPerson = form.authorizedPerson;
          payload.position = form.position;
          payload.businessRegistrationNumber = form.businessRegistrationNumber;
          payload.businessContactNumber = form.businessContactNumber;
          payload.businessEmail = form.businessEmail || undefined;
          payload.businessLogo = form.businessLogo || undefined;
          payload.website = form.website || undefined;
          payload.description = form.description || undefined;
        }
      }

      if (form.role === "RECIPIENT") {
        payload.recipientType = form.recipientType;
        payload.peopleNeedingFood = Number(form.peopleNeedingFood);
        payload.foodRequirements = form.foodRequirements;
        payload.specialRequirements = form.specialRequirements || undefined;
        if (!isOrganizationRecipient) {
          payload.fullName = form.fullName;
          payload.email = form.email;
        } else {
          payload.specifiedRecipientType = form.recipientType === "OTHER" ? form.specifiedRecipientType : undefined;
          payload.organizationName = form.organizationName;
          payload.organizationRegistrationNumber = form.organizationRegistrationNumber;
          payload.authorizedPerson = form.authorizedPerson;
          payload.position = form.position;
          payload.email = form.email || undefined;
          payload.organizationLogo = form.organizationLogo || undefined;
          payload.website = form.website || undefined;
          payload.description = form.description || undefined;
        }
      }

      if (form.role === "NGO") {
        payload.organizationName = form.organizationName;
        payload.ngoRegistrationNumber = form.ngoRegistrationNumber;
        payload.organizationType = form.organizationType;
        payload.specifiedOrganizationType = form.organizationType === "OTHER" ? form.specifiedOrganizationType : undefined;
        payload.authorizedPerson = form.authorizedPerson;
        payload.position = form.position;
        payload.email = form.email;
        payload.organizationLogo = form.organizationLogo || undefined;
        payload.website = form.website || undefined;
        payload.description = form.description || undefined;
      }

      if (form.role === "VOLUNTEER") {
        payload.fullName = form.fullName;
        payload.email = form.email;
        payload.vehicleType = form.vehicleType;
        payload.vehicleNumber = needsVehicleNumber ? form.vehicleNumber : undefined;
        payload.preferredDeliveryArea = form.preferredDeliveryArea;
        payload.availability = form.availability;
        payload.preferredDeliveryTime = form.preferredDeliveryTime || undefined;
      }

      // const res = await registerUser(payload);
      // if (res.success) {
      //   const email = (payload.email as string) || form.email;
      //   navigation.navigate("VerifyAccount", { email });
      // } else {
      //   Alert.alert("Registration failed", res.message ?? "Please try again.");
      // }
    } catch (err: any) {
      Alert.alert("Registration failed", err?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: Spacing.four, backgroundColor: theme.background, flexGrow: 1 }}
    >
      <Text style={{ ...Typography.h2, marginBottom: Spacing.three }}>Create your account</Text>

      {/* Step 1 — Role */}
      <Text style={{ ...Typography.label, fontSize: 14, marginBottom: Spacing.two }}>Account Type</Text>
      <ChipRow
        options={[
          { label: "Donor", value: "DONOR" },
          { label: "Recipient", value: "RECIPIENT" },
          { label: "NGO", value: "NGO" },
          { label: "Volunteer", value: "VOLUNTEER" },
        ]}
        selected={form.role}
        onSelect={(v) => update("role", v as Role)}
      />

      {form.role === "DONOR" && (
        <DonorFields form={form} update={update} errors={errors} isBusiness={isBusinessDonor} />
      )}
      {form.role === "RECIPIENT" && (
        <RecipientFields
          form={form}
          update={update}
          errors={errors}
          isOrganization={isOrganizationRecipient}
          toggleFoodRequirement={toggleFoodRequirement}
        />
      )}
      {form.role === "NGO" && <NgoFields form={form} update={update} errors={errors} />}
      {form.role === "VOLUNTEER" && (
        <VolunteerFields form={form} update={update} errors={errors} needsVehicleNumber={needsVehicleNumber} />
      )}

      {/* Fields common to every role, shown last */}
      <Field label="Phone Number" value={form.phoneNumber} onChangeText={(v) => update("phoneNumber", v)} error={errors.phoneNumber} keyboardType="phone-pad" />
      <Field label="Password" value={form.password} onChangeText={(v) => update("password", v)} error={errors.password} secureTextEntry />
      <Field label="Confirm Password" value={form.confirmPassword} onChangeText={(v) => update("confirmPassword", v)} error={errors.confirmPassword} secureTextEntry />
      <Field label="Address" value={form.address} onChangeText={(v) => update("address", v)} error={errors.address} />
      <Field label="District" value={form.district} onChangeText={(v) => update("district", v)} error={errors.district} />
      <Field label="City" value={form.city} onChangeText={(v) => update("city", v)} error={errors.city} />

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting}
        style={{
          backgroundColor: theme.primary,
          paddingVertical: Spacing.three + 2,
          borderRadius: Radius.md,
          alignItems: "center",
          marginTop: Spacing.three,
        }}
      >
        {submitting ? (
          <ActivityIndicator color={theme.surface} />
        ) : (
          <Text style={{ ...Typography.button, color: theme.surface }}>Register</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")} style={{ marginTop: Spacing.three, alignItems: "center" }}>
        <Text style={{ ...Typography.bodySmall, color: theme.primary, fontFamily: Typography.label.fontFamily }}>
          Already have an account? Log in
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ---------- Role-specific field groups ----------

function DonorFields({ form, update, errors, isBusiness }: any) {
  const theme = useTheme();
  return (
    <>
      <Text style={{ ...Typography.label, fontSize: 14, marginTop: Spacing.three, marginBottom: Spacing.two }}>Donor Type</Text>
      <ChipRow options={DONOR_TYPES} selected={form.donorType} onSelect={(v) => update("donorType", v)} />

      {!isBusiness ? (
        <>
          <Field label="Full Name" value={form.fullName} onChangeText={(v: string) => update("fullName", v)} error={errors.fullName} />
          <Field label="Email" value={form.email} onChangeText={(v: string) => update("email", v)} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Profile Picture URL (optional)" value={form.profilePicture} onChangeText={(v: string) => update("profilePicture", v)} />
        </>
      ) : (
        <>
          {form.donorType === "OTHER" && (
            <Field label="Specify Donor Type" value={form.specifiedDonorType} onChangeText={(v: string) => update("specifiedDonorType", v)} error={errors.specifiedDonorType} />
          )}
          <Field label="Business Name" value={form.businessName} onChangeText={(v: string) => update("businessName", v)} error={errors.businessName} />
          <Text style={{ ...Typography.bodySmall, color: theme.textSecondary, marginBottom: Spacing.three, fontSize: 12 }}>
            Business Type: {form.donorType === "OTHER" ? form.specifiedDonorType || "—" : form.donorType} (auto-filled)
          </Text>
          <Field label="Authorized Person" value={form.authorizedPerson} onChangeText={(v: string) => update("authorizedPerson", v)} error={errors.authorizedPerson} />
          <Field label="Position" value={form.position} onChangeText={(v: string) => update("position", v)} error={errors.position} />
          <Field label="Business Registration Number" value={form.businessRegistrationNumber} onChangeText={(v: string) => update("businessRegistrationNumber", v)} error={errors.businessRegistrationNumber} />
          <Field label="Business Contact Number" value={form.businessContactNumber} onChangeText={(v: string) => update("businessContactNumber", v)} error={errors.businessContactNumber} keyboardType="phone-pad" />
          <Field label="Business Email (optional)" value={form.businessEmail} onChangeText={(v: string) => update("businessEmail", v)} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Business Logo URL (optional)" value={form.businessLogo} onChangeText={(v: string) => update("businessLogo", v)} />
          <Field label="Website (optional)" value={form.website} onChangeText={(v: string) => update("website", v)} />
          <Field label="Description (optional)" value={form.description} onChangeText={(v: string) => update("description", v)} multiline />
        </>
      )}
    </>
  );
}

function RecipientFields({ form, update, errors, isOrganization, toggleFoodRequirement }: any) {
  const theme = useTheme();
  return (
    <>
      <Text style={{ ...Typography.label, fontSize: 14, marginTop: Spacing.three, marginBottom: Spacing.two }}>Recipient Type</Text>
      <ChipRow options={RECIPIENT_TYPES} selected={form.recipientType} onSelect={(v) => update("recipientType", v)} />

      {!isOrganization ? (
        <>
          <Field label="Full Name" value={form.fullName} onChangeText={(v: string) => update("fullName", v)} error={errors.fullName} />
          <Field label="Email" value={form.email} onChangeText={(v: string) => update("email", v)} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Profile Picture URL (optional)" value={form.profilePicture} onChangeText={(v: string) => update("profilePicture", v)} />
        </>
      ) : (
        <>
          {form.recipientType === "OTHER" && (
            <Field label="Specify Recipient Type" value={form.specifiedRecipientType} onChangeText={(v: string) => update("specifiedRecipientType", v)} error={errors.specifiedRecipientType} />
          )}
          <Field label="Organization Name" value={form.organizationName} onChangeText={(v: string) => update("organizationName", v)} error={errors.organizationName} />
          <Field label="Organization Registration Number" value={form.organizationRegistrationNumber} onChangeText={(v: string) => update("organizationRegistrationNumber", v)} error={errors.organizationRegistrationNumber} />
          <Field label="Authorized Person" value={form.authorizedPerson} onChangeText={(v: string) => update("authorizedPerson", v)} error={errors.authorizedPerson} />
          <Field label="Position" value={form.position} onChangeText={(v: string) => update("position", v)} error={errors.position} />
          <Field label="Email (optional)" value={form.email} onChangeText={(v: string) => update("email", v)} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Organization Logo URL (optional)" value={form.organizationLogo} onChangeText={(v: string) => update("organizationLogo", v)} />
          <Field label="Website (optional)" value={form.website} onChangeText={(v: string) => update("website", v)} />
          <Field label="Description (optional)" value={form.description} onChangeText={(v: string) => update("description", v)} multiline />
        </>
      )}

      <Field
        label="Number of People Needing Food"
        value={form.peopleNeedingFood}
        onChangeText={(v: string) => update("peopleNeedingFood", v.replace(/[^0-9]/g, ""))}
        error={errors.peopleNeedingFood}
        keyboardType="number-pad"
      />

      <Text style={{ ...Typography.label, fontSize: 14, marginBottom: Spacing.two }}>Food Requirements</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: Spacing.one }}>
        {FOOD_OPTIONS.map((item) => {
          const selected = form.foodRequirements.includes(item);
          return (
            <TouchableOpacity
              key={item}
              onPress={() => toggleFoodRequirement(item)}
              style={{
                paddingVertical: Spacing.two,
                paddingHorizontal: Spacing.three,
                borderRadius: Radius.lg - 2,
                borderWidth: 1,
                borderColor: selected ? theme.primary : theme.border,
                backgroundColor: selected ? theme.primary : theme.surface,
                marginRight: Spacing.two,
                marginBottom: Spacing.two,
              }}
            >
              <Text style={{ ...Typography.button, fontSize: 13, color: selected ? theme.surface : theme.text }}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {errors.foodRequirements ? <Text style={{ color: theme.error, marginBottom: Spacing.three, fontSize: 12 }}>{errors.foodRequirements}</Text> : null}


      <Field
        label="Special Requirements (optional)"
        value={form.specialRequirements}
        onChangeText={(v: string) => update("specialRequirements", v)}
        multiline
      />
    </>
  );
}

function NgoFields({ form, update, errors }: any) {
  return (
    <>
      <Field label="Organization Name" value={form.organizationName} onChangeText={(v: string) => update("organizationName", v)} error={errors.organizationName} />
      <Field label="NGO Registration Number" value={form.ngoRegistrationNumber} onChangeText={(v: string) => update("ngoRegistrationNumber", v)} error={errors.ngoRegistrationNumber} />

      <Text style={{ ...Typography.label, fontSize: 14, marginBottom: Spacing.two }}>Organization Type</Text>
      <ChipRow options={NGO_TYPES} selected={form.organizationType} onSelect={(v) => update("organizationType", v)} />
      {form.organizationType === "OTHER" && (
        <Field label="Specify Organization Type" value={form.specifiedOrganizationType} onChangeText={(v: string) => update("specifiedOrganizationType", v)} error={errors.specifiedOrganizationType} />
      )}

      <Field label="Authorized Person" value={form.authorizedPerson} onChangeText={(v: string) => update("authorizedPerson", v)} error={errors.authorizedPerson} />
      <Field label="Position" value={form.position} onChangeText={(v: string) => update("position", v)} error={errors.position} />
      <Field label="Email" value={form.email} onChangeText={(v: string) => update("email", v)} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Organization Logo URL (optional)" value={form.organizationLogo} onChangeText={(v: string) => update("organizationLogo", v)} />
      <Field label="Website (optional)" value={form.website} onChangeText={(v: string) => update("website", v)} />
      <Field label="Description (optional)" value={form.description} onChangeText={(v: string) => update("description", v)} multiline />
    </>
  );
}

function VolunteerFields({ form, update, errors, needsVehicleNumber }: any) {
  return (
    <>
      <Field label="Full Name" value={form.fullName} onChangeText={(v: string) => update("fullName", v)} error={errors.fullName} />
      <Field label="Email" value={form.email} onChangeText={(v: string) => update("email", v)} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Profile Picture URL (optional)" value={form.profilePicture} onChangeText={(v: string) => update("profilePicture", v)} />

      <Text style={{ ...Typography.label, fontSize: 14, marginBottom: Spacing.two }}>Vehicle Type</Text>
      <ChipRow options={VEHICLE_TYPES} selected={form.vehicleType} onSelect={(v) => update("vehicleType", v)} />

      {needsVehicleNumber && (
        <Field label="Vehicle Number" value={form.vehicleNumber} onChangeText={(v: string) => update("vehicleNumber", v)} error={errors.vehicleNumber} />
      )}

      <Field label="Preferred Delivery Area" value={form.preferredDeliveryArea} onChangeText={(v: string) => update("preferredDeliveryArea", v)} error={errors.preferredDeliveryArea} />

      <Text style={{ ...Typography.label, fontSize: 14, marginBottom: Spacing.two }}>Availability</Text>
      <ChipRow
        options={[
          { label: "Available", value: "AVAILABLE" },
          { label: "Unavailable", value: "UNAVAILABLE" },
        ]}
        selected={form.availability}
        onSelect={(v) => update("availability", v)}
      />

      <Field label="Preferred Delivery Time (optional)" value={form.preferredDeliveryTime} onChangeText={(v: string) => update("preferredDeliveryTime", v)} />
    </>
  );
}

// ---------- Shared UI primitives ----------

function ChipRow({
  options,
  selected,
  onSelect,
}: {
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: Spacing.three }}>
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={{
              paddingVertical: Spacing.two,
              paddingHorizontal: Spacing.three - 2,
              borderRadius: Radius.lg,
              borderWidth: 1,
              borderColor: isSelected ? theme.primary : theme.border,
              backgroundColor: isSelected ? theme.primary : theme.surface,
              marginRight: Spacing.two,
              marginBottom: Spacing.two,
            }}
          >
            <Text
              style={{
                ...Typography.button,
                fontSize: 13,
                color: isSelected ? theme.surface : theme.text,
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Field({
  label,
  error,
  editable,
  onFocus,
  onBlur,
  ...inputProps
}: {
  label: string;
  error?: string;
} & React.ComponentProps<typeof TextInput>) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const disabled = editable === false;

  const borderColor = disabled
    ? theme.border
    : error
    ? theme.error
    : focused
    ? theme.primary
    : theme.border;

  return (
    <View style={{ marginBottom: Spacing.three + 2 }}>
      <Text style={{ ...Typography.label, marginBottom: Spacing.one }}>{label}</Text>
      <TextInput
        {...inputProps}
        editable={editable}
        placeholderTextColor={theme.textSecondary}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={{
          ...Typography.body,
          borderWidth: focused && !error ? 1.5 : 1,
          borderColor,
          borderRadius: Radius.sm,
          paddingHorizontal: Spacing.three,
          paddingVertical: Spacing.three - 2,
          backgroundColor: disabled ? theme.background : theme.surface,
          color: disabled ? theme.textSecondary : theme.text,
        }}
      />
      {error ? (
        <Text style={{ ...Typography.bodySmall, color: theme.error, marginTop: Spacing.one, fontSize: 12 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
