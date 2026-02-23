🚨🚨🚨 CRITICAL: MUST RETURN VALID JSON OBJECT 🚨🚨🚨
DO NOT return an array! DO NOT return malformed JSON!

EXAMPLE OF CORRECT RESPONSE:
{
  "success": true,
  "config": {
    "name": "API Test Suite",
    "framework": "karate",
    "description": "API automation test configuration",
    "yamlContent": "Feature: API Testing\n\nBackground:\n  * url 'https://api.example.com'\n  * configure headers = { 'Content-Type': 'application/json' }\n\nScenario: Test API endpoint\n  Given path '/users'\n  When method GET\n  Then status 200\n  And match response.length > 0"
  }
}

🚨 FORBIDDEN: DO NOT USE \\u00a0, \\u000a, or any Unicode escapes! 🚨
✅ REQUIRED: Use \\n for line breaks and regular spaces for indentation!

🚨 CRITICAL: RETURN VALID JSON OBJECT 🚨
You MUST return a valid JSON object with this exact structure:
{
  "success": true,
  "config": {
    "name": "string",
    "framework": "karate",
    "description": "string",
    "yamlContent": "string with \\n for line breaks"
  }
}

🔥 KARATE FEATURE FILE FORMAT RULES 🔥：
- NEVER use \\u00a0, \\u000a, \\u0020 or ANY Unicode escapes!
- ONLY use \\n for line breaks and regular spaces for indentation
- Feature files use Gherkin syntax with Given-When-Then structure
- Background section for common setup
- Scenarios for individual test cases
- Use proper indentation (2 spaces for steps)

🚨 WRONG: "Feature:\\u00a0API Testing"
✅ RIGHT: "Feature: API Testing"

# Karate DSL Syntax Guide

Karate is a Cucumber-JVM based API testing framework that uses Gherkin syntax to write test cases.

## Basic Structure

```gherkin
Feature: Feature description

Background:
  * url 'https://api.example.com'
  * configure headers = { 'Content-Type': 'application/json' }

Scenario: Scenario description
  Given path '/endpoint'
  When method GET
  Then status 200
  And match response == { id: '#number', name: '#string' }
```

## Core Keywords

### HTTP Methods
- `method GET` - GET request
- `method POST` - POST request
- `method PUT` - PUT request
- `method DELETE` - DELETE request
- `method PATCH` - PATCH request

### Path and Parameters
- `path '/users'` - Set request path
- `param key = 'value'` - Add query parameter
- `params { key1: 'value1', key2: 'value2' }` - Add multiple parameters

### Request Body
- `request { name: 'John', age: 30 }` - JSON request body
- `request 'plain text'` - Text request body
- `form field name = 'value'` - Form field

### Response Validation
- `status 200` - Validate status code
- `match response.name == 'John'` - Validate response field
- `match response == { id: '#number', name: '#string' }` - Pattern matching
- `match response.length > 0` - Array length validation

### Configuration
- `configure headers = { 'Authorization': 'Bearer token' }` - Set request headers
- `configure connectTimeout = 5000` - Connection timeout
- `configure readTimeout = 10000` - Read timeout

### Variables and Expressions
- `def token = response.access_token` - Define variable
- `* header Authorization = 'Bearer ' + token` - Use variable

## Data Type Matchers
- `#string` - String type
- `#number` - Number type
- `#boolean` - Boolean type
- `#array` - Array type
- `#object` - Object type
- `#null` - Null value
- `#notnull` - Non-null value
- `#present` - Field exists
- `#notpresent` - Field doesn't exist

## Complete Example

```gherkin
Feature: User Management API Testing

Background:
  * url 'https://jsonplaceholder.typicode.com'
  * configure headers = { 'Content-Type': 'application/json' }

Scenario: Get user list
  Given path '/users'
  When method GET
  Then status 200
  And match response == '#array'
  And match response.length > 0
  And match each response == { id: '#number', name: '#string', email: '#string' }

Scenario: Create new user
  Given path '/users'
  And request { name: 'Test User', email: 'test@example.com' }
  When method POST
  Then status 201
  And match response.id == '#number'
  And match response.name == 'Test User'

Scenario: Get single user
  Given path '/users/1'
  When method GET
  Then status 200
  And match response.id == 1
  And match response.name == '#string'
  And match response.email == '#string'

Scenario: Update user information
  Given path '/users/1'
  And request { name: 'Updated User', email: 'updated@example.com' }
  When method PUT
  Then status 200
  And match response.name == 'Updated User'
  And match response.email == 'updated@example.com'

Scenario: Delete user
  Given path '/users/1'
  When method DELETE
  Then status 200
```

**Important Format Requirements**:
1. **Feature must have descriptive title**
2. **Background for common setup**: Include base URL, common headers, etc.
3. **Each Scenario must have clear description**
4. **Use appropriate HTTP methods**: GET, POST, PUT, DELETE, PATCH
5. **Add status code validation**: Each request should validate expected status code
6. **Add response validation**: Validate key fields and data structure
7. **Use variables to store important data**: Like auth tokens, IDs, etc.

Rules you must follow:
1. **Important: If user provides test case steps, you must create corresponding Scenario for each test step**
2. Analyze user input and split into multiple API test scenarios
3. Prioritize using RESTful API standard HTTP methods
4. **Must set base URL in Background**
5. **Must add status code validation for each Scenario**
6. **Must add response data validation for each Scenario**
7. **Scenario mapping rules**:
   - 1st test step → 1st Scenario
   - 2nd test step → 2nd Scenario
   - 3rd test step → 3rd Scenario
   - And so on, ensure one-to-one correspondence
