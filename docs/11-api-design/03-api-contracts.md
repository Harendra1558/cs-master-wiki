---
title: 3. API Contracts & OpenAPI
sidebar_position: 3
description: Master OpenAPI/Swagger, API contracts, backward compatibility, and deprecation strategies for interviews.
keywords: [openapi, swagger, api contract, backward compatibility, api versioning, deprecation]
---

# API Contracts & OpenAPI

:::info Interview Importance ⭐⭐⭐⭐
Understanding API contracts shows you think about API consumers, not just implementation. Questions about OpenAPI, versioning, and backward compatibility are common.
:::

## 1. What is an API Contract?

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    API CONTRACT                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ An API contract is a FORMAL AGREEMENT that defines:                 │
│                                                                      │
│   ├── Endpoints (URLs and methods)                                  │
│   ├── Request format (parameters, body schema)                      │
│   ├── Response format (success and error responses)                 │
│   ├── Authentication requirements                                   │
│   ├── Rate limits                                                   │
│   └── Error codes and messages                                      │
│                                                                      │
│ Benefits:                                                            │
│   ├── Frontend and backend can develop in parallel                  │
│   ├── Auto-generate documentation                                   │
│   ├── Auto-generate client SDKs                                     │
│   ├── Validate requests/responses automatically                     │
│   └── Contract testing ensures compatibility                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. OpenAPI Specification (Swagger)

### What is OpenAPI?

```text
OpenAPI (formerly Swagger) is the industry standard for 
describing REST APIs in a machine-readable format.

OpenAPI Specification (OAS) 3.0:
├── YAML or JSON format
├── Describes endpoints, parameters, schemas
├── Used to generate documentation, SDKs, tests
└── Supported by most API tools
```

### Basic OpenAPI Structure

```yaml
# openapi.yaml
openapi: 3.0.3
info:
  title: User Management API
  description: API for managing users
  version: 1.0.0
  contact:
    name: API Support
    email: api@example.com

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://staging-api.example.com/v1
    description: Staging

paths:
  /users:
    get:
      summary: List all users
      operationId: listUsers
      tags:
        - Users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 0
        - name: size
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserPage'
        '401':
          $ref: '#/components/responses/Unauthorized'

    post:
      summary: Create a new user
      operationId: createUser
      tags:
        - Users
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created
          headers:
            Location:
              schema:
                type: string
              description: URL of created user
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          $ref: '#/components/responses/BadRequest'
        '409':
          description: Email already exists

  /users/{id}:
    get:
      summary: Get user by ID
      operationId: getUser
      tags:
        - Users
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            format: int64
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          $ref: '#/components/responses/NotFound'

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
          format: int64
          readOnly: true
        name:
          type: string
          minLength: 2
          maxLength: 100
        email:
          type: string
          format: email
        status:
          type: string
          enum: [ACTIVE, INACTIVE, SUSPENDED]
        createdAt:
          type: string
          format: date-time
          readOnly: true
      required:
        - name
        - email

    CreateUserRequest:
      type: object
      properties:
        name:
          type: string
          minLength: 2
          maxLength: 100
        email:
          type: string
          format: email
        password:
          type: string
          minLength: 8
          writeOnly: true
      required:
        - name
        - email
        - password

    UserPage:
      type: object
      properties:
        content:
          type: array
          items:
            $ref: '#/components/schemas/User'
        page:
          type: integer
        size:
          type: integer
        totalElements:
          type: integer
        totalPages:
          type: integer

    ApiError:
      type: object
      properties:
        timestamp:
          type: string
          format: date-time
        status:
          type: integer
        error:
          type: string
        message:
          type: string
        path:
          type: string

  responses:
    BadRequest:
      description: Invalid request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ApiError'
    
    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ApiError'
    
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ApiError'

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - bearerAuth: []
```

---

## 3. API-First vs Code-First

### Approaches Comparison

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    API-FIRST vs CODE-FIRST                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ API-FIRST (Design-First):                                           │
│ ─────────────────────────                                            │
│   1. Design OpenAPI spec first                                      │
│   2. Review and agree on contract                                   │
│   3. Generate server stubs and client SDKs                          │
│   4. Implement the API                                               │
│                                                                      │
│   ✓ Better for large teams                                          │
│   ✓ Contract is the source of truth                                 │
│   ✓ Parallel development (frontend + backend)                       │
│   ✗ Requires upfront design effort                                  │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ CODE-FIRST:                                                          │
│ ───────────                                                          │
│   1. Write the code with annotations                                │
│   2. Generate OpenAPI spec from code                                │
│   3. Documentation auto-updates                                      │
│                                                                      │
│   ✓ Faster for small teams                                          │
│   ✓ Code is the source of truth                                     │
│   ✓ Less context switching                                          │
│   ✗ Risk of inconsistent API design                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Spring Boot Code-First Example

