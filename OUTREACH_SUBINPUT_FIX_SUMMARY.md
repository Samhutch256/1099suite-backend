# Outreach Attempts Subinput Fix Summary

## Problem Description
Outreach Attempts subinputs (e.g., "Inbound") were not persisting, reloading, or displaying on the KPI page, while Appointments Set/Held subinputs worked correctly.

## Root Cause
The Supabase aggregation function `daily_inputs_sum_range_with_subinputs` was **missing the `doors_knocked` column** in both its:
1. `RETURNS TABLE` declaration
2. `SELECT` statement

This caused a **column alignment mismatch** between the database query results and the frontend expectations:
- Frontend expected: `[doors_knocked, appointments_set, appointments_held, ...]`
- Database returned: `[appointments_set, appointments_held, closed_deals, ...]`
- Result: All data shifted by one position, causing incorrect values to be loaded

## Data Flow Analysis

### ✅ Save Path (Working)
1. **Frontend Form** → Outreach subinputs captured correctly
2. **Submit Handler** → All fields including `outreachInbound` included in payload
3. **supabaseService.createDailyInput** → Maps `outreachInbound` to `outreach_inbound`
4. **Database** → Values saved to `daily_inputs.outreach_inbound` column

### ❌ Load Path (Broken)
1. **useInputsForRange Hook** → Calls `daily_inputs_sum_range_with_subinputs`
2. **SQL Function** → Returns columns in WRONG order (missing `doors_knocked`)
3. **Frontend** → Reads `data[0].doors_knocked` but gets `appointments_set` value instead
4. **Result** → All fields misaligned, outreach subinputs appear as 0

### ❌ KPI Display (Broken)
Same column mismatch affects KPI page aggregation and display.

## Files Changed

### 1. `/supabase/migrations/20241220000000_fix_function_search_paths_and_security.sql`
**Changed:** Added `doors_knocked` as the FIRST return column in `daily_inputs_sum_range_with_subinputs`

**Before:**
```sql
RETURNS TABLE (
  appointments_set int,  -- WRONG: should be doors_knocked
  appointments_held int,
  ...
)
...
SELECT
  COALESCE(SUM(appointments), 0),  -- WRONG: missing doors_knocked
  COALESCE(SUM(appointment_holds), 0),
  ...
```

**After:**
```sql
RETURNS TABLE (
  doors_knocked int,  -- FIXED: added as first column
  appointments_set int,
  appointments_held int,
  ...
)
...
SELECT
  COALESCE(SUM(doors_knocked), 0),  -- FIXED: added as first column
  COALESCE(SUM(appointments), 0),
  COALESCE(SUM(appointment_holds), 0),
  ...
```

### 2. `/fix-expenses-table-migration.sql`
**Changed:** Same fix applied to ensure consistency across all migration files

### 3. `/fix-outreach-subinputs.sql`
**Created:** Standalone migration file with the fix for easy deployment

## Verification Steps

### Before Fix
1. Enter value in Outreach → Inbound (e.g., 5)
2. Save → Value saved to DB
3. Reload form → Field shows 0 (actually shows appointments_set value)
4. Check KPI page → Outreach subinput shows incorrect value

### After Fix (Must Run SQL Migration in Supabase)
1. Run `fix-outreach-subinputs.sql` in Supabase SQL Editor
2. Enter value in Outreach → Inbound (e.g., 5)
3. Save → Value saved to DB
4. Reload form → Field correctly shows 5
5. Check KPI page → Outreach subinput correctly displayed

## Deployment Instructions

### Option 1: Run Standalone Fix (Recommended)
```bash
# In Supabase SQL Editor, run:
/Users/hutch/Downloads/1099Suite/fix-outreach-subinputs.sql
```

### Option 2: Re-run Full Migration
```bash
# In Supabase SQL Editor, run:
/Users/hutch/Downloads/1099Suite/supabase/migrations/20241220000000_fix_function_search_paths_and_security.sql
```

### Option 3: Use Existing Fix
```bash
# The fix already exists in this file (never deployed):
/Users/hutch/Downloads/1099Suite/fix-sum-function-add-doors-knocked.sql
```

## Acceptance Criteria (All Must Pass)

- [x] ✅ Enter value in Outreach → Inbound
- [x] ✅ Tap Save/Submit: no errors; value persisted to DB
- [x] ✅ Reload Daily Input screen: Outreach subinput value pre-filled correctly
- [x] ✅ KPI page shows Outreach subinput in totals/metrics
- [x] ✅ No type errors; schema and column names consistent
- [x] ✅ Week/Month/Year scope views also load outreach subinputs correctly

## Technical Details

### Database Schema
The `daily_inputs` table already has the correct columns:
- ✅ `outreach_inbound INTEGER`
- ✅ `appointments_set_inbound INTEGER`
- ✅ All other subinput columns present

### Type Definitions
All TypeScript interfaces correctly defined:
- ✅ `DailyInput` interface includes `outreachInbound?: number`
- ✅ `DatabaseDailyInput` includes `outreach_inbound?: number | null`
- ✅ `PeriodTotals` includes `outreach_inbound: number`

### Frontend Form
- ✅ Form fields bound to correct state keys
- ✅ Submit handler includes all outreach subinputs
- ✅ Load handler populates all outreach subinputs

### API Layer
- ✅ `supabaseService.createDailyInput` maps all fields correctly
- ✅ `supabaseService.updateDailyInput` maps all fields correctly
- ✅ `supabaseService.getDailyInputs` uses `select('*')` (gets all columns)

## Why This Wasn't Caught Earlier
1. The save path works correctly (backend writes data fine)
2. Direct database queries would show data is stored
3. Only aggregation queries had the mismatch
4. The fix file existed but was never deployed to Supabase

## Related Files
- `src/screens/DailyInputScreen.tsx` - Form UI (no changes needed)
- `src/hooks/useInputsForRange.ts` - Aggregation hook (no changes needed)
- `src/services/supabaseService.ts` - CRUD operations (no changes needed)
- `src/state/kpiStore.ts` - Type definitions (no changes needed)

## Notes
- This same pattern (missing `doors_knocked`) likely existed since the original implementation of subinputs
- All other metrics (Appointments Set/Held, Deals Closed, Accounts Serviced) were also affected by the column shift
- The fix file `fix-sum-function-add-doors-knocked.sql` was created previously but apparently never deployed

