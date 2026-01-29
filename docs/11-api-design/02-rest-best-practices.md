---
title: 2. REST API Best Practices
sidebar_position: 2
description: Master REST API design, versioning, error handling, and best practices for interviews.
keywords: [rest api, api design, http methods, api versioning, error handling]
---

# REST API Best Practices

:::info Interview Tip
Good API design demonstrates your attention to detail and understanding of web standards. Interviewers often ask "How would you design the API for...?"
:::

## 1. RESTful Resource Naming

### URL Structure

```text
✅ GOOD: Use nouns, not verbs
GET    /users           # Get all users
GET    /users/123       # Get user 123
POST   /users           # Create user
PUT    /users/123       # Update user 123
DELETE /users/123       # Delete user 123

❌ BAD: Don't use verbs
GET /getUsers
POST /createUser
GET /deleteUser/123
```

### Nested Resources

```text
# User's orders
GET /users/123/orders           # All orders for user 123
GET /users/123/orders/456       # Order 456 of user 123

# Limit nesting to 2-3 levels max
❌ BAD:  /users/123/orders/456/items/789/reviews
✅ GOOD: /orders/456/items/789/reviews
         (Or just /reviews?itemId=789)
```

### Naming Conventions

```text
✅ Use lowercase with hyphens
/user-profiles
/order-items

❌ Avoid camelCase or underscores
/userProfiles
/order_items

✅ Use plural nouns
/users, /orders, /products

❌ Avoid singular
/user, /order
```

---

## 2. HTTP Methods

### Method Semantics

| Method | Purpose | Idempotent | Safe | Request Body |
|--------|---------|------------|------|--------------|
| GET | Read resource | ✅ | ✅ | ❌ |
| POST | Create resource | ❌ | ❌ | ✅ |
| PUT | Full update | ✅ | ❌ | ✅ |
| PATCH | Partial update | ❌* | ❌ | ✅ |
| DELETE | Remove resource | ✅ | ❌ | ❌ |

### PUT vs PATCH

```java
// PUT: Replace entire resource
PUT /users/123
{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "123-456-7890",  // Must include all fields!
    "address": "..."
}

// PATCH: Update specific fields only
PATCH /users/123
{
    "email": "newemail@example.com"  // Only update email
}
```

### POST for Complex Operations

```text
When CRUD doesn't fit, use POST with action in URL:

POST /orders/123/cancel
POST /users/123/reset-password
POST /payments/123/refund
```

---

## 3. HTTP Status Codes

### Common Codes Cheat Sheet

```text
2xx Success:
  200 OK           - Successful GET, PUT, PATCH, DELETE
  201 Created      - Successful POST (include Location header)
  204 No Content   - Successful DELETE (no response body)

4xx Client Error:
  400 Bad Request  - Invalid request body/parameters
  401 Unauthorized - Not authenticated
  403 Forbidden    - Authenticated but not authorized
  404 Not Found    - Resource doesn't exist
  409 Conflict     - Duplicate, version mismatch
  422 Unprocessable Entity - Validation failed
  429 Too Many Requests - Rate limit exceeded

5xx Server Error:
  500 Internal Server Error - Unexpected error
  502 Bad Gateway   - Upstream service failure
  503 Service Unavailable - Temporarily down
  504 Gateway Timeout - Upstream timeout
```

### Spring Implementation

```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable Long id) {
        return userService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<User> createUser(@Valid @RequestBody CreateUserRequest request) {
        User user = userService.create(request);
        
        URI location = ServletUriComponentsBuilder
            .fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(user.getId())
            .toUri();
        
        return ResponseEntity
            .created(location)  // 201 with Location header
            .body(user);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();  // 204
    }
}
```

---

## 4. Error Handling

### Consistent Error Response Format

```java
// Error response DTO
public class ApiError {
    private String timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
    private List<FieldError> fieldErrors;  // For validation
    private String traceId;  // For debugging
}

// Example response
{
    "timestamp": "2024-01-15T10:30:00Z",
    "status": 400,
    "error": "Bad Request",
    "message": "Validation failed",
    "path": "/api/users",
    "fieldErrors": [
        {
            "field": "email",
            "message": "must be a valid email address"
        },
        {
            "field": "name",
            "message": "must not be blank"
        }
    ],
    "traceId": "abc123def456"
}
```

### Global Exception Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException ex, 
                                                    HttpServletRequest request) {
        ApiError error = ApiError.builder()
            .status(404)
            .error("Not Found")
            .message(ex.getMessage())
            .path(request.getRequestURI())
            .build();
        
        return ResponseEntity.status(404).body(error);
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex,
                                                      HttpServletRequest request) {
        List<FieldError> fieldErrors = ex.getBindingResult().getFieldErrors()
            .stream()
            .map(f -> new FieldError(f.getField(), f.getDefaultMessage()))
            .collect(Collectors.toList());
        
        ApiError error = ApiError.builder()
            .status(400)
            .error("Bad Request")
            .message("Validation failed")
            .path(request.getRequestURI())
            .fieldErrors(fieldErrors)
            .build();
        
        return ResponseEntity.badRequest().body(error);
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneral(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception", ex);
        
        ApiError error = ApiError.builder()
            .status(500)
            .error("Internal Server Error")
            .message("An unexpected error occurred")
            .path(request.getRequestURI())
            .build();
        
        return ResponseEntity.status(500).body(error);
    }
}
```

---

## 5. Pagination & Filtering

### Page-Based Pagination

```text
GET /api/users?page=0&size=20&sort=createdAt,desc

