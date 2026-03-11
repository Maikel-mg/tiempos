## 1. Setup and Constants

- [x] 1.1 Add STORAGE_KEY constant at top of Step3Preview.jsx
- [x] 1.2 Add DEFAULT_HIDDEN_COLUMNS constant (already exists, verify)

## 2. Load Preferences from localStorage

- [x] 2.1 Create loadHiddenColumnsFromStorage function with try-catch
- [x] 2.2 Implement JSON parsing with fallback to defaults on error
- [x] 2.3 Add header validation to filter non-existent columns
- [x] 2.4 Add useEffect to load preferences when allHeaders is available

## 3. Save Preferences to localStorage

- [x] 3.1 Create saveHiddenColumnsToStorage function with try-catch
- [x] 3.2 Add useEffect to save hiddenColumns when it changes
- [x] 3.3 Ensure save only happens when csvData is loaded (not initial render)

## 4. Integration and Testing

- [x] 4.1 Verify toggleColumn function triggers save
- [x] 4.2 Verify showAllColumns triggers save
- [x] 4.3 Verify hideAllColumns triggers save
- [x] 4.4 Test persistence after page reload
- [x] 4.5 Test fallback when localStorage is empty
- [x] 4.6 Test fallback when stored columns don't exist in CSV
- [x] 4.7 Test global preferences work across different CSV files