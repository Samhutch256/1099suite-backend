import { DailyInput } from '../state/kpiStore';
import { Lead } from '../state/contractorStore';
import { getProgressionStages } from '../types/pipeline';

export interface KPICalculationResult {
  totals: {
    outreachAttempts: number;
    appointmentsSet: number;
    appointmentsHeld: number;
    dealsClosed: number;
    accountsServiced: number;
    hoursWorked: number;
    
    // Source breakdowns
    outreachDoorKnocks: number;
    outreachTagsPut: number;
    outreachCallsMade: number;
    outreachReferrals: number;
    outreachInbound: number;
    
    appointmentsSetDoorKnocks: number;
    appointmentsSetTagsPut: number;
    appointmentsSetCallsMade: number;
    appointmentsSetReferrals: number;
    appointmentsSetInbound: number;
    
    appointmentsHeldDoorKnocks: number;
    appointmentsHeldTagsPut: number;
    appointmentsHeldCallsMade: number;
    appointmentsHeldReferrals: number;
    appointmentsHeldInbound: number;
    
    dealsClosedDoorKnocks: number;
    dealsClosedTagsPut: number;
    dealsClosedCallsMade: number;
    dealsClosedReferrals: number;
    dealsClosedInbound: number;
    
    accountsServicedDoorKnocks: number;
    accountsServicedTagsPut: number;
    accountsServicedCallsMade: number;
    accountsServicedReferrals: number;
    accountsServicedInbound: number;
  };
  
  conversions: {
    outreachToAppointments: number;
    appointmentHoldRate: number;
    appointmentCloseRate: number;
    overallCloseRate: number;
    serviceRate: number;
    overallServiceRate: number;
  };
  
  averages: {
    avgOutreachPerDay: number;
    avgAppointmentsPerDay: number;
    avgHoursPerDay: number;
    avgDealsPerDay: number;
  };
  
  efficiency: {
    outreachPerAppointment: number;
    appointmentsPerDeal: number;
    hoursPerDeal: number;
    revenuePerHour: number;
  };
  
  daysWithData: number;
  totalRevenue: number;
}

export interface LeadProgressionData {
  appointmentsSetDoorKnocks: number;
  appointmentsHeldDoorKnocks: number;
  dealsClosedDoorKnocks: number;
  accountsServicedDoorKnocks: number;
  
  appointmentsSetTagsPut: number;
  appointmentsHeldTagsPut: number;
  dealsClosedTagsPut: number;
  accountsServicedTagsPut: number;
  
  appointmentsSetCallsMade: number;
  appointmentsHeldCallsMade: number;
  dealsClosedCallsMade: number;
  accountsServicedCallsMade: number;
  
  appointmentsSetReferrals: number;
  appointmentsHeldReferrals: number;
  dealsClosedReferrals: number;
  accountsServicedReferrals: number;
  
  appointmentsSetInbound: number;
  appointmentsHeldInbound: number;
  dealsClosedInbound: number;
  accountsServicedInbound: number;
}

/**
 * Calculate accurate KPIs by combining daily inputs with lead progression data
 * This prevents double-counting when period totals are distributed across days
 */
