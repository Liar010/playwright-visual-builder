# PVB REST API Reference

## Overview

PVB (Playwright Visual Builder) provides REST API endpoints for executing tests programmatically without using the GUI. You can submit test definitions in JSON or YAML format and receive execution results.

## Base URL

```
http://localhost:3002/api
```

## Endpoints

### 1. Execute Test (JSON)

Execute a test by posting JSON directly.

**Endpoint:** `POST /test/execute`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "test": {
    "name": "Login Test",
    "config": {
      "headless": true,
      "viewport": { "width": 1280, "height": 720 },
      "timeout": 30000,
      "nodeDelay": 0,
      "debug": false
    },
    "steps": [
      { "navigate": "https://example.com" },
      { "click": "#login-button" },
      { "input": { "selector": "#email", "value": "test@example.com" }},
      { "input": { "selector": "#password", "value": "password123" }},
      { "click": "button[type=submit]" },
      { "wait": ".dashboard" },
      { "screenshot": "dashboard" }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "executionId": "exec-xxx-xxx",
  "duration": 5432,
  "result": {
    "passed": true,
    "total": 7,
    "passedCount": 7,
    "failed": 0,
    "skipped": 0,
    "steps": [...],
    "screenshots": [...],
    "errors": []
  }
}
```

### 2. Execute Test (File Upload)

Execute a test by uploading a JSON or YAML file.

**Endpoint:** `POST /test/execute/file`

**Headers:**
```
Content-Type: multipart/form-data
```

**Supported File Types:**
- `.json`
- `.yaml`
- `.yml`

**Example with curl:**
```bash
curl -X POST http://localhost:3002/api/test/execute/file \
  -F "file=@test.json"
```

**Example with YAML file:**
```yaml
test:
  name: Login Test
  config:
    headless: false
    viewport:
      width: 1920
      height: 1080
  steps:
    - navigate: https://example.com
    - click: "#login"
    - input:
        selector: "#email"
        value: test@example.com
    - input:
        selector: "#password"
        value: password123
    - click: button[type=submit]
    - wait: .dashboard
    - screenshot: dashboard
```

### 3. Validate Test Definition

Validate a test definition without executing it.

**Endpoint:** `POST /test/validate`

**Request Body:** Same as Execute Test

**Response:**
```json
{
  "success": true,
  "message": "Test definition is valid",
  "stats": {
    "totalSteps": 7,
    "totalNodes": 9,
    "totalEdges": 8
  }
}
```

### 4. Get Step Reference

Get reference documentation for all available step types.

**Endpoint:** `GET /test/reference`

**Response:**
```json
{
  "version": "1.0.0",
  "stepTypes": [
    {
      "type": "navigate",
      "description": "Navigate to a URL",
      "schema": { "navigate": "string" },
      "examples": [...]
    },
    ...
  ]
}
```

## Step Types

### Navigation & Interaction

#### navigate
Navigate to a URL.
```json
{ "navigate": "https://example.com" }
```

#### click
Click an element.
```json
{ "click": "#submit-button" }
```

#### input
Input text into a field.
```json
{ "input": { "selector": "#email", "value": "test@example.com" }}
```

#### hover
Hover over an element.
```json
{ "hover": ".menu-item" }
```

#### scroll
Scroll the page or to an element.
```json
{ "scroll": { "direction": "down", "amount": 500 }}
{ "scroll": { "selector": "#footer" }}
```

### Form Controls

#### select
Select an option from a dropdown.
```json
{ "select": { "selector": "#country", "value": "JP" }}
```

#### check
Check or uncheck a checkbox.
```json
{ "check": "#agree-terms" }
{ "check": "#newsletter", "uncheck": true }
```

#### radio
Select a radio button.
```json
{ "radio": { "name": "plan", "value": "premium" }}
```

### Wait & Screenshot

#### wait
Wait for time or element.
```json
{ "wait": 2000 }
{ "wait": ".loading-complete" }
```

#### screenshot
Take a screenshot.
```json
{ "screenshot": "dashboard" }
```

### Data Extraction

#### getText
Get text from an element and store in variable.
```json
{ "getText": { "selector": "h1", "variable": "pageTitle" }}
```

#### getAttribute
Get attribute from an element and store in variable.
```json
{ "getAttribute": { "selector": "#status", "attribute": "data-value", "variable": "statusValue" }}
```

### Conditional Logic

#### if/then/else
Conditional branching based on expressions.
```json
{
  "if": "{{pageTitle}} === 'Dashboard'",
  "then": [
    { "screenshot": "logged-in" }
  ],
  "else": [
    { "click": "#login" },
    { "screenshot": "login-required" }
  ]
}
```

**Variable usage in conditions:**
- Use `{{variableName}}` to reference variables
- Variables are created by `getText` and `getAttribute` steps
- Supports JavaScript expressions

**Nested conditions:**
```json
{
  "if": "{{userType}} === 'premium'",
  "then": [
    {
      "if": "{{feature}} === 'enabled'",
      "then": [
        { "click": ".premium-feature" }
      ],
      "else": [
        { "screenshot": "feature-disabled" }
      ]
    }
  ],
  "else": [
    { "navigate": "/upgrade" }
  ]
}
```

### Assertions & Custom Code

#### assert
Assert a condition.
```json
{ "assert": { "selector": "h1", "condition": "contains", "value": "Welcome" }}
{ "assert": { "condition": "{{total}} > 0" }}
```

#### code
Execute custom JavaScript code.
```json
{ "code": "console.log('Custom code execution')" }
```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid test request format",
    "details": "Request must contain test.steps array"
  }
}
```

Error codes:
- `INVALID_REQUEST` - Malformed request
- `INVALID_FILE` - Invalid file format
- `CONVERSION_ERROR` - Failed to convert test definition
- `EXECUTION_ERROR` - Test execution failed
- `VALIDATION_ERROR` - Test validation failed

## Examples

### Simple Login Test
```json
{
  "test": {
    "name": "Simple Login",
    "steps": [
      { "navigate": "https://example.com/login" },
      { "input": { "selector": "#username", "value": "testuser" }},
      { "input": { "selector": "#password", "value": "password123" }},
      { "click": "#login-button" },
      { "wait": ".dashboard" },
      { "screenshot": "after-login" }
    ]
  }
}
```

### Test with Conditions
```json
{
  "test": {
    "name": "Conditional Test",
    "steps": [
      { "navigate": "https://example.com" },
      { "getText": { "selector": "h1", "variable": "title" }},
      {
        "if": "{{title}} === 'Welcome'",
        "then": [
          { "click": ".continue" }
        ],
        "else": [
          { "screenshot": "unexpected-page" },
          { "navigate": "https://example.com/home" }
        ]
      }
    ]
  }
}
```

### Form Interaction Test
```json
{
  "test": {
    "name": "Form Test",
    "steps": [
      { "navigate": "https://example.com/form" },
      { "input": { "selector": "#name", "value": "John Doe" }},
      { "select": { "selector": "#country", "value": "US" }},
      { "check": "#newsletter" },
      { "radio": { "name": "gender", "value": "male" }},
      { "click": "button[type=submit]" },
      { "wait": ".success-message" },
      { "screenshot": "form-submitted" }
    ]
  }
}
```

## Rate Limits & Best Practices

1. **Test Timeout**: Default timeout is 30 seconds per test
2. **File Size**: Maximum upload file size is 10MB
3. **Concurrent Execution**: Currently, tests run sequentially
4. **Screenshots**: Screenshots are returned as base64 encoded strings

## Tips

1. Use meaningful names for screenshots to identify them easily
2. Add wait steps after navigation or actions that trigger page changes
3. Use variables to make tests more dynamic and reusable
4. Validate your test definition before execution to catch errors early
5. Use the reference endpoint to explore available step types