```java
// Dependencies: springdoc-openapi-starter-webmvc-ui

@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "Users", description = "User management APIs")
public class UserController {
    
    @Operation(
        summary = "Get user by ID",
        description = "Retrieves a user by their unique identifier"
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200", 
            description = "User found",
            content = @Content(schema = @Schema(implementation = UserDto.class))
        ),
        @ApiResponse(
            responseCode = "404", 
            description = "User not found",
            content = @Content(schema = @Schema(implementation = ApiError.class))
        )
    })
    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUser(
            @Parameter(description = "User ID", required = true) 
            @PathVariable Long id) {
        return userService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    @Operation(summary = "Create new user")
    @ApiResponse(responseCode = "201", description = "User created")
    @PostMapping
    public ResponseEntity<UserDto> createUser(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                description = "User to create",
                required = true,
                content = @Content(schema = @Schema(implementation = CreateUserRequest.class))
            )
            @Valid @RequestBody CreateUserRequest request) {
        UserDto user = userService.create(request);
        URI location = URI.create("/api/v1/users/" + user.getId());
        return ResponseEntity.created(location).body(user);
    }
}

// DTO with schema annotations
@Schema(description = "User response object")
public class UserDto {
    @Schema(description = "User ID", example = "123", accessMode = Schema.AccessMode.READ_ONLY)
    private Long id;
    
    @Schema(description = "User's full name", example = "John Doe", minLength = 2, maxLength = 100)
    private String name;
    
    @Schema(description = "Email address", example = "john@example.com", format = "email")
    private String email;
    
    @Schema(description = "User status", example = "ACTIVE", allowableValues = {"ACTIVE", "INACTIVE"})
    private String status;
}
```

---

## 4. Backward Compatibility

### What is Backward Compatibility?

```text
BACKWARD COMPATIBLE = Old clients still work with new API

Client v1.0 ──→ API v2.0  ✓ Works (backward compatible)
Client v2.0 ──→ API v1.0  ✗ May not work (forward compatibility)
```

### Rules for Backward Compatibility

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKWARD COMPATIBLE CHANGES                       │
│                         (Safe to make)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ✓ ADD new optional field to response                                │
│ ✓ ADD new optional query parameter                                  │
│ ✓ ADD new endpoint                                                  │
│ ✓ ADD new enum value (if client handles unknown values)             │
│ ✓ EXTEND string field length                                        │
│ ✓ Make required field optional                                      │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                    BREAKING CHANGES                                  │
│                    (Require new version)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ✗ REMOVE field from response                                        │
│ ✗ RENAME field                                                      │
│ ✗ CHANGE field type (string → number)                               │
│ ✗ ADD required field to request                                     │
│ ✗ REMOVE endpoint                                                   │
│ ✗ CHANGE endpoint URL structure                                     │
│ ✗ CHANGE HTTP method                                                │
│ ✗ NARROW enum values (remove options)                               │
│ ✗ SHORTEN max length                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Example: Safe Evolution

```java
// Version 1: Original response
{
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com"
}

// Version 1.1: Added optional field (SAFE)
{
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"  // NEW optional field
}

// Old clients ignore the new "phone" field - still works!
```

### Example: Breaking Change

```java
// Version 1: Original
{
    "name": "John Doe"
}

// Version 2: BREAKING - renamed field
{
    "fullName": "John Doe"  // Old clients looking for "name" will break!
}

// Solution: Keep both fields during transition
{
    "name": "John Doe",       // Deprecated, still present
    "fullName": "John Doe"    // New field
}
```

---

## 5. Deprecation Strategy