export function calculateAccurateKPIs(
  dailyInputs: DailyInput[],
  leads: Lead[],
  totalRevenue: number = 0,
  dateRange?: { start: string; end: string },
  overrideTotals?: Partial<{
    outreachAttempts: number;
    appointmentsSet: number;
    appointmentsHeld: number;
    dealsClosed: number;
    accountsServiced: number;
    hoursWorked: number;
  }>
): KPICalculationResult {
  
  // Apply hierarchical override logic: Year > Month > Week > Day
  const applyHierarchyLogic = (inputs: DailyInput[], dateRange?: { start: string; end: string }): DailyInput[] => {
    // For All Time, use a very wide date range to include all data
    const startDate = dateRange ? new Date(dateRange.start) : new Date(0);
    const endDate = dateRange ? new Date(dateRange.end) : new Date(8640000000000000);
    
    // Group inputs by period type (year, month, week, day)
    const inputsByPeriod = {
      year: [] as DailyInput[],
      month: [] as DailyInput[],
      week: [] as DailyInput[],
      day: [] as DailyInput[]
    };

    inputs.forEach(input => {
      const inputDate = new Date(input.date);
      
      // Check if input falls within the date range
      if (inputDate >= startDate && inputDate <= endDate) {
        // Determine period type based on date and input characteristics
        const periodType = determinePeriodType(input, startDate, endDate);
        inputsByPeriod[periodType].push(input);
        console.log(`📊 Added input ${input.date} to ${periodType} category`);
      } else {
        console.log(`⏭️ Skipping input ${input.date} (outside date range)`);
      }
    });

    // Apply hierarchy: Year overrides all, Month overrides Week/Day, Week overrides Day
    const finalInputs: DailyInput[] = [];
    
    console.log(`📈 Period breakdown: Year=${inputsByPeriod.year.length}, Month=${inputsByPeriod.month.length}, Week=${inputsByPeriod.week.length}, Day=${inputsByPeriod.day.length}`);
    
    // 1. If we have year inputs, use only those (they override everything)
    if (inputsByPeriod.year.length > 0) {
      console.log(`🏆 Using ${inputsByPeriod.year.length} year-level inputs (overrides all others)`);
      return deduplicateByDate(inputsByPeriod.year);
    }
    
    // 2. If we have month inputs, use them and filter out overlapping day/week inputs
    if (inputsByPeriod.month.length > 0) {
      console.log(`📅 Using ${inputsByPeriod.month.length} month-level inputs`);
      const monthInputs = deduplicateByDate(inputsByPeriod.month);
      
      // Filter out day/week inputs that overlap with month periods
      const filteredDayInputs = inputsByPeriod.day.filter(dayInput => {
        const dayDate = new Date(dayInput.date);
        return !monthInputs.some(monthInput => {
          const monthDate = new Date(monthInput.date);
          return isSameMonth(dayDate, monthDate);
        });
      });
      
      const filteredWeekInputs = inputsByPeriod.week.filter(weekInput => {
        const weekDate = new Date(weekInput.date);
        return !monthInputs.some(monthInput => {
          const monthDate = new Date(monthInput.date);
          return isSameMonth(weekDate, monthDate);
        });
      });
      
      console.log(`📅 After filtering overlaps: ${filteredDayInputs.length} day inputs, ${filteredWeekInputs.length} week inputs remain`);
      
      return [...monthInputs, ...filteredWeekInputs, ...filteredDayInputs];
    }
    
    // 3. If we have week inputs, use them and filter out overlapping day inputs
    if (inputsByPeriod.week.length > 0) {
      console.log(`📆 Using ${inputsByPeriod.week.length} week-level inputs`);
      const weekInputs = deduplicateByDate(inputsByPeriod.week);
      
      // Filter out day inputs that overlap with week periods
      const filteredDayInputs = inputsByPeriod.day.filter(dayInput => {
        const dayDate = new Date(dayInput.date);
        return !weekInputs.some(weekInput => {
          const weekDate = new Date(weekInput.date);
          return isSameWeek(dayDate, weekDate);
        });
      });
      
      console.log(`📆 After filtering overlaps: ${filteredDayInputs.length} day inputs remain`);
      
      return [...weekInputs, ...filteredDayInputs];
    }
    
    // 4. Use only day inputs
    console.log(`📝 Using ${inputsByPeriod.day.length} day-level inputs`);
    return deduplicateByDate(inputsByPeriod.day);
  };

  // Helper function to deduplicate inputs by date
  const deduplicateByDate = (inputs: DailyInput[]): DailyInput[] => {
    const inputsByDate = new Map<string, DailyInput[]>();
    inputs.forEach(input => {
      if (!inputsByDate.has(input.date)) {
        inputsByDate.set(input.date, []);
      }
      inputsByDate.get(input.date)!.push(input);
    });
    
    const deduplicatedInputs: DailyInput[] = [];
    inputsByDate.forEach((dateInputs, date) => {
      if (dateInputs.length === 1) {
        deduplicatedInputs.push(dateInputs[0]);
      } else {
        // Sort by creation time and take the most recent
        const sortedInputs = dateInputs.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        deduplicatedInputs.push(sortedInputs[0]);
        console.log(`🔄 Deduplicated ${dateInputs.length} entries for ${date}, kept most recent`);
      }
    });
    
    return deduplicatedInputs;
  };

  // Helper function to determine period type based on input characteristics
  const determinePeriodType = (input: DailyInput, startDate: Date, endDate: Date): 'year' | 'month' | 'week' | 'day' => {
    const inputDate = new Date(input.date);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if this input represents a period total based on values and date patterns
    const appointments = input.appointments ?? 0;
    const appointmentHolds = input.appointmentHolds ?? 0;
    const closedDeals = input.closedDeals ?? 0;
    
    // Dynamic thresholds based on the date range context
    const isAllTime = daysDiff > 365; // More than a year
    const isLongPeriod = daysDiff > 90; // More than 3 months
    const isMediumPeriod = daysDiff > 30; // More than a month
    const isShortPeriod = daysDiff > 7; // More than a week
    
    // Adjust thresholds based on period length
    let highValueThreshold = { appointments: 50, holds: 30, deals: 10 };
    if (isAllTime) {
      highValueThreshold = { appointments: 100, holds: 50, deals: 20 };
    } else if (isLongPeriod) {
      highValueThreshold = { appointments: 75, holds: 40, deals: 15 };
    } else if (isMediumPeriod) {
      highValueThreshold = { appointments: 25, holds: 15, deals: 5 };
    } else if (isShortPeriod) {
      highValueThreshold = { appointments: 10, holds: 8, deals: 3 };
    }
    
    const hasHighValues = appointments > highValueThreshold.appointments || 
                         appointmentHolds > highValueThreshold.holds || 
                         closedDeals > highValueThreshold.deals;
    
    // Check if the input date is the first day of a month (common for monthly totals)
    const isFirstOfMonth = inputDate.getDate() === 1;
    
    // Check if the input date is the first day of a year (common for yearly totals)
    const isFirstOfYear = inputDate.getMonth() === 0 && inputDate.getDate() === 1;
    
    // Check if the input date is a Monday (common for weekly totals)
    const isMonday = inputDate.getDay() === 1;
    
    // Debug logging
    console.log(`🔍 Analyzing input: ${input.date}, appointments: ${appointments}, held: ${appointmentHolds}, deals: ${closedDeals}`);
    console.log(`   - hasHighValues: ${hasHighValues}, isFirstOfMonth: ${isFirstOfMonth}, daysDiff: ${daysDiff}`);
    console.log(`   - thresholds: appointments>${highValueThreshold.appointments}, holds>${highValueThreshold.holds}, deals>${highValueThreshold.deals}`);
    
    // Determine period type based on date patterns and values
    if (isFirstOfYear && hasHighValues && isAllTime) {
      console.log(`   → Classified as YEAR input`);
      return 'year';
    } else if (isFirstOfMonth && hasHighValues && (isAllTime || isLongPeriod)) {
      console.log(`   → Classified as MONTH input`);
      return 'month';
    } else if (isMonday && hasHighValues && (isMediumPeriod || isShortPeriod)) {
      console.log(`   → Classified as WEEK input`);
      return 'week';
    } else if (hasHighValues && isLongPeriod) {
      // If we have high values over a long period, it's likely a month total
      console.log(`   → Classified as MONTH input (high values + long period)`);
      return 'month';
    } else if (hasHighValues && isMediumPeriod) {
      // If we have high values over a medium period, it's likely a week total
      console.log(`   → Classified as WEEK input (high values + medium period)`);
      return 'week';
    } else {
      console.log(`   → Classified as DAY input`);
      return 'day';
    }
  };

  // Helper function to check if two dates are in the same month
  const isSameMonth = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
  };

  // Helper function to check if two dates are in the same week
  const isSameWeek = (date1: Date, date2: Date): boolean => {
    const startOfWeek1 = new Date(date1);
    startOfWeek1.setDate(date1.getDate() - date1.getDay()); // Start of week (Sunday)
    
    const startOfWeek2 = new Date(date2);
    startOfWeek2.setDate(date2.getDate() - date2.getDay()); // Start of week (Sunday)
    
    return startOfWeek1.getTime() === startOfWeek2.getTime();
  };
  
  // Apply hierarchy logic first to prevent double counting
  const deduplicatedInputs = applyHierarchyLogic(dailyInputs, dateRange);
  
  // The hierarchy logic already handles date filtering, so we use the result directly
  const filteredInputs = deduplicatedInputs;
  
  console.log(`📊 KPI Calculation: ${dailyInputs.length} total inputs, ${deduplicatedInputs.length} after hierarchy processing`);
  
  // Debug: Log the actual values being calculated
  if (filteredInputs.length > 0) {
    const sampleInput = filteredInputs[0];
    console.log(`🔍 Sample input data:`, {
      date: sampleInput.date,
      appointments: sampleInput.appointments,
      appointmentHolds: sampleInput.appointmentHolds,
      closedDeals: sampleInput.closedDeals
    });
  }

  // Get lead progression data (cumulative from leads)
  const leadProgression = calculateLeadProgression(leads, dateRange);
  
  // Calculate totals from daily inputs
  console.log(`🔍 About to calculate totals from ${filteredInputs.length} filtered inputs`);
  filteredInputs.forEach((input, index) => {
    console.log(`   Input ${index + 1}: ${input.date} - appointments: ${input.appointments}, held: ${input.appointmentHolds}, deals: ${input.closedDeals}`);
  });
  
  const toNumber = (value?: number | null) => (typeof value === 'number' && !Number.isNaN(value) ? value : 0);

  const inputTotals = filteredInputs.reduce((acc, input) => ({
    outreachAttempts: acc.outreachAttempts + toNumber(input.doorsKnocked),
    appointmentsSet: acc.appointmentsSet + toNumber(input.appointments),
    appointmentsHeld: acc.appointmentsHeld + toNumber(input.appointmentHolds),
    dealsClosed: acc.dealsClosed + toNumber(input.closedDeals),
    accountsServiced: acc.accountsServiced + toNumber(input.accountsServiced),
    hoursWorked: acc.hoursWorked + toNumber(input.hoursWorked),
    
    // Source breakdowns from daily inputs
    outreachDoorKnocks: acc.outreachDoorKnocks + toNumber(input.outreachDoorKnocks),
    outreachTagsPut: acc.outreachTagsPut + toNumber(input.outreachTagsPut),
    outreachCallsMade: acc.outreachCallsMade + toNumber(input.outreachCallsMade),
    outreachReferrals: acc.outreachReferrals + toNumber(input.outreachReferrals),
    outreachInbound: acc.outreachInbound + toNumber(input.outreachInbound),
    
    appointmentsSetDoorKnocks: acc.appointmentsSetDoorKnocks + toNumber(input.appointmentsSetDoorKnocks),
    appointmentsSetTagsPut: acc.appointmentsSetTagsPut + toNumber(input.appointmentsSetTagsPut),
    appointmentsSetCallsMade: acc.appointmentsSetCallsMade + toNumber(input.appointmentsSetCallsMade),
    appointmentsSetReferrals: acc.appointmentsSetReferrals + toNumber(input.appointmentsSetReferrals),
    appointmentsSetInbound: acc.appointmentsSetInbound + toNumber(input.appointmentsSetInbound),
    
    appointmentsHeldDoorKnocks: acc.appointmentsHeldDoorKnocks + toNumber(input.appointmentsHeldDoorKnocks),
    appointmentsHeldTagsPut: acc.appointmentsHeldTagsPut + toNumber(input.appointmentsHeldTagsPut),
    appointmentsHeldCallsMade: acc.appointmentsHeldCallsMade + toNumber(input.appointmentsHeldCallsMade),
    appointmentsHeldReferrals: acc.appointmentsHeldReferrals + toNumber(input.appointmentsHeldReferrals),
    appointmentsHeldInbound: acc.appointmentsHeldInbound + toNumber(input.appointmentsHeldInbound),
    
    dealsClosedDoorKnocks: acc.dealsClosedDoorKnocks + toNumber(input.dealsClosedDoorKnocks),
    dealsClosedTagsPut: acc.dealsClosedTagsPut + toNumber(input.dealsClosedTagsPut),
    dealsClosedCallsMade: acc.dealsClosedCallsMade + toNumber(input.dealsClosedCallsMade),
    dealsClosedReferrals: acc.dealsClosedReferrals + toNumber(input.dealsClosedReferrals),
    dealsClosedInbound: acc.dealsClosedInbound + toNumber(input.dealsClosedInbound),
    
    accountsServicedDoorKnocks: acc.accountsServicedDoorKnocks + toNumber(input.accountsServicedDoorKnocks),
    accountsServicedTagsPut: acc.accountsServicedTagsPut + toNumber(input.accountsServicedTagsPut),
    accountsServicedCallsMade: acc.accountsServicedCallsMade + toNumber(input.accountsServicedCallsMade),
    accountsServicedReferrals: acc.accountsServicedReferrals + toNumber(input.accountsServicedReferrals),
    accountsServicedInbound: acc.accountsServicedInbound + toNumber(input.accountsServicedInbound),
  }), {
    outreachAttempts: 0,
    appointmentsSet: 0,
    appointmentsHeld: 0,
    dealsClosed: 0,
    accountsServiced: 0,
    hoursWorked: 0,
    outreachDoorKnocks: 0,
    outreachTagsPut: 0,
    outreachCallsMade: 0,
    outreachReferrals: 0,
    outreachInbound: 0,
    appointmentsSetDoorKnocks: 0,
    appointmentsSetTagsPut: 0,
    appointmentsSetCallsMade: 0,
    appointmentsSetReferrals: 0,
    appointmentsSetInbound: 0,
    appointmentsHeldDoorKnocks: 0,
    appointmentsHeldTagsPut: 0,
    appointmentsHeldCallsMade: 0,
    appointmentsHeldReferrals: 0,
    appointmentsHeldInbound: 0,
    dealsClosedDoorKnocks: 0,
    dealsClosedTagsPut: 0,
    dealsClosedCallsMade: 0,
    dealsClosedReferrals: 0,
    dealsClosedInbound: 0,
    accountsServicedDoorKnocks: 0,
    accountsServicedTagsPut: 0,
    accountsServicedCallsMade: 0,
    accountsServicedReferrals: 0,
    accountsServicedInbound: 0,
  });
  
  console.log(`🔍 Final calculated totals:`, {
    appointmentsSet: inputTotals.appointmentsSet,
    appointmentsHeld: inputTotals.appointmentsHeld,
    dealsClosed: inputTotals.dealsClosed
  });

  // Debug: Log the calculated totals
  console.log(`🔍 Calculated input totals:`, {
    appointmentsSet: inputTotals.appointmentsSet,
    appointmentsHeld: inputTotals.appointmentsHeld,
    dealsClosed: inputTotals.dealsClosed,
    outreachAttempts: inputTotals.outreachAttempts
  });

  // Combine daily input totals with lead progression data
  // Use the higher value to avoid double-counting when period totals are distributed
  const combinedTotals = {
    outreachAttempts: Math.max(inputTotals.outreachAttempts, 
      leadProgression.appointmentsSetDoorKnocks + leadProgression.appointmentsSetTagsPut + 
      leadProgression.appointmentsSetCallsMade + leadProgression.appointmentsSetReferrals + 
      leadProgression.appointmentsSetInbound),
    
    appointmentsSet: Math.max(inputTotals.appointmentsSet,
      leadProgression.appointmentsSetDoorKnocks + leadProgression.appointmentsSetTagsPut + 
      leadProgression.appointmentsSetCallsMade + leadProgression.appointmentsSetReferrals + 
      leadProgression.appointmentsSetInbound),
    
    appointmentsHeld: Math.max(inputTotals.appointmentsHeld,
      leadProgression.appointmentsHeldDoorKnocks + leadProgression.appointmentsHeldTagsPut + 
      leadProgression.appointmentsHeldCallsMade + leadProgression.appointmentsHeldReferrals + 
      leadProgression.appointmentsHeldInbound),
    
    dealsClosed: Math.max(inputTotals.dealsClosed,
      leadProgression.dealsClosedDoorKnocks + leadProgression.dealsClosedTagsPut + 
      leadProgression.dealsClosedCallsMade + leadProgression.dealsClosedReferrals + 
      leadProgression.dealsClosedInbound),
    
    accountsServiced: Math.max(inputTotals.accountsServiced,
      leadProgression.accountsServicedDoorKnocks + leadProgression.accountsServicedTagsPut + 
      leadProgression.accountsServicedCallsMade + leadProgression.accountsServicedReferrals + 
      leadProgression.accountsServicedInbound),
    
    hoursWorked: inputTotals.hoursWorked, // Hours are always from daily inputs
    
    // Use lead progression data for source breakdowns when available
    outreachDoorKnocks: Math.max(inputTotals.outreachDoorKnocks, leadProgression.appointmentsSetDoorKnocks),
    outreachTagsPut: Math.max(inputTotals.outreachTagsPut, leadProgression.appointmentsSetTagsPut),
    outreachCallsMade: Math.max(inputTotals.outreachCallsMade, leadProgression.appointmentsSetCallsMade),
    outreachReferrals: Math.max(inputTotals.outreachReferrals, leadProgression.appointmentsSetReferrals),
    outreachInbound: Math.max(inputTotals.outreachInbound, leadProgression.appointmentsSetInbound),
    
    appointmentsSetDoorKnocks: Math.max(inputTotals.appointmentsSetDoorKnocks, leadProgression.appointmentsSetDoorKnocks),
    appointmentsSetTagsPut: Math.max(inputTotals.appointmentsSetTagsPut, leadProgression.appointmentsSetTagsPut),
    appointmentsSetCallsMade: Math.max(inputTotals.appointmentsSetCallsMade, leadProgression.appointmentsSetCallsMade),
    appointmentsSetReferrals: Math.max(inputTotals.appointmentsSetReferrals, leadProgression.appointmentsSetReferrals),
    appointmentsSetInbound: Math.max(inputTotals.appointmentsSetInbound, leadProgression.appointmentsSetInbound),
    
    appointmentsHeldDoorKnocks: Math.max(inputTotals.appointmentsHeldDoorKnocks, leadProgression.appointmentsHeldDoorKnocks),
    appointmentsHeldTagsPut: Math.max(inputTotals.appointmentsHeldTagsPut, leadProgression.appointmentsHeldTagsPut),
    appointmentsHeldCallsMade: Math.max(inputTotals.appointmentsHeldCallsMade, leadProgression.appointmentsHeldCallsMade),
    appointmentsHeldReferrals: Math.max(inputTotals.appointmentsHeldReferrals, leadProgression.appointmentsHeldReferrals),
    appointmentsHeldInbound: Math.max(inputTotals.appointmentsHeldInbound, leadProgression.appointmentsHeldInbound),
    
    dealsClosedDoorKnocks: Math.max(inputTotals.dealsClosedDoorKnocks, leadProgression.dealsClosedDoorKnocks),
    dealsClosedTagsPut: Math.max(inputTotals.dealsClosedTagsPut, leadProgression.dealsClosedTagsPut),
    dealsClosedCallsMade: Math.max(inputTotals.dealsClosedCallsMade, leadProgression.dealsClosedCallsMade),
    dealsClosedReferrals: Math.max(inputTotals.dealsClosedReferrals, leadProgression.dealsClosedReferrals),
    dealsClosedInbound: Math.max(inputTotals.dealsClosedInbound, leadProgression.dealsClosedInbound),
    
    accountsServicedDoorKnocks: Math.max(inputTotals.accountsServicedDoorKnocks, leadProgression.accountsServicedDoorKnocks),
    accountsServicedTagsPut: Math.max(inputTotals.accountsServicedTagsPut, leadProgression.accountsServicedTagsPut),
    accountsServicedCallsMade: Math.max(inputTotals.accountsServicedCallsMade, leadProgression.accountsServicedCallsMade),
    accountsServicedReferrals: Math.max(inputTotals.accountsServicedReferrals, leadProgression.accountsServicedReferrals),
    accountsServicedInbound: Math.max(inputTotals.accountsServicedInbound, leadProgression.accountsServicedInbound),
  } as KPICalculationResult["totals"];

  // Apply optional overrides from period views (year > month > week > day)
  if (overrideTotals) {
    if (typeof overrideTotals.outreachAttempts === 'number') {
      combinedTotals.outreachAttempts = overrideTotals.outreachAttempts;
    }
    if (typeof overrideTotals.appointmentsSet === 'number') {
      combinedTotals.appointmentsSet = overrideTotals.appointmentsSet;
    }
    if (typeof overrideTotals.appointmentsHeld === 'number') {
      combinedTotals.appointmentsHeld = overrideTotals.appointmentsHeld;
    }
    if (typeof overrideTotals.dealsClosed === 'number') {
      combinedTotals.dealsClosed = overrideTotals.dealsClosed;
    }
    if (typeof overrideTotals.accountsServiced === 'number') {
      combinedTotals.accountsServiced = overrideTotals.accountsServiced;
    }
    if (typeof overrideTotals.hoursWorked === 'number') {
      combinedTotals.hoursWorked = overrideTotals.hoursWorked as number;
    }
  }

  // Calculate conversion rates
  const conversions = {
    outreachToAppointments: combinedTotals.outreachAttempts > 0 ? 
      (combinedTotals.appointmentsSet / combinedTotals.outreachAttempts) * 100 : 0,
    appointmentHoldRate: combinedTotals.appointmentsSet > 0 ? 
      (combinedTotals.appointmentsHeld / combinedTotals.appointmentsSet) * 100 : 0,
    appointmentCloseRate: combinedTotals.appointmentsHeld > 0 ? 
      (combinedTotals.dealsClosed / combinedTotals.appointmentsHeld) * 100 : 0,
    overallCloseRate: combinedTotals.outreachAttempts > 0 ? 
      (combinedTotals.dealsClosed / combinedTotals.outreachAttempts) * 100 : 0,
    serviceRate: combinedTotals.dealsClosed > 0 ? 
      (combinedTotals.accountsServiced / combinedTotals.dealsClosed) * 100 : 0,
    overallServiceRate: combinedTotals.outreachAttempts > 0 ? 
      (combinedTotals.accountsServiced / combinedTotals.outreachAttempts) * 100 : 0,
  };

  // Calculate averages
  const daysWithData = filteredInputs.length;
  const averages = {
    avgOutreachPerDay: daysWithData > 0 ? combinedTotals.outreachAttempts / daysWithData : 0,
    avgAppointmentsPerDay: daysWithData > 0 ? combinedTotals.appointmentsSet / daysWithData : 0,
    avgHoursPerDay: daysWithData > 0 ? combinedTotals.hoursWorked / daysWithData : 0,
    avgDealsPerDay: daysWithData > 0 ? combinedTotals.dealsClosed / daysWithData : 0,
  };

  // Calculate efficiency metrics
  const efficiency = {
    outreachPerAppointment: combinedTotals.appointmentsSet > 0 ? 
      combinedTotals.outreachAttempts / combinedTotals.appointmentsSet : 0,
    appointmentsPerDeal: combinedTotals.dealsClosed > 0 ? 
      combinedTotals.appointmentsSet / combinedTotals.dealsClosed : 0,
    hoursPerDeal: combinedTotals.dealsClosed > 0 ? 
      combinedTotals.hoursWorked / combinedTotals.dealsClosed : 0,
    revenuePerHour: combinedTotals.hoursWorked > 0 ? 
      totalRevenue / combinedTotals.hoursWorked : 0,
  };

  return {
    totals: combinedTotals,
    conversions,
    averages,
    efficiency,
    daysWithData,
    totalRevenue,
  };
}

