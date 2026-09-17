import { DeliveryPreferencesPayload } from "../types/dilshara-deliveryPreferences.types";
// import api from "./api"; // uncomment once merged

export async function getDeliveryPreferences(): Promise<DeliveryPreferencesPayload> {
  // TODO: uncomment once user-management is merged and the real
  // endpoint exists.
  // const response = await api.get("/volunteer-profile/preferences");
  // return response.data;
  throw new Error("getDeliveryPreferences: API not available until merge");
}

export async function updateDeliveryPreferences(
  payload: DeliveryPreferencesPayload
): Promise<DeliveryPreferencesPayload> {
  // TODO: uncomment once user-management is merged.
  // const response = await api.patch("/volunteer-profile/preferences", payload);
  // return response.data;
  throw new Error("updateDeliveryPreferences: API not available until merge");
}