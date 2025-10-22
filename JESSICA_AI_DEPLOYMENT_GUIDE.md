# 🚀 Jessica AI Deployment Guide

## Overview
This guide provides step-by-step instructions to deploy the Jessica AI fixes and ensure full functionality.

## Prerequisites
- Access to Supabase dashboard
- Access to Railway backend deployment
- OpenAI API key configured

## Step 1: Database Migration

### 1.1 Run Sub-Input Fields Migration
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `add-sub-input-fields-migration.sql`
4. Execute the migration
5. Verify the migration was successful

```sql
-- Check if fields were added successfully
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'daily_inputs' 
AND table_schema = 'public'
AND column_name LIKE '%_door_knocks' 
   OR column_name LIKE '%_tags_put'
   OR column_name LIKE '%_calls_made'
   OR column_name LIKE '%_referrals'
   OR column_name LIKE '%_inbound'
ORDER BY column_name;
```

### 1.2 Verify Migration
Expected result should show 25 new columns:
- `outreach_door_knocks`, `outreach_tags_put`, `outreach_calls_made`, `outreach_referrals`, `outreach_inbound`
- `appointments_set_door_knocks`, `appointments_set_tags_put`, `appointments_set_calls_made`, `appointments_set_referrals`, `appointments_set_inbound`
- `appointments_held_door_knocks`, `appointments_held_tags_put`, `appointments_held_calls_made`, `appointments_held_referrals`, `appointments_held_inbound`
- `deals_closed_door_knocks`, `deals_closed_tags_put`, `deals_closed_calls_made`, `deals_closed_referrals`, `deals_closed_inbound`
- `accounts_serviced_door_knocks`, `accounts_serviced_tags_put`, `accounts_serviced_calls_made`, `accounts_serviced_referrals`, `accounts_serviced_inbound`

## Step 2: Backend Deployment

### 2.1 Deploy to Railway
1. Ensure your Railway project is connected to the repository
2. The updated `backend/plaidServer.js` should be automatically deployed
3. If not, trigger a manual deployment

### 2.2 Verify Backend Deployment
Test the backend endpoints:

```bash
# Test health endpoint
curl https://1099suite-backend-production.up.railway.app/api/health

# Test OpenAI endpoint
curl https://1099suite-backend-production.up.railway.app/api/test-openai

# Test Jessica endpoint
curl -X POST https://1099suite-backend-production.up.railway.app/api/jessica-chat-message \
  -H "Content-Type: application/json" \
  -d '{"message": "I knocked 25 doors", "userId": "test", "userData": {}}'
```

### 2.3 Expected Responses
- Health endpoint: `{"status": "ok", "message": "Backend is running!"}`
- OpenAI endpoint: `{"success": true, "response": "Hello, OpenAI is working!"}`
- Jessica endpoint: Should return extracted data with `shouldSave: true`

## Step 3: Frontend Deployment

### 3.1 Update Frontend
The frontend changes are already in the codebase:
- `src/services/jessicaInputService.ts` - Enhanced data handling
- `src/screens/JessicaChatScreen.tsx` - Improved response processing

### 3.2 Deploy Frontend
1. Build and deploy the React Native app
2. Ensure the app is using the latest backend URL

## Step 4: Testing

### 4.1 Run Comprehensive Tests
Execute the test suite:

```bash
node test-jessica-functionality.js
```

### 4.2 Manual Testing
Test these scenarios in the app:

1. **Simple Input**: "I knocked 25 doors"
2. **Complex Input**: "I knocked 30 doors, set 5 appointments from door knocks"
3. **Multi-line Input**: 
   ```
   Today's activities:
   • Knocked 20 doors
   • Set 3 appointments from door knocks
   • Held 1 appointment from referrals
   ```
4. **Detailed Breakdown**: "I knocked 25 doors for outreach, set 4 appointments from door knocks"

### 4.3 Expected Behavior
- Jessica should extract and save all sub-input data
- Data should appear in the KPI dashboard
- No data loss or corruption
- Proper error handling

## Step 5: Verification

### 5.1 Check Database
Verify data is being saved correctly:

```sql
-- Check recent daily inputs
SELECT * FROM daily_inputs 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC 
LIMIT 5;
```

### 5.2 Check Frontend
1. Open the app
2. Navigate to Jessica chat
3. Test various input types
4. Verify data appears in KPI dashboard
5. Check that sub-input fields are populated

## Troubleshooting

### Issue: Jessica not extracting data
**Solution**: 
1. Check OpenAI API key in backend environment variables
2. Verify backend deployment is complete
3. Check backend logs for errors

### Issue: Database errors
**Solution**:
1. Ensure migration was run successfully
2. Check Supabase logs for errors
3. Verify table structure matches expected schema

### Issue: Frontend not syncing
**Solution**:
1. Check network connectivity
2. Verify backend URL is correct
3. Check for JavaScript errors in console

## Monitoring

### 5.1 Backend Logs
Monitor Railway logs for:
- Jessica AI processing errors
- Database connection issues
- OpenAI API errors

### 5.2 Frontend Logs
Monitor app logs for:
- Network request failures
- Data sync errors
- User interaction issues

### 5.3 Database Monitoring
Monitor Supabase for:
- Query performance
- Storage usage
- Connection limits

## Success Criteria

✅ **Jessica AI is fully functional when:**
1. All test cases pass
2. Data is properly extracted and saved
3. Sub-input fields are populated
4. No data loss occurs
5. User experience is smooth
6. Error handling works correctly

## Rollback Plan

If issues occur:
1. Revert backend to previous version
2. Rollback database migration if needed
3. Restore frontend to previous state
4. Test functionality before proceeding

## Support

For issues during deployment:
1. Check the diagnostic report (`JESSICA_AI_DIAGNOSTIC_REPORT.md`)
2. Review backend logs
3. Test individual components
4. Contact development team if needed

---

**Status**: Ready for deployment
**Last Updated**: December 2024
**Version**: 1.0 