/**
 * Calculate lead progression data from leads, filtered by date range if provided
 */
function calculateLeadProgression(leads: Lead[], dateRange?: { start: string; end: string }): LeadProgressionData {
  // Filter leads by date range if provided
  let filteredLeads = leads;
  if (dateRange) {
    filteredLeads = leads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      return leadDate >= startDate && leadDate <= endDate;
    });
  }

  // Helper function to check if appointment date has passed
  const hasAppointmentDatePassed = (lead: Lead) => {
    if (!lead.appointmentDate) return true; // No date means we don't exclude it
    const appointmentDate = new Date(lead.appointmentDate);
    const now = new Date();
    appointmentDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return appointmentDate <= now;
  };

  // Helper function to get effective status
  const getEffectiveStatus = (lead: Lead) => {
    return lead.isCancelled ? lead.highestStageReached || lead.status : lead.status;
  };

  // Get stage arrays
  const progressionStages = getProgressionStages();
  const getStagesFromAppointmentSet = () => {
    const appointmentSetIndex = progressionStages.findIndex(s => s.key === 'appointment_set');
    return progressionStages.slice(appointmentSetIndex).map(s => s.key);
  };
  const getStagesFromAppointmentHeld = () => {
    const appointmentHeldIndex = progressionStages.findIndex(s => s.key === 'appointment_held');
    return progressionStages.slice(appointmentHeldIndex).map(s => s.key);
  };
  const getStagesFromSignedDeal = () => {
    const signedDealIndex = progressionStages.findIndex(s => s.key === 'signed_deal');
    return progressionStages.slice(signedDealIndex).map(s => s.key);
  };

  return {
    appointmentsSetDoorKnocks: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      return l.source === 'door_knocks' && getStagesFromAppointmentSet().includes(effectiveStatus);
    }).length,
    
    appointmentsHeldDoorKnocks: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      const includeInHeldStats = !l.appointmentDate || hasAppointmentDatePassed(l);
      return l.source === 'door_knocks' && 
        getStagesFromAppointmentHeld().includes(effectiveStatus) && includeInHeldStats;
    }).length,
    
    dealsClosedDoorKnocks: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      const includeInClosedStats = !l.appointmentDate || hasAppointmentDatePassed(l);
      return l.source === 'door_knocks' && 
        getStagesFromSignedDeal().includes(effectiveStatus) && includeInClosedStats;
    }).length,
    
    accountsServicedDoorKnocks: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      const includeInServicedStats = !l.appointmentDate || hasAppointmentDatePassed(l);
      return l.source === 'door_knocks' && effectiveStatus === 'installed' && includeInServicedStats;
    }).length,
    
    appointmentsSetTagsPut: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      return l.source === 'tags_put' && getStagesFromAppointmentSet().includes(effectiveStatus);
    }).length,
    
    appointmentsHeldTagsPut: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      const includeInHeldStats = !l.appointmentDate || hasAppointmentDatePassed(l);
      return l.source === 'tags_put' && 
        getStagesFromAppointmentHeld().includes(effectiveStatus) && includeInHeldStats;
    }).length,
    
    dealsClosedTagsPut: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      const includeInClosedStats = !l.appointmentDate || hasAppointmentDatePassed(l);
      return l.source === 'tags_put' && 
        getStagesFromSignedDeal().includes(effectiveStatus) && includeInClosedStats;
    }).length,
    
    accountsServicedTagsPut: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      const includeInServicedStats = !l.appointmentDate || hasAppointmentDatePassed(l);
      return l.source === 'tags_put' && effectiveStatus === 'installed' && includeInServicedStats;
    }).length,
    
    appointmentsSetCallsMade: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      return l.source === 'calls_made' && getStagesFromAppointmentSet().includes(effectiveStatus);
    }).length,
    
    appointmentsHeldCallsMade: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      const includeInHeldStats = !l.appointmentDate || hasAppointmentDatePassed(l);
      return l.source === 'calls_made' && 
        getStagesFromAppointmentHeld().includes(effectiveStatus) && includeInHeldStats;
    }).length,
    
    dealsClosedCallsMade: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      const includeInClosedStats = !l.appointmentDate || hasAppointmentDatePassed(l);
      return l.source === 'calls_made' && 
        getStagesFromSignedDeal().includes(effectiveStatus) && includeInClosedStats;
    }).length,
    
    accountsServicedCallsMade: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      const includeInServicedStats = !l.appointmentDate || hasAppointmentDatePassed(l);
      return l.source === 'calls_made' && effectiveStatus === 'installed' && includeInServicedStats;
    }).length,
    
    appointmentsSetReferrals: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      return l.source === 'referrals' && getStagesFromAppointmentSet().includes(effectiveStatus);
    }).length,
    
    appointmentsHeldReferrals: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      const includeInHeldStats = !l.appointmentDate || hasAppointmentDatePassed(l);
      return l.source === 'referrals' && 
        getStagesFromAppointmentHeld().includes(effectiveStatus) && includeInHeldStats;
    }).length,
    
    dealsClosedReferrals: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      const includeInClosedStats = !l.appointmentDate || hasAppointmentDatePassed(l);
      return l.source === 'referrals' && 
        getStagesFromSignedDeal().includes(effectiveStatus) && includeInClosedStats;
    }).length,
    
    accountsServicedReferrals: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      const includeInServicedStats = !l.appointmentDate || hasAppointmentDatePassed(l);
      return l.source === 'referrals' && effectiveStatus === 'installed' && includeInServicedStats;
    }).length,
    
    appointmentsSetInbound: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      return l.source === 'inbound' && getStagesFromAppointmentSet().includes(effectiveStatus);
    }).length,
    
    appointmentsHeldInbound: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      const includeInHeldStats = !l.appointmentDate || hasAppointmentDatePassed(l);
      return l.source === 'inbound' && 
        getStagesFromAppointmentHeld().includes(effectiveStatus) && includeInHeldStats;
    }).length,
    
    dealsClosedInbound: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      const includeInClosedStats = !l.appointmentDate || hasAppointmentDatePassed(l);
      return l.source === 'inbound' && 
        getStagesFromSignedDeal().includes(effectiveStatus) && includeInClosedStats;
    }).length,
    
    accountsServicedInbound: filteredLeads.filter(l => {
      const effectiveStatus = getEffectiveStatus(l);
      const includeInServicedStats = !l.appointmentDate || hasAppointmentDatePassed(l);
      return l.source === 'inbound' && effectiveStatus === 'installed' && includeInServicedStats;
    }).length,
  };
}
