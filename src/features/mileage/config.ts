// Mileage tracking configuration and types

export const IRS_RATES_CENTS = { business: 67, medical: 21, charity: 14, personal: 0 } as const;
export type TripType = keyof typeof IRS_RATES_CENTS;

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  business: 'Business',
  medical: 'Medical',
  charity: 'Charity',
  personal: 'Personal'
};

export const TRIP_TYPE_COLORS: Record<TripType, string> = {
  business: '#3b82f6', // Blue
  medical: '#10b981',  // Green
  charity: '#f59e0b',  // Amber
  personal: '#6b7280'  // Gray
};
