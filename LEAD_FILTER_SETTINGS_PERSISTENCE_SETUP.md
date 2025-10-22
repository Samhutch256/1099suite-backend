# Lead Filter Settings Persistence Setup

## Problem
Lead filter settings (pipeline stage toggles) were not persisting when the app restarted because they were only saved to local SQLite storage, not to the cloud database (Supabase).

## Solution
We've implemented a dual-storage approach:
1. **Supabase (Cloud)** - Primary source of truth, persists across devices and app reinstalls
2. **Local SQLite** - Cached copy for offline access

## What Was Changed

### 1. Database Structure
Created `user_settings` table in Supabase with the following columns:
- `app_settings` (JSONB) - General app preferences
- `lead_filter_settings` (JSONB) - Pipeline stage visibility toggles
- `input_settings` (JSONB) - Daily input preferences
- `kpi_visibility` (JSONB) - KPI visibility settings
- `visibility_settings` (JSONB) - General visibility settings

### 2. Code Updates
- **`src/services/supabaseService.ts`** - Added `saveUserSettings()` and `getUserSettings()` methods to interact with Supabase
- **`src/state/leadFilterStore.ts`** - Updated to save to both Supabase and local SQLite, with fallback support

## Setup Instructions

### Step 1: Run SQL Script in Supabase
1. Open your Supabase project dashboard
2. Go to the **SQL Editor**
3. Open the file `setup-user-settings-table.sql` (in the project root)
4. Copy all the SQL code
5. Paste it into the Supabase SQL Editor
6. Click **Run** to execute

This script will:
- Create the `user_settings` table
- Set up Row Level Security (RLS) policies
- Add proper indexes for performance
- Configure automatic timestamp updates
- Grant necessary permissions

### Step 2: Verify Table Creation
After running the script, you should see:
```
✓ user_settings table created successfully
✓ Existing records: 0
✓ Table structure displayed
```

### Step 3: Test the Implementation
1. Restart your app
2. Go to the Leads page
3. Open the Filter Settings modal (usually accessible from the filter icon)
4. Toggle some pipeline stages on/off
5. **Completely close and restart the app**
6. Check that your filter settings are preserved

### Step 4: Verify in Supabase (Optional)
To confirm settings are being saved:
1. Go to your Supabase dashboard
2. Navigate to **Table Editor**
3. Select the `user_settings` table
4. You should see a row for your user with `lead_filter_settings` populated

## How It Works

### On App Initialization
```
User logs in
  ↓
Load settings from Supabase (cloud)
  ↓
Cache to local SQLite (for offline)
  ↓
Apply settings to UI
```

### When User Changes Settings
```
User toggles a pipeline stage
  ↓
Update in-memory state
  ↓
Save to Supabase (cloud) ← Primary
  ↓
Save to SQLite (local) ← Backup
  ↓
If Supabase fails, still saves locally
```

### Offline Behavior
- Settings load from local SQLite if offline
- Changes save to local SQLite immediately
- Sync to Supabase when connection restored

## Data Structure

The `lead_filter_settings` JSONB column stores a structure like:
```json
{
  "new": true,
  "contacted": true,
  "appointment_set": true,
  "appointment_held": true,
  "negotiation": true,
  "signed_deal": true,
  "site_survey_scheduled": true,
  "site_survey_completed": true,
  "change_order_required": true,
  "submitted_for_permits": true,
  "permits_approved": true,
  "install_scheduled": true,
  "installed": true,
  "cancelled_appointment": false,
  "held_not_interested": false,
  "unqualified": false,
  "cancelled_contract": false
}
```

Each key represents a pipeline stage, and the boolean value indicates whether it's visible in the filter.

## Troubleshooting

### Settings Still Not Persisting
1. Check that the SQL script ran successfully in Supabase
2. Verify the `user_settings` table exists in your database
3. Check the app logs for any error messages containing "LeadFilterStore" or "SupabaseService"
4. Ensure your user is properly authenticated (has a valid user_id)

### RLS Policy Errors
If you see errors like "new row violates row-level security policy":
1. Re-run the SQL script to ensure RLS policies are correct
2. Verify you're logged in with the correct user
3. Check that `auth.uid()` matches your user's ID

### Settings Loading as Default Every Time
This indicates the load is failing. Check:
1. Network connection to Supabase
2. Console logs for specific error messages
3. That the `user_settings` table has data for your user_id

## Migration from Old System

If you have existing users with filter preferences stored only locally:
- Their settings will continue to work from local storage
- First time they change a setting after this update, it will sync to Supabase
- On next app restart, settings will load from Supabase

## Benefits

✅ **Cross-Device Sync** - Settings persist across all devices logged in with same account
✅ **Survives Reinstalls** - App reinstalls won't lose user preferences
✅ **Offline Support** - Works offline with local cache
✅ **Automatic Backup** - Dual storage ensures data isn't lost
✅ **Better UX** - Users don't have to reconfigure filters after every restart

