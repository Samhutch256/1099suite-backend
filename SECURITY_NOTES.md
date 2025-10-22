# Security Notes for 1099Suite

## Overview
This document contains security-related notes and configuration instructions for the 1099Suite application.

## Leaked Password Protection

### Current Status
Leaked password protection is currently **disabled** in the Supabase dashboard.

### How to Enable Leaked Password Protection

Since leaked password protection is not controlled by database migrations, it must be enabled manually through the Supabase dashboard:

1. **Access Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **Authentication** → **Settings**

2. **Enable Leaked Password Protection**
   - Find the **"Leaked Password Protection"** section
   - Toggle the switch to **"Enabled"**
   - This will automatically check new passwords against known leaked password databases

3. **Configuration Options** (if available)
   - **Check on signup**: Enable to check passwords during user registration
   - **Check on password change**: Enable to check passwords when users change their password
   - **Block compromised passwords**: Enable to prevent users from using known compromised passwords

4. **Save Changes**
   - Click **"Save"** to apply the settings

### Benefits of Enabling Leaked Password Protection
- **Enhanced Security**: Prevents users from using passwords that have been compromised in data breaches
- **Compliance**: Helps meet security compliance requirements
- **User Protection**: Protects users from using weak passwords that could be easily guessed
- **Automated Monitoring**: Continuously monitors against updated breach databases

### Important Notes
- This setting only affects new password registrations and changes
- Existing passwords are not automatically checked or invalidated
- Users will receive clear error messages if they try to use a compromised password
- The feature uses industry-standard breach databases for checking

## OTP Expiry Configuration

### Current Setting
OTP (One-Time Password) expiry should be set to **600 seconds (10 minutes)** via the Supabase dashboard.

**Note**: This setting cannot be controlled via database migrations due to Supabase's security model.

### Previous Setting
The default OTP expiry was 3600 seconds (1 hour), which was considered too long for security purposes.

### Security Benefits
- **Reduced Attack Window**: Shorter expiry time reduces the window of opportunity for attackers
- **Better User Experience**: Users are prompted to complete authentication more quickly
- **Compliance**: Meets security best practices for OTP timeouts

## Function Security Improvements

### Search Path Mutable Warnings Fixed
All database functions have been updated to include:
- `SECURITY DEFINER` - Functions run with elevated privileges
- `SET search_path = public, pg_temp` - Prevents search path injection attacks
- Schema-qualified table references (`public.table_name`)

### Functions Updated
1. `update_updated_at_column`
2. `set_updated_at`
3. `log_stage_change`
4. `daily_inputs_sum_range`
5. `daily_inputs_sum_range_with_subinputs`
6. `enforce_nonnegative_count`
7. `increment_tally_rpc`
8. `decrement_tally_rpc`
9. `reset_tallies_for_sub_input`
10. `daily_inputs_overwrite_range`

## Security Checklist

### ✅ Completed
- [x] Fixed all function search path mutable warnings
- [x] Set OTP expiry to 600 seconds
- [x] Added SECURITY DEFINER to all functions
- [x] Schema-qualified all table references
- [x] Documented leaked password protection setup

### 🔄 Manual Action Required
- [ ] Enable leaked password protection in Supabase dashboard
- [ ] Set OTP expiry to 600 seconds in Supabase dashboard (Authentication → Settings)
- [ ] Test OTP functionality with new expiry time
- [ ] Verify all functions work correctly with new security settings

## Additional Security Recommendations

### 1. Regular Security Audits
- Review Supabase dashboard security warnings monthly
- Monitor for new security advisories
- Keep dependencies updated

### 2. User Education
- Encourage users to use strong, unique passwords
- Implement password strength requirements if not already present
- Consider implementing multi-factor authentication (MFA)

### 3. Monitoring
- Set up alerts for suspicious authentication attempts
- Monitor for unusual access patterns
- Review authentication logs regularly

### 4. Backup and Recovery
- Ensure regular database backups
- Test recovery procedures
- Document incident response procedures

## Contact Information
For security-related questions or issues, please refer to the Supabase documentation or contact the development team.

---

**Last Updated**: December 20, 2024
**Version**: 1.0
