# Period Granularity Implementation

This document describes the complete implementation of period granularity for the Daily Input screen, enabling users to select Day/Week/Month/Year periods while preventing double-counting.

## Overview

The implementation provides:
- **Period Selection**: Day | Week | Month | Year segmented control
- **Period-Aware Picker**: Different picker modes based on selected period
- **Anti-Double-Counting**: Prevents duplicate data when switching between granularities
- **Smart Aggregation**: Prefers exact period rows, falls back to daily aggregation
- **Unified API**: Single endpoint handles all period types

## Architecture

### Database Schema (`inputs-log-schema.sql`)

The core is the `inputs_log` table with:
- `period_type` enum: 'day', 'week', 'month', 'year'
- `period_start` and `period_end` dates
- Unique constraint on `(user_id, period_type, period_start)`
- All metrics as integer/numeric fields

### Views for Smart Aggregation

- `v_inputs_day`: Direct passthrough for daily data
- `v_inputs_week`: Prefers exact week rows, aggregates daily when none exist
- `v_inputs_month`: Same logic for months
- `v_inputs_year`: Same logic for years

### Backend API (`backend/routes/inputs.js`)

**POST /api/inputs/upsert**
- Validates period bounds
- Upserts with conflict resolution
- Enforces uniqueness by `(user_id, period_type, period_start)`

**GET /api/inputs**
- For day: returns exact row or zeros
- For week/month/year: uses appropriate view
- Falls back to daily aggregation when no exact period row exists

**DELETE /api/inputs/:period_type/:period_start**
- Removes specific period entries

### Frontend Components

**PeriodSelector** (`src/components/PeriodSelector.tsx`)
- Segmented control for period selection
- Period-aware date picker
- Dynamic header text based on selection

**useInputsForPeriod** (`src/hooks/useInputsForPeriod.ts`)
- React hook for period data management
- Handles fetching, saving, and deleting
- Integrates with Supabase views

## Implementation Steps

### 1. Database Setup

```sql
-- Run the schema file
\i inputs-log-schema.sql
```

### 2. Backend Integration

```javascript
// Add to plaidServer.js
const inputsRouter = require('./routes/inputs');
app.use('/api/inputs', inputsRouter);
```

### 3. Frontend Integration

```typescript
// Replace existing DailyInputScreen with new implementation
import { PeriodSelector } from '../components/PeriodSelector';
import { useInputsForPeriod } from '../hooks/useInputsForPeriod';
```

### 4. Data Migration

```sql
-- Run migration script
\i migrate-to-inputs-log.sql
```

## Key Features

### Anti-Double-Counting Logic

1. **Unique Constraint**: Database prevents duplicate `(user, period_type, period_start)`
2. **View Preference**: Views prefer exact period rows over daily aggregation
3. **Upsert Behavior**: Saves replace existing entries, don't create duplicates

### Period Bounds Calculation

- **Day**: `start = end = selected date`
- **Week**: `start = Monday`, `end = Sunday` (weekStartsOn: 1)
- **Month**: `start = 1st of month`, `end = last day of month`
- **Year**: `start = Jan 1`, `end = Dec 31`

### Smart Aggregation

When viewing a period without an exact row:
1. Query daily rows within period bounds
2. Sum all metrics
3. Return aggregated totals

When an exact period row exists:
1. Return exact row values
2. Ignore daily rows (prevents double-counting)

## Testing

### Manual Testing

1. **Create Daily Data**: Add 3 daily entries in the same week
2. **Verify Week View**: Should show sum of daily entries
3. **Create Week Entry**: Save a week entry for the same period
4. **Verify Preference**: Week view should show week entry, not daily sum
5. **Delete Week Entry**: Remove the week entry
6. **Verify Fallback**: Week view should return to daily aggregation

### Automated Testing

```bash
# Set test user ID
export TEST_USER_ID="your-user-id"

# Run test suite
node test-period-granularity.js
```

## API Examples