### Deprecation Timeline

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    DEPRECATION TIMELINE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Month 0: Announce Deprecation                                        │
│ ├── Add @Deprecated annotation                                      │
│ ├── Add deprecation notice to documentation                        │
│ ├── Send communication to API consumers                             │
│ └── Start logging usage of deprecated endpoints                    │
│                                                                      │
│ Month 1-5: Transition Period                                         │
│ ├── Both old and new versions available                             │
│ ├── Reminders to consumers                                          │
│ ├── Offer migration support                                         │
│ └── Monitor deprecated endpoint usage                               │
│                                                                      │
│ Month 6: Sunset                                                      │
│ ├── Return 410 Gone (or redirect)                                   │
│ ├── Remove endpoint from documentation                              │
│ └── Keep monitoring for stragglers                                  │
│                                                                      │
│ Recommended: Minimum 3-6 months deprecation period                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Implementation

```java
@RestController
@RequestMapping("/api")
public class UserController {
    
    // NEW endpoint (v2)
    @GetMapping("/v2/users/{id}")
    public ResponseEntity<UserDtoV2> getUserV2(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserV2(id));
    }
    
    // DEPRECATED endpoint (v1)
    @Deprecated
    @Operation(
        summary = "Get user by ID (DEPRECATED)",
        description = "**DEPRECATED**: Use /api/v2/users/{id} instead. " +
                      "This endpoint will be removed on 2024-06-01."
    )
    @GetMapping("/v1/users/{id}")
    public ResponseEntity<UserDtoV1> getUserV1(@PathVariable Long id) {
        // Log deprecation warning
        log.warn("Deprecated endpoint called: GET /api/v1/users/{}", id);
        
        // Add deprecation headers
        return ResponseEntity.ok()
            .header("Deprecation", "true")
            .header("Sunset", "Sat, 01 Jun 2024 00:00:00 GMT")
            .header("Link", "</api/v2/users/" + id + ">; rel=\"successor-version\"")
            .body(userService.getUserV1(id));
    }
    
    // After sunset date
    @GetMapping("/v0/users/{id}")
    public ResponseEntity<Void> getUserV0Legacy(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.GONE)
            .header("Link", "</api/v2/users/" + id + ">; rel=\"successor-version\"")
            .build();
    }
}
```

### Deprecation Headers

```text
Standard deprecation response headers:

Deprecation: true
Sunset: Sat, 01 Jun 2024 00:00:00 GMT
Link: </api/v2/users>; rel="successor-version"
```

---

## 6. Contract Testing

### Why Contract Testing?

```text
Problem: 
  Backend changes API → Frontend breaks (discovered in production!)

Solution:
  Contract tests verify API compatibility BEFORE deployment

┌─────────────┐         ┌─────────────┐
│   Backend   │←─test───│  Contract   │───test─→│  Frontend  │
│   (Provider)│         │  (Schema)   │         │  (Consumer)│
└─────────────┘         └─────────────┘         └─────────────┘
```

### OpenAPI Validation

```java
// Spring Boot test with OpenAPI validation
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
public class ApiContractTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    private OpenApiInteractionValidator validator;
    
    @BeforeEach
    void setup() {
        validator = OpenApiInteractionValidator
            .createForSpecificationUrl("openapi.yaml")
            .build();
    }
    
    @Test
    void getUserShouldMatchContract() {
        ResponseEntity<String> response = restTemplate.getForEntity(
            "/api/v1/users/123", String.class);
        
        // Validate response against OpenAPI spec
        SimpleRequest request = SimpleRequest.Builder
            .get("/api/v1/users/123")
            .build();
            
        SimpleResponse simpleResponse = SimpleResponse.Builder
            .status(response.getStatusCodeValue())
            .withBody(response.getBody())
            .build();
        
        ValidationReport report = validator.validate(request, simpleResponse);
        assertThat(report.hasErrors()).isFalse();
    }
}
```

### Consumer-Driven Contracts (Pact)

```java
// Consumer side (Frontend team creates)
@Pact(consumer = "frontend", provider = "user-service")
public RequestResponsePact getUserPact(PactDslWithProvider builder) {
    return builder
        .given("user 123 exists")
        .uponReceiving("a request for user 123")
            .path("/api/v1/users/123")
            .method("GET")
        .willRespondWith()
            .status(200)
            .body(new PactDslJsonBody()
                .integerType("id", 123)
                .stringType("name", "John Doe")
                .stringType("email", "john@example.com"))
        .toPact();
}

// Provider side (Backend team verifies)
@Provider("user-service")
@PactFolder("pacts")
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
public class UserServicePactVerificationTest {
    
    @BeforeEach
    void setupTestTarget(PactVerificationContext context) {
        context.setTarget(new HttpTestTarget("localhost", port));
    }
    
    @State("user 123 exists")
    void setupUser123() {
        userRepository.save(new User(123L, "John Doe", "john@example.com"));
    }
    
    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void pactVerificationTestTemplate(PactVerificationContext context) {
        context.verifyInteraction();
    }
}
```

