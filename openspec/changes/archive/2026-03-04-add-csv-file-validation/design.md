## Context

Step1Upload.jsx currently has inconsistent validation - drag-and-drop validates file types, but file picker and upload button don't.

## Goals / Non-Goals

**Goals:**
- Add consistent file validation across all upload methods
- Show clear error messages for invalid file types

**Non-Goals:**
- Changing the accept attribute (already correct)
- Adding file size validation (out of scope)

## Decisions

### Decision 1: Validation approach

We add validation in two places:
1. `handleFileSelect`: Reject invalid files immediately when selected via picker
2. `handleUpload`: Add safety net validation before calling onFileUpload

This provides defense in depth - invalid files are rejected at multiple points.

### Decision 2: Error handling

We use a local state variable to track file selection errors, similar to how the component handles other validation errors.