### Save Day Entry
```javascript
POST /api/inputs/upsert
{
  "period_type": "day",
  "period_start": "2025-01-20",
  "period_end": "2025-01-20",
  "metrics": {
    "appointments_set": 5,
    "door_knocks": 10,
    "hours_worked": 8.5
  }
}
```

### Save Week Entry
```javascript
POST /api/inputs/upsert
{
  "period_type": "week",
  "period_start": "2025-01-20",
  "period_end": "2025-01-26",
  "metrics": {
    "appointments_set": 25,
    "door_knocks": 50,
    "hours_worked": 40.0
  }
}
```

### Get Period Data
```javascript
GET /api/inputs?period_type=week&period_start=2025-01-20
```

## Migration Strategy

### Phase 1: Setup
1. Create new `inputs_log` table
2. Deploy backend API
3. Deploy frontend components

### Phase 2: Migration
1. Run migration script
2. Verify data parity
3. Test both old and new systems

### Phase 3: Cutover
1. Make old table read-only
2. Monitor for issues
3. Drop old table after grace period

## Error Handling

### Common Issues

1. **Duplicate Key Error**: User tried to save same period twice
   - Solution: Upsert handles this automatically

2. **Invalid Period Bounds**: End date before start date
   - Solution: API validates and returns 400 error

3. **Missing Data**: No exact period row and no daily data
   - Solution: Returns zero-filled structure

### Validation Rules

- Period bounds: `end >= start`
- Period types: Must be 'day', 'week', 'month', or 'year'
- User authentication: Required for all operations
- Data types: Integers for counts, numeric for hours

## Performance Considerations

### Database Indexes
- Primary key on `(user_id, period_type, period_start)`
- Indexes on `period_start` for range queries
- Indexes on `user_id` for user-specific queries

### View Performance
- Views use CTEs for efficient aggregation
- `NOT EXISTS` clauses prevent unnecessary joins
- Materialized views could be added for heavy usage

### Caching Strategy
- Frontend caches period data
- Backend could cache aggregated views
- Consider Redis for high-traffic scenarios

## Security

### Row Level Security (RLS)
- Users can only access their own data
- Policies enforce `auth.uid() = user_id`
- Service role bypasses RLS for admin operations

### Input Validation
- API validates all inputs
- SQL injection prevented by parameterized queries
- XSS prevented by proper escaping

## Monitoring

### Key Metrics
- API response times
- Database query performance
- Error rates by endpoint
- User adoption of different periods

### Alerts
- High error rates
- Slow response times
- Data integrity issues
- Migration failures

## Future Enhancements

### Potential Improvements
1. **Quarterly Periods**: Add 'quarter' period type
2. **Custom Periods**: Allow user-defined periods
3. **Bulk Operations**: Batch save multiple periods
4. **Analytics**: Pre-computed aggregations
5. **Export**: Period-based data export

### Scalability
1. **Partitioning**: Partition by user_id or date
2. **Archiving**: Move old data to archive tables
3. **Sharding**: Distribute across multiple databases
4. **CDN**: Cache static period data

## Troubleshooting

### Common Problems

**Q: Week view shows wrong totals**
A: Check if exact week row exists. If yes, it takes precedence over daily aggregation.

**Q: Can't save period data**
A: Verify user authentication and period bounds validation.

**Q: Migration failed**
A: Check for data type mismatches and foreign key constraints.

**Q: Performance issues**
A: Review database indexes and query patterns.

### Debug Commands

```sql
-- Check period data
SELECT * FROM inputs_log WHERE user_id = 'your-user-id' ORDER BY period_start;

-- Check view results
SELECT * FROM v_inputs_week WHERE user_id = 'your-user-id';

-- Verify constraints
SELECT * FROM information_schema.table_constraints WHERE table_name = 'inputs_log';
```

## Support

For issues or questions:
1. Check this documentation
2. Review the test suite
3. Examine database logs
4. Contact the development team

---

*This implementation provides a robust, scalable solution for period granularity while maintaining data integrity and preventing double-counting issues.*