---

## 7. API Changelog

### Keeping a Changelog

```markdown
# API Changelog

## [2.1.0] - 2024-02-01
### Added
- `phone` field to User response (optional)
- `GET /api/v2/users/{id}/orders` endpoint

### Changed
- Increased rate limit from 100 to 200 requests/minute

### Deprecated
- `GET /api/v1/users/{id}` - Use v2 endpoint instead (sunset: 2024-06-01)

## [2.0.0] - 2024-01-15
### Breaking Changes
- Renamed `name` to `fullName` in User response
- Changed `/users/search` to `/users?q={query}`

### Added
- Pagination support on all list endpoints
- `status` field to User response

### Removed
- `GET /api/v0/users` endpoint (was deprecated since 2023-07)
```

---

## 8. Interview Questions

### Q1: What is the difference between API-First and Code-First?

```text
Answer:
"API-First means designing the API specification (OpenAPI) BEFORE 
writing any code. The contract is reviewed and agreed upon, then 
both frontend and backend teams develop in parallel.

Code-First means writing the code with annotations and generating 
the OpenAPI spec automatically.

I prefer API-First for larger teams because:
1. Clear contract before development
2. Parallel development
3. Better API consistency
4. Catches design issues early

For small teams or rapid prototyping, Code-First is faster."
```

### Q2: How do you handle breaking changes in APIs?

```text
Answer:
"I follow a structured deprecation process:

1. VERSION: Create new API version (/api/v2/)
2. COMMUNICATE: Notify all consumers about the change
3. TRANSITION: Run both versions for 3-6 months
4. DEPRECATE: Add headers and documentation warnings
5. MONITOR: Track usage of deprecated endpoints
6. SUNSET: Return 410 Gone after deprecation period

For the deprecation period, I add these headers:
- Deprecation: true
- Sunset: <date>
- Link: <new-endpoint>; rel='successor-version'

I also try to avoid breaking changes by:
- Adding optional fields instead of required
- Keeping old fields with new ones during transition
- Using feature flags for gradual rollout"
```

### Q3: How do you ensure API backward compatibility?

```text
Answer:
"I follow these rules:

SAFE changes (backward compatible):
✓ Add optional fields to response
✓ Add optional query parameters
✓ Add new endpoints
✓ Make required fields optional

BREAKING changes (need new version):
✗ Remove or rename fields
✗ Change field types
✗ Add required fields to request
✗ Change URL structure

I also use:
1. Contract testing - Validate responses against OpenAPI spec
2. Consumer-driven contracts (Pact) - Frontend defines expectations
3. CI/CD checks - Automated compatibility verification
4. API design reviews - Team reviews before implementation"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│                  API CONTRACTS CHEAT SHEET                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ OPENAPI STRUCTURE:                                                    │
│ ├── info: API metadata (title, version)                              │
│ ├── servers: Base URLs                                               │
│ ├── paths: Endpoints and operations                                  │
│ ├── components/schemas: Data models                                  │
│ ├── components/responses: Reusable responses                         │
│ └── security: Authentication                                         │
│                                                                       │
│ BACKWARD COMPATIBLE (Safe):                                           │
│ ├── Add optional response field                                      │
│ ├── Add optional query parameter                                     │
│ ├── Add new endpoint                                                 │
│ └── Make required field optional                                     │
│                                                                       │
│ BREAKING CHANGES (Need new version):                                  │
│ ├── Remove/rename field                                              │
│ ├── Change field type                                                │
│ ├── Add required request field                                       │
│ └── Remove endpoint                                                  │
│                                                                       │
│ DEPRECATION HEADERS:                                                  │
│ ├── Deprecation: true                                                │
│ ├── Sunset: <date>                                                   │
│ └── Link: <new-url>; rel="successor-version"                         │
│                                                                       │
│ DEPRECATION TIMELINE:                                                 │
│ Month 0: Announce + add headers                                       │
│ Month 1-5: Monitor usage + remind                                     │
│ Month 6: Sunset (return 410 Gone)                                    │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Next:** [4. GraphQL →](./graphql)
