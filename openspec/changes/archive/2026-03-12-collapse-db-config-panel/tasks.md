## 1. Setup and Investigation

- [x] 1.1 Locate the database configuration panel component in step 1
- [x] 1.2 Identify existing UI patterns for collapsible panels in the codebase
- [x] 1.3 Review how database configuration is currently stored and retrieved

## 2. State Management Implementation

- [x] 2.1 Add collapsed state variable (useState) to the database configuration panel component
- [x] 2.2 Implement function to check if database configuration exists
- [x] 2.3 Set initial collapsed state based on configuration existence (collapsed if config exists, expanded if not)
- [x] 2.4 Add state persistence during session (useRef or component state that persists during navigation)

## 3. UI Components

- [x] 3.1 Add collapse/expand button with appropriate icon (chevron or arrow) to panel header
- [x] 3.2 Create visual indicator component for configuration status ("Configurado" badge when collapsed and config exists)
- [x] 3.3 Implement conditional rendering of panel content based on collapsed state
- [x] 3.4 Style the collapsed panel header to be compact and informative

## 4. Integration and Testing

- [x] 4.1 Wire up the collapse/expand button to toggle the collapsed state
- [x] 4.2 Ensure configuration form fields are hidden when collapsed and visible when expanded
- [x] 4.3 Test initial state: panel should be expanded when no configuration exists
- [x] 4.4 Test initial state: panel should be collapsed when configuration exists
- [x] 4.5 Test toggle functionality: clicking button collapses and expands panel
- [x] 4.6 Test status indicator: shows "Configurado" when collapsed with saved config

## 5. Verification and Cleanup

- [x] 5.1 Verify existing tests still pass
- [x] 5.2 Add any necessary test coverage for new functionality
- [x] 5.3 Review for consistent styling with other collapsible panels (if any exist)
- [x] 5.4 Ensure accessibility (keyboard navigation, ARIA labels if needed)
