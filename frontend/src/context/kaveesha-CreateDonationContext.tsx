// frontend/src/context/kaveesha-CreateDonationContext.tsx
// Shared state for the 5-step donation creation flow.
// Owner: Kaveesha

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type DonationTypeOption = 'NORMAL' | 'URGENT';

export type YesNo = 'YES' | 'NO';
export type YesNoUnsure = 'YES' | 'NO' | 'NOT_SURE';

export type AiScreeningResult =
  | 'PENDING'
  | 'GOOD'
  | 'REVIEW'
  | 'CONCERN';

export type QuantityUnit =
  | 'kg'
  | 'g'
  | 'L'
  | 'mL'
  | 'items'
  | 'boxes'
  | 'trays'
  | 'packs'
  | 'other';

export type StorageCondition =
  | 'Refrigerated'
  | 'Frozen'
  | 'Room Temperature'
  | 'Other';

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
  quantityUnit: QuantityUnit;

  portions: string;

  preparationTime: string;
  expiryTime: string;

  storageCondition: StorageCondition;

  pickupLocation: string;
  pickupDistrict: string;

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
  quantityUnit: 'kg',

  portions: '',

  preparationTime: '',
  expiryTime: '',

  storageCondition: 'Room Temperature',

  pickupLocation: '',
  pickupDistrict: '',

  additionalDetails: '',

  photoUri: null,
  photoBase64: null,
  photoMimeType: null,

  aiResult: 'PENDING',
  aiReason: '',

  safety: {
    storage: null,
    temperature: null,
    handling: null,
    packaging: null,
    allergens: null,
  },
};

interface CreateDonationContextValue {
  state: CreateDonationState;

  update: <K extends keyof CreateDonationState>(
    key: K,
    value: CreateDonationState[K],
  ) => void;

  updateSafety: <K extends keyof SafetyAnswers>(
    key: K,
    value: SafetyAnswers[K],
  ) => void;

  reset: () => void;
}

const CreateDonationContext =
  createContext<CreateDonationContextValue | undefined>(undefined);

export function CreateDonationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] =
    useState<CreateDonationState>(INITIAL_STATE);

  const update = <K extends keyof CreateDonationState>(
    key: K,
    value: CreateDonationState[K],
  ) => {
    setState((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateSafety = <K extends keyof SafetyAnswers>(
    key: K,
    value: SafetyAnswers[K],
  ) => {
    setState((previous) => ({
      ...previous,
      safety: {
        ...previous.safety,
        [key]: value,
      },
    }));
  };

  const reset = () => {
    setState({
      ...INITIAL_STATE,
      safety: {
        ...INITIAL_STATE.safety,
      },
    });
  };

  const value = useMemo(
    () => ({
      state,
      update,
      updateSafety,
      reset,
    }),
    [state],
  );

  return (
    <CreateDonationContext.Provider value={value}>
      {children}
    </CreateDonationContext.Provider>
  );
}

export function useCreateDonation() {
  const context = useContext(CreateDonationContext);

  if (!context) {
    throw new Error(
      'useCreateDonation must be used inside CreateDonationProvider',
    );
  }

  return context;
}