# Double-Counting Prevention in Multi-Scope Daily Input

## Problem
The original implementation could potentially double-count data if users:
1. Enter daily data for individual days
2. Then try to save period totals (week/month/year) that overlap with those days
3. This would result in inflated totals when viewing period summaries

## Solution
The updated SQL function `daily_inputs_overwrite_range` now includes comprehensive double-counting prevention:

### 1. Pre-Save Validation
Before attempting to save period totals, the function checks if any dates in the range already have non-zero data:

```sql
-- Check for existing data that would be overwritten
for existing_record in 
  select date, appointments, appointment_holds, closed_deals, accounts_serviced, hours_worked
  from public.daily_inputs 
  where user_id = p_user 
    and date between p_start and p_end
    and (appointments > 0 or appointment_holds > 0 or closed_deals > 0 or accounts_serviced > 0 or hours_worked > 0)
loop
  -- Raise exception to prevent overwriting
  raise exception 'Cannot overwrite existing daily data for date %...', existing_record.date;
end loop;
```

### 2. Safe Deletion
Only deletes records that have zero or null values (safe to overwrite):

```sql
-- Only delete records that have zero or null values
delete from public.daily_inputs 
where user_id = p_user 
  and date between p_start and p_end
  and (appointments is null or appointments = 0)
  and (appointment_holds is null or appointment_holds = 0)
  and (closed_deals is null or closed_deals = 0)
  and (accounts_serviced is null or accounts_serviced = 0)
  and (hours_worked is null or hours_worked = 0);
```

### 3. Conditional Insertion
Only inserts new records for dates that don't already have data:

```sql
-- Only insert if no record exists for this date
if not exists (select 1 from public.daily_inputs where user_id = p_user and date = d) then
  insert into public.daily_inputs(...) values (...);
end if;
```

## User Experience

### Error Handling
When users try to save period totals that would conflict with existing daily data:

1. **Clear Error Message**: "Cannot save period totals: Some dates in this period already have data. Please use daily view to edit individual days first."

2. **Guided Action**: Users are directed to use the daily view to edit individual days first

3. **Data Protection**: Existing daily data is never accidentally overwritten

### Workflow
1. **Daily Input**: Users can enter data for individual days (Day scope)
2. **Period Input**: Users can enter totals for periods (Week/Month/Year scope) only if no daily data exists for those dates
3. **Hybrid Approach**: Users can mix daily and period inputs as long as they don't overlap

## Benefits
- ✅ **No Double Counting**: Impossible to have inflated totals
- ✅ **Data Integrity**: Existing daily data is protected
- ✅ **Clear User Guidance**: Users know exactly what to do when conflicts occur
- ✅ **Flexible Workflow**: Supports both daily and period input methods
- ✅ **Audit Trail**: Clear distinction between daily and period-saved data

## Example Scenarios

### Scenario 1: Safe Period Save
- User has no data for Aug 18-24
- User enters week totals: 10 appointments, 5 held, 2 deals
- ✅ Success: Data distributed evenly across the week

### Scenario 2: Conflict Prevention
- User has daily data for Aug 20: 3 appointments, 1 held
- User tries to save week totals for Aug 18-24
- ❌ Error: "Cannot save period totals: Some dates in this period already have data..."

### Scenario 3: Mixed Approach
- User saves week totals for Aug 18-24 (no conflicts)
- Later, user edits Aug 22 specifically (daily view)
- ✅ Works: Daily edit only affects Aug 22, week totals remain for other days

This approach ensures data accuracy while maintaining user flexibility.
