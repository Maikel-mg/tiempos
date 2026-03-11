## 1. Setup Persistence in useWizard.js

- [x] 1.1 `localStorage` Create utility functions for interaction (load/save mappings)
- [x] 1.2 Initialize the wizard state with mappings from `localStorage` on hook startup
- [x] 1.3 Add a function to update the persistent store when a mapping is confirmed

## 2. Implement Matching and Suggestions Logic

- [x] 2.1 Develop an exact task name matching function
- [x] 2.2 Develop a sanitized task name matching function (trim/lowercase)
- [x] 2.3 Create a suggestion provider that combines exact and sanitized matching

## 3. Update Step2Tasks Component UI

- [x] 3.1 Update the task mapping table to indicate when a process ID is a "suggestion"
- [x] 3.2 Ensure manually entered IDs correctly update the persistent store
- [x] 3.3 Add visual feedback (e.g., a "Persisted" badge or icon) when a task ID is successfully saved

## 4. Verification and Integration

- [ ] 4.1 Test persistence by refreshing the browser after mapping several tasks
- [ ] 4.2 Test suggestion logic by uploading a CSV with minor name variations (e.g., "TASK" vs "task ")
- [ ] 4.3 Verify that manual overrides correctly update the stored mapping for future sessions
