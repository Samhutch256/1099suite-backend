# Leads Filter System

This document describes the comprehensive filter system implemented for the leads page in the 1099Suite application.

## Overview

The leads filter system provides advanced filtering capabilities with server-side query optimization, real-time KPI updates, and persistent filter state management.

## Components

### 1. `useLeadsFilters` Hook (`src/hooks/useLeadsFilters.ts`)

Centralized state management for leads filters with localStorage persistence.

**Features:**
- Filter state management with TypeScript types
- localStorage persistence (`leads_filters_v1`)
- URL query string persistence (planned)
- Active filter detection and counting
- Reset functionality

**Filter Types:**
- Date range (preset + custom)
- Date field selection
- Pipeline stages (multi-select)
- Status (active/inactive/any)
- Sources (multi-select)
- Tags (multi-select with type-ahead)
- Ownership (owner/assignee)
- Revenue range (min/max with type selection)
- Follow-up status

### 2. `LeadsFilterSheet` Component (`src/components/LeadsFilterSheet.tsx`)

Bottom sheet modal for filter configuration with sections and sticky footer actions.

**UI Sections:**
1. **Date Range**
   - Preset options: Today, Week, Month, Quarter, Year, All Time, Custom
   - Date field selector: Created, Updated, Appointment Set, etc.
   - Custom date range inputs

2. **Pipeline & Status**
   - Stage multi-select pills
   - Active/Inactive toggle buttons

3. **Source & Tags**
   - Source multi-select
   - Tags with type-ahead input

4. **Ownership**
   - Owner dropdown (defaults to current user)
   - Assignee dropdown (optional)

5. **Revenue**
   - Revenue type selector
   - Min/Max range inputs

6. **Follow-Up**
   - Toggle: Any, Has follow-up due, No follow-up set

**Features:**
- Responsive design (mobile sheet, desktop drawer)
- Clear all functionality
- Apply/Reset actions
- Active filter indicators

### 3. `leadsFilterService` (`src/services/leadsFilterService.ts`)

Server-side query building and data fetching with Supabase integration.

**Features:**
- Dynamic query building based on filters
- Pagination support
- Revenue breakdown calculation
- Error handling
- Performance optimization

**Query Optimization:**
- Server-side filtering for most criteria
- Client-side filtering for complex logic (follow-ups)
- Efficient date range handling
- Multi-select array operations

### 4. Date Range Utilities (`src/utils/dateRangeUtils.ts`)

Utility functions for date range resolution and formatting.

**Functions:**
- `resolveRange()`: Convert presets to ISO date ranges
- `formatDateRange()`: Human-readable range formatting
- `getDateFieldMapping()`: Database field mapping

## Integration

### CRMScreen Updates

The main leads screen has been updated to integrate the filter system:

1. **Filter Button**: Added next to search bar with active filter count
2. **Revenue Display**: Updates based on filtered data
3. **Leads List**: Shows filtered results with server-side optimization
4. **Search Integration**: Combines with filters for comprehensive filtering

### State Management

- Filters persist across navigation
- Real-time updates when filters change
- Fallback to client-side filtering when no server filters active

## Database Schema Requirements

The filter system works with the existing leads table structure. Some features may require additional fields:

- `tags` field (array) for tag filtering
- `assignee_id` field for assignee filtering
- Enhanced revenue fields for better revenue filtering

## Usage

### Basic Filtering

```typescript
import { useLeadsFilters } from '../hooks/useLeadsFilters';

const { filters, updateFilter, hasActiveFilters } = useLeadsFilters();

// Update a filter
updateFilter('rangePreset', 'week');

// Check if filters are active
if (hasActiveFilters()) {
  // Show filtered results
}
```

### Server-Side Filtering

```typescript
import { fetchFilteredLeads } from '../services/leadsFilterService';

const result = await fetchFilteredLeads(userId, filters, searchQuery);
console.log(result.leads, result.revenueBreakdown);
```

### Filter Sheet Integration

```typescript
import { LeadsFilterSheet } from '../components/LeadsFilterSheet';

<LeadsFilterSheet
  visible={showFilterSheet}
  onClose={() => setShowFilterSheet(false)}
  onApply={handleApplyFilters}
/>
```

## Performance Considerations

1. **Pagination**: Default 25 items per page, configurable
2. **Debounced Search**: 300ms debounce on search input
3. **Lazy Loading**: Avatars and badges loaded on demand
4. **Query Optimization**: Server-side filtering reduces data transfer
5. **Caching**: Filter state persisted in localStorage

## Testing

Unit tests are provided for date range utilities:

```bash
npm test src/utils/dateRangeUtils.test.ts
```

## Future Enhancements

1. **URL Persistence**: Shareable filter URLs
2. **Saved Filters**: User-defined filter presets
3. **Advanced Search**: Full-text search capabilities
4. **Export**: Filtered data export functionality
5. **Analytics**: Filter usage tracking

## Migration Notes

The filter system is designed to work with existing data structures. No database migrations are required for basic functionality. Advanced features may require schema updates as noted above.
