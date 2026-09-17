// frontend/src/context/kaveesha-CreateDonationContext.tsx
// Shared form state for the 5-step Create Donation wizard.
// Wrapped around the wizard's nested navigator in
// kaveesha-CreateDonationNavigator.tsx, so it resets automatically every
// time the donor starts a new donation.
// Owner: Kaveesha

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type DonationTypeOption = 'NORMAL' | 'URGENT';
export type YesNo = 'YES' | 'NO';
export type YesNoUnsure = 'YES' | 'NO' | 'NOT_SURE';
export type AiScreeningResult = 'PENDING' | 'GOOD' | 'REVIEW' | 'CONCERN';

export interface SafetyAnswers {
  storage: YesNo | null;
  temperature: YesNoUnsure | null;
  handling: YesNo | null;
  packaging: YesNo | null;
  allergens: YesNoUnsure | null;
}

export interface CreateDonationState {
  donationType: DonationTypeOption;
  foodType: string;
  category: string;
  quantity: string;
  portions: string;
  preparationTime: string;
  expiryTime: string;
  storageCondition: string;
  pickupLocation: string;
  additionalDetails: string;
  photoUri: string | null;
  photoBase64: string | null;
  photoMimeType: string | null;
  aiResult: AiScreeningResult;
  aiReason: string;
  safety: SafetyAnswers;
}

const INITIAL_STATE: CreateDonationState = {
  donationType: 'NORMAL',
  foodType: '',
  category: '',
  quantity: '',
  portions: '',
  preparationTime: '',
  expiryTime: '',
  storageCondition: '',
  pickupLocation: '',
  additionalDetails: '',
  photoUri: null,
  photoBase64: null,
  photoMimeType: null,
  aiResult: 'PENDING',
  aiReason: '',
  safety: { storage: null, temperature: null, handling: null, packaging: null, allergens: null },
};

interface Ctx {
  state: CreateDonationState;
  update: <K extends keyof CreateDonationState>(key: K, value: CreateDonationState[K]) => void;
  updateSafety: <K extends keyof SafetyAnswers>(key: K, value: SafetyAnswers[K]) => void;
  reset: () => void;
}

const CreateDonationContext = createContext<Ctx | undefined>(undefined);

export function CreateDonationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CreateDonationState>(INITIAL_STATE);

  const update: Ctx['update'] = (key, value) => setState((s) => ({ ...s, [key]: value }));

  const updateSafety: Ctx['updateSafety'] = (key, value) =>
    setState((s) => ({ ...s, safety: { ...s.safety, [key]: value } }));

  const reset = () => setState(INITIAL_STATE);

  return (
    <CreateDonationContext.Provider value={{ state, update, updateSafety, reset }}>
      {children}
    </CreateDonationContext.Provider>
  );
}

export function useCreateDonation() {
  const ctx = useContext(CreateDonationContext);
  if (!ctx) {
    throw new Error('useCreateDonation must be used within a CreateDonationProvider');
  }
  return ctx;
}