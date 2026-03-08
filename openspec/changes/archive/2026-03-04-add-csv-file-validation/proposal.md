## Why

Currently, the file upload in Step1 only validates file extensions in the drag-and-drop handler but lacks validation in the file select handler and upload button. Users could potentially select invalid files through the file picker, and the upload proceeds without proper validation.

## What Changes

- Add JavaScript validation in `handleFileSelect` to reject non-CSV/TXT files
- Add validation in `handleUpload` as a safety net before processing
- Show error message when invalid file type is selected

## Capabilities

### New Capabilities
- `csv-file-validation`: Validate that uploaded files are CSV or TXT format before processing

### Modified Capabilities
- None

## Impact

- `web-ui/src/components/Step1Upload.jsx`: Add validation logic to handleFileSelect and handleUpload