Response:
{
    "content": [...],
    "page": 0,
    "size": 20,
    "totalElements": 100,
    "totalPages": 5,
    "first": true,
    "last": false
}
```

### Cursor-Based Pagination (for large datasets)

```text
GET /api/posts?cursor=abc123&limit=20

Response:
{
    "data": [...],
    "nextCursor": "def456",
    "hasMore": true
}
```

### Filtering

```text
# Simple filters
GET /api/products?category=electronics&minPrice=100&maxPrice=500

# Multiple values
GET /api/products?status=active&status=pending

# Date ranges
GET /api/orders?createdFrom=2024-01-01&createdTo=2024-01-31
```

### Spring Implementation

```java
@GetMapping
public Page<UserDto> getUsers(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "createdAt") String sortBy,
        @RequestParam(defaultValue = "desc") String sortDir,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String search) {
    
    Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
    Pageable pageable = PageRequest.of(page, size, sort);
    
    return userService.findAll(status, search, pageable);
}
```

---

## 6. API Versioning

### Strategies

```text
1. URL Path (Most common)
   /api/v1/users
   /api/v2/users

2. Query Parameter
   /api/users?version=1
   /api/users?version=2

3. Header
   X-API-Version: 1
   X-API-Version: 2

4. Content Negotiation
   Accept: application/vnd.myapp.v1+json
   Accept: application/vnd.myapp.v2+json
```

### Recommendation for Most Cases

```java
// URL path versioning - clearest and most widely used
@RestController
@RequestMapping("/api/v1/users")
public class UserControllerV1 {
    // Old implementation
}

@RestController
@RequestMapping("/api/v2/users")
public class UserControllerV2 {
    // New implementation with breaking changes
}
```

---

## 7. Security Best Practices

### Authentication

```java
// JWT token in Authorization header
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Spring Security configuration
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf().disable()
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(OAuth2ResourceServerConfigurer::jwt)
            .build();
    }
}
```

### Rate Limiting

```java
@Configuration
public class RateLimitConfig {
    
    @Bean
    public RateLimiter rateLimiter() {
        return RateLimiter.of("api", RateLimiterConfig.custom()
            .limitForPeriod(100)                    // 100 requests
            .limitRefreshPeriod(Duration.ofMinutes(1))  // per minute
            .timeoutDuration(Duration.ZERO)         // Don't wait, reject immediately
            .build());
    }
}

// Response headers
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642156800
```

### Input Validation

```java
@PostMapping
public ResponseEntity<User> createUser(@Valid @RequestBody CreateUserRequest request) {
    // @Valid triggers validation
}

public class CreateUserRequest {
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100)
    private String name;
    
    @NotBlank
    @Email(message = "Invalid email format")
    private String email;
    
    @NotBlank
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$",
             message = "Password must be at least 8 characters with upper, lower, and digit")
    private String password;
}
```

---

## 8. Documentation (OpenAPI/Swagger)

```java
@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "User management APIs")
public class UserController {
    
    @Operation(
        summary = "Get user by ID",
        description = "Retrieves a user by their unique identifier"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "User found"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(
            @Parameter(description = "User ID") @PathVariable Long id) {
        return userService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
```

---

## 9. Interview Questions

### Q1: How do you design a RESTful API for an e-commerce platform?

```text
Resources:
  /products       - Product catalog
  /users          - User accounts
  /carts          - Shopping carts
  /orders         - Orders
  /payments       - Payments

Examples:
  GET    /products?category=electronics&page=0&size=20
  POST   /carts/{cartId}/items
  POST   /orders (create from cart)
  PATCH  /orders/{id}/status
  POST   /orders/{id}/cancel
```

### Q2: How do you handle breaking changes?

**Answer:**
> "I use URL versioning (/api/v1, /api/v2). When making breaking changes, I create a new version while keeping the old one running. I give clients a deprecation period (3-6 months) with clear documentation of changes. Non-breaking changes (adding fields) don't require new versions."

### Q3: What's the difference between 401 and 403?

**Answer:**
> "401 Unauthorized means the client is not authenticated - they need to provide valid credentials. 403 Forbidden means the client is authenticated but doesn't have permission to access the resource. For example, a regular user trying to access admin endpoints."

---

## Quick Reference

```text
HTTP Methods:
- GET: Read (safe, idempotent)
- POST: Create (not idempotent)
- PUT: Full update (idempotent)
- PATCH: Partial update
- DELETE: Remove (idempotent)

Status Codes:
- 200 OK, 201 Created, 204 No Content
- 400 Bad Request, 401 Unauthorized, 403 Forbidden
- 404 Not Found, 422 Validation Error
- 500 Server Error, 503 Unavailable

URL Design:
- Use nouns, not verbs
- Plural resources (/users, /orders)
- Lowercase with hyphens
- Max 2-3 levels of nesting

Pagination:
- Page-based: ?page=0&size=20
- Cursor-based: ?cursor=abc&limit=20

Versioning:
- URL path: /api/v1/resources (recommended)
- Header: X-API-Version: 1
```

---

**Next:** [3. API Contracts & OpenAPI →](./api-contracts)
