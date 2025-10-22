# Overview Tab Restoration Guide

## Overview
The Overview tab (Dashboard) has been temporarily hidden from the bottom navigation to simplify the interface. The code is preserved and can be easily restored.

## What Was Changed
- The Dashboard tab is commented out in `src/navigation/AppNavigator.tsx`
- The tab bar icon logic for Dashboard is commented out
- The default route is now set to "KPI" instead of "Dashboard"

## How to Restore the Overview Tab

### Step 1: Uncomment the Dashboard Tab
In `src/navigation/AppNavigator.tsx`, find this section around line 117-122:

```typescript
{/* Overview tab temporarily hidden - can be restored by uncommenting below */}
{/* <Tab.Screen 
  name="Dashboard" 
  component={DashboardScreen}
  options={{ title: 'Overview' }}
/> */}
```

Change it to:

```typescript
<Tab.Screen 
  name="Dashboard" 
  component={DashboardScreen}
  options={{ title: 'Overview' }}
/>
```

### Step 2: Restore the Icon Logic
In the same file, find the tabBarIcon function around line 81-84:

```typescript
// Dashboard tab is temporarily hidden
// if (route.name === 'Dashboard') {
//   iconName = focused ? 'grid' : 'grid-outline';
// } else 
```

Change it to:

```typescript
if (route.name === 'Dashboard') {
  iconName = focused ? 'grid' : 'grid-outline';
} else 
```

### Step 3: Set Dashboard as Default (Optional)
If you want Dashboard to be the default tab again, change:

```typescript
initialRouteName="KPI"
```

to:

```typescript
initialRouteName="Dashboard"
```

## Files Modified
- `src/navigation/AppNavigator.tsx` - Main navigation configuration

## Files Preserved
- `src/screens/DashboardScreen.tsx` - The Overview screen component (unchanged)
- All Dashboard functionality remains intact

## Notes
- The Dashboard screen component (`DashboardScreen.tsx`) was not modified
- All Overview functionality is preserved
- The tab can be restored in under 2 minutes by uncommenting the code
- No data or functionality is lost
