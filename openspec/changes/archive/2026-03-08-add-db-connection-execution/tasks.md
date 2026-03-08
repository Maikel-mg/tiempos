## 1. Backend API

- [x] 1.1 Create Express server (server.js) if not exists
- [x] 1.2 Add `/api/test-connection` endpoint
- [x] 1.3 Add `/api/execute-sql` endpoint
- [x] 1.4 Configure CORS for frontend origin

## 2. Frontend Connection Config

- [x] 2.1 Add connection form in Step1 or as separate section
- [x] 2.2 Add connection state management in App.jsx
- [x] 2.3 Implement localStorage encryption/decryption for credentials
- [x] 2.4 Add "Test Connection" button and result display

## 3. SQL Preview Modal

- [x] 3.1 Create SQLPreviewModal component
- [x] 3.2 Integrate with Step2 "Generate SQL" button (add Preview option)
- [x] 3.3 Integrate with Step3 SQL display

## 4. Execution Flow

- [x] 4.1 Add "Execute SQL" button in preview modal
- [x] 4.2 Call backend `/api/execute-sql` endpoint
- [x] 4.3 Show loading state during execution
- [x] 4.4 Display success/error results

## 5. Integration with Existing Features

- [x] 5.1 Wire up Step2 individual task SQL to execution
- [x] 5.2 Wire up Step3 batch SQL to execution
- [x] 5.3 Ensure config is passed between steps

## 6. Testing

- [x] 6.1 Test connection with valid credentials
- [x] 6.2 Test connection with invalid credentials
- [x] 6.3 Test SQL execution and verify data in database
- [x] 6.4 Test error handling for SQL errors
