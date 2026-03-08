## Why

The task table in Step 2 of the wizard is too narrow and cramped, making it difficult for users to read task names, dates, and other column content comfortably. This impacts user experience when assigning IDs to tasks.

## What Changes

- Increase the minimum width of the task name column in Step2Tasks.jsx
- Adjust column widths to better utilize available screen space
- Improve text truncation behavior for better readability

## Capabilities

### New Capabilities
(None - this is a layout enhancement to existing functionality)

### Modified Capabilities
- `web-import-wizard`: Improving the existing task table layout requirement to provide better readability

## Impact

- `web-ui/src/components/Step2Tasks.jsx`: Adjust table column widths and layout styles
