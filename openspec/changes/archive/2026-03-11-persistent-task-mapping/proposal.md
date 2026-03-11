## Why

The web UI currently requires users to manually map task names to process IDs every time they upload a CSV file. This repetitive process wastes time and creates friction in the daily workflow, as the same task-to-process mappings must be entered repeatedly across browser sessions.

## What Changes

- Implement persistent storage of task-to-process ID mappings in the web UI using browser localStorage
- Add automatic task ID suggestions based on previously mapped tasks
- Create a learning system that improves suggestions over time
- Maintain manual override capability for edge cases
- Ensure mappings persist between browser restarts and sessions

## Capabilities

### New Capabilities
- `task-mapping-persistence`: Store and retrieve task-to-process ID mappings across browser sessions using localStorage
- `smart-task-suggestions`: Provide intelligent suggestions for process IDs based on historical task mappings and task name similarity

### Modified Capabilities

## Impact

- **Web UI Components**: `Step2Tasks.jsx`, `useWizard.js` hook
- **Storage**: Browser localStorage for persistence
- **User Experience**: Reduced manual data entry, improved workflow efficiency
- **Data Flow**: Task mappings will be loaded from/saved to localStorage instead of being reset on each session