import { DailyInput } from '../state/kpiStore';

export const sampleKPIData: Omit<DailyInput, 'id' | 'createdAt'>[] = [
  {
    date: new Date(2024, 11, 15).toISOString().split('T')[0], // Today
    doorsKnocked: 45,
    appointments: 3,
    appointmentHolds: 2,

    closedDeals: 2,
    accountsServiced: 2,
    hoursWorked: 8.5,
    notes: 'Great day! Had two solid closes. Neighborhood was very receptive.',
  },
  {
    date: new Date(2024, 11, 14).toISOString().split('T')[0], // Yesterday
    doorsKnocked: 52,
    appointments: 4,
    appointmentHolds: 3,

    closedDeals: 1,
    accountsServiced: 1,
    hoursWorked: 9.0,
    notes: 'Challenging day with weather, but managed to get one close.',
  },
  {
    date: new Date(2024, 11, 13).toISOString().split('T')[0],
    doorsKnocked: 38,
    appointments: 2,
    appointmentHolds: 1,
    closedDeals: 0,
    accountsServiced: 0,
    hoursWorked: 7.5,
    notes: 'No closes but good leads generated. Follow up scheduled.',
  },
  {
    date: new Date(2024, 11, 12).toISOString().split('T')[0],
    doorsKnocked: 48,
    appointments: 5,
    appointmentHolds: 4,
    closedDeals: 3,
    accountsServiced: 3,
    hoursWorked: 8.0,
    notes: 'Excellent day! Hit quota early. Team morale is high.',
  },
  {
    date: new Date(2024, 11, 11).toISOString().split('T')[0],
    doorsKnocked: 41,
    appointments: 3,
    appointmentHolds: 2,
    closedDeals: 1,
    accountsServiced: 1,
    hoursWorked: 7.0,
    notes: 'Steady performance. Need to improve appointment hold rate.',
  },
  {
    date: new Date(2024, 11, 10).toISOString().split('T')[0],
    doorsKnocked: 55,
    appointments: 4,
    appointmentHolds: 3,
    closedDeals: 2,
    accountsServiced: 2,
    hoursWorked: 9.5,
    notes: 'High activity day. Good conversion on sit downs.',
  },
];