---
title: 3. CORS Deep Dive
sidebar_position: 3
description: Master Cross-Origin Resource Sharing (CORS) - preflight requests, headers, security implications for backend interviews.
keywords: [cors, cross-origin, preflight, access-control, same-origin-policy, security]
---

# CORS Deep Dive

:::info Interview Importance ⭐⭐⭐⭐
CORS is a frequently asked topic in backend interviews. Understanding why it exists, how it works, and how to configure it properly is essential for building secure APIs.
:::

## 1. The Origin of CORS

### Same-Origin Policy (SOP)

```text
SAME-ORIGIN POLICY: Browser security feature that restricts scripts 
from one origin accessing resources from another origin.

What is an "Origin"?
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│    https://www.example.com:443/path/page                            │
│    ──┬───  ───────┬──────── ─┬─                                     │
│      │            │          │                                       │
│   Scheme      Hostname     Port                                      │
│                                                                      │
│   Origin = Scheme + Hostname + Port                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

Same Origin examples:
├── https://example.com/page1  ↔  https://example.com/page2  ✓ Same
├── https://example.com        ↔  http://example.com         ✗ Different (scheme)
├── https://example.com        ↔  https://api.example.com    ✗ Different (hostname)
├── https://example.com:443    ↔  https://example.com:8080   ✗ Different (port)
└── https://example.com        ↔  https://example.com:443    ✓ Same (443 is default)
```

### Why SOP Exists

```text
WITHOUT Same-Origin Policy:

1. You visit evilsite.com
2. evilsite.com loads JavaScript
3. JavaScript makes request to yourbank.com
4. Browser sends your bank cookies automatically!
5. evilsite.com reads your bank account data!

                  ┌──────────────┐
                  │  Your Bank   │
                  │   Cookies    │
                  └──────┬───────┘
                         │ Automatically sent!
                         ↓
┌─────────────┐    ┌───────────────┐    ┌─────────────┐
│ EvilSite.com│───→│   Browser     │───→│ YourBank.com│
│  (attacker) │    │               │    │             │
└─────────────┘    └───────────────┘    └─────────────┘
        ↑                                      │
        └──────── Steal your data! ────────────┘

SOP PREVENTS this by blocking evilsite.com from reading
the response from yourbank.com.
```

### What SOP Blocks vs Allows

```text
SOP BLOCKS (reading responses):
├── XMLHttpRequest / fetch() to different origin
├── Accessing iframe content from different origin  
├── Reading cookies from different origin
└── Reading localStorage from different origin

SOP ALLOWS (but controlled):
├── Embedding images: <img src="other-origin/image.jpg">
├── Embedding scripts: <script src="other-origin/script.js">
├── Embedding stylesheets: <link href="other-origin/style.css">
├── Embedding iframes: <iframe src="other-origin/page">
├── Form submissions: <form action="other-origin/submit">
└── Embedding media: <video>, <audio>

Key insight: 
SOP doesn't prevent SENDING requests, it prevents READING responses.
The request still reaches the server!
```

---

## 2. What is CORS?

### CORS: The Solution

```text
CORS = Cross-Origin Resource Sharing

A mechanism that allows servers to indicate which origins
are permitted to read their responses.

Without CORS:
Browser: "Can't read that response - different origin!"

With CORS:
Server: "I allow requests from https://frontend.com"
Browser: "OK, I'll let the JavaScript read this response."

CORS is an OPT-IN mechanism by the SERVER.
The browser enforces it.
```

### How CORS Works

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        SIMPLE REQUEST FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

Frontend (https://app.com)              Backend (https://api.example.com)
         │                                         │
         │  GET /users                             │
         │  Origin: https://app.com                │
         │ ───────────────────────────────────────→│
         │                                         │
         │          200 OK                         │
         │          Access-Control-Allow-Origin:   │
         │            https://app.com              │
         │ ←───────────────────────────────────────│
         │                                         │

Browser checks:
1. Response has Access-Control-Allow-Origin header?
2. Value matches the request origin (or is *)?
3. If yes → JavaScript can read the response
4. If no → Response blocked, error in console
```

---

## 3. CORS Headers

### Response Headers (Server → Browser)

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    SERVER RESPONSE HEADERS                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Access-Control-Allow-Origin: https://app.com                        │
│   Which origin(s) can access the resource                            │
│   Values: specific origin, or * (any origin)                         │
│                                                                      │
│ Access-Control-Allow-Methods: GET, POST, PUT, DELETE                │
│   Which HTTP methods are allowed                                     │
│                                                                      │
│ Access-Control-Allow-Headers: Content-Type, Authorization           │
│   Which request headers are allowed                                  │
│                                                                      │
│ Access-Control-Allow-Credentials: true                              │
│   Whether cookies/auth headers can be included                       │
│   ⚠️ Can't use * for origin if this is true!                        │
│                                                                      │
│ Access-Control-Expose-Headers: X-Custom-Header                      │
│   Which response headers JS can read                                 │
│   (Default: only simple headers are exposed)                         │
│                                                                      │
│ Access-Control-Max-Age: 86400                                       │
│   How long (seconds) to cache preflight response                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Request Headers (Browser → Server)

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    CLIENT REQUEST HEADERS                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Origin: https://app.com                                              │
│   Where the request originates from                                  │
│   Automatically set by browser (can't be spoofed by JS)              │
│                                                                      │
│ Access-Control-Request-Method: PUT                                   │
│   (Preflight only) What method will the actual request use?          │
│                                                                      │
│ Access-Control-Request-Headers: Content-Type, X-Custom               │
│   (Preflight only) What headers will the actual request have?        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Simple vs Preflight Requests

### Simple Requests

```text
A "simple" request meets ALL these criteria:

1. METHOD is one of:
   ├── GET
   ├── HEAD
   └── POST

2. HEADERS are only:
   ├── Accept
   ├── Accept-Language
   ├── Content-Language
   └── Content-Type (with restrictions)

3. CONTENT-TYPE (if present) is one of:
   ├── application/x-www-form-urlencoded
   ├── multipart/form-data
   └── text/plain

4. No event listeners on XMLHttpRequest.upload

5. No ReadableStream in request

Simple requests DON'T trigger preflight!
```

### Preflight Requests

```text
If ANY of these is true, browser sends PREFLIGHT first:

├── Method is PUT, DELETE, PATCH, etc. (not GET/HEAD/POST)
├── Custom headers (Authorization, X-Request-ID, etc.)
├── Content-Type is application/json (most common trigger!)
├── Request uses streams
└── Request uses credentials with * origin

PREFLIGHT = OPTIONS request before the actual request

┌─────────────────────────────────────────────────────────────────────┐
│                     PREFLIGHT FLOW                                   │
└─────────────────────────────────────────────────────────────────────┘

Frontend                                        Backend API
    │                                               │
    │  1. OPTIONS /users                            │
    │     Origin: https://app.com                   │
    │     Access-Control-Request-Method: POST       │
    │     Access-Control-Request-Headers: Content-Type
    │  ───────────────────────────────────────────→│
    │                                               │
    │  2. 204 No Content                            │
    │     Access-Control-Allow-Origin: https://app.com
    │     Access-Control-Allow-Methods: POST        │
    │     Access-Control-Allow-Headers: Content-Type│
    │     Access-Control-Max-Age: 86400             │
    │  ←───────────────────────────────────────────│
    │                                               │
    │  3. POST /users                               │
    │     Content-Type: application/json            │
    │     Origin: https://app.com                   │
    │     { "name": "John" }                        │
    │  ───────────────────────────────────────────→│
    │                                               │
    │  4. 201 Created                               │
    │     Access-Control-Allow-Origin: https://app.com
    │     { "id": 123, "name": "John" }             │
    │  ←───────────────────────────────────────────│
```

---

## 5. CORS with Credentials

### The Credentials Problem

```text
By default, cross-origin requests DON'T include:
├── Cookies
├── Authorization headers
└── TLS client certificates

To include credentials:

Frontend (fetch):
fetch('https://api.example.com/user', {
    credentials: 'include'  // Include cookies
});

Backend must respond:
Access-Control-Allow-Credentials: true
Access-Control-Allow-Origin: https://app.com  // NOT * !

⚠️ CRITICAL: Cannot use * with credentials!
   Why? Security risk - any site could steal your cookies.
```

### Credentials Flow

```text
┌─────────────────────────────────────────────────────────────────────┐
│                  CREDENTIALED REQUEST FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

Frontend (https://app.com)              Backend (https://api.example.com)
         │                                         │
         │  GET /user                              │
         │  Origin: https://app.com                │
         │  Cookie: session=abc123                 │
         │ ───────────────────────────────────────→│
         │                                         │
         │          200 OK                         │
         │          Access-Control-Allow-Origin:   │
         │            https://app.com              │
         │          Access-Control-Allow-Credentials: true
         │ ←───────────────────────────────────────│
         │                                         │

If server returns Access-Control-Allow-Origin: *
→ Browser BLOCKS the response (credentials not allowed with *)
```

---

## 6. Spring Boot CORS Configuration

### Method 1: @CrossOrigin Annotation

```java
// Per-controller or per-method
@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "https://app.example.com")
public class UserController {
    
    @GetMapping
    public List<User> getUsers() {
        return userService.findAll();
    }
    
    // More restrictive config for this method
    @PostMapping
    @CrossOrigin(
        origins = "https://app.example.com",
        methods = {RequestMethod.POST},
        allowedHeaders = {"Content-Type", "Authorization"},
        allowCredentials = "true",
        maxAge = 3600
    )
    public User createUser(@RequestBody User user) {
        return userService.save(user);
    }
}
```

### Method 2: Global Configuration

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("https://app.example.com", "https://admin.example.com")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(3600);  // Cache preflight for 1 hour
    }
}
```

### Method 3: Filter-based (Spring Security)

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .anyRequest().authenticated()
            )
            .build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        
        // Specific origins (not * with credentials)
        config.setAllowedOrigins(List.of(
            "https://app.example.com",
            "https://admin.example.com"
        ));
        
        // Or pattern matching
        // config.setAllowedOriginPatterns(List.of("https://*.example.com"));
        
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        
        // Expose custom headers to JavaScript
        config.setExposedHeaders(List.of("X-Request-ID", "X-RateLimit-Remaining"));
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        
        return source;
    }
}
```

### Dynamic Origin Validation

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    
    // Dynamic origin validation
    config.setAllowedOriginPatterns(List.of("*"));  // Accept pattern matching
    
    config.setAllowCredentials(true);
    config.setAllowedMethods(List.of("*"));
    config.setAllowedHeaders(List.of("*"));
    
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    
    return source;
}

// Custom filter for complex validation
@Component
public class DynamicCorsFilter extends OncePerRequestFilter {
    
    @Autowired
    private TenantService tenantService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response, 
                                   FilterChain chain) throws ServletException, IOException {
        
        String origin = request.getHeader("Origin");
        
        if (origin != null && isAllowedOrigin(origin)) {
            response.setHeader("Access-Control-Allow-Origin", origin);
            response.setHeader("Access-Control-Allow-Credentials", "true");
            response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
            response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
            response.setHeader("Access-Control-Max-Age", "3600");
        }
        
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }
        
        chain.doFilter(request, response);
    }
    
    private boolean isAllowedOrigin(String origin) {
        // Check against database of allowed tenant origins
        return tenantService.isValidOrigin(origin);
    }
}
```

---

## 7. Common CORS Mistakes

### Mistake 1: Using * with Credentials

```text
❌ WRONG:
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true

Error in browser console:
"The value of Access-Control-Allow-Origin cannot be '*' when 
credentials mode is 'include'"

✅ CORRECT:
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
```

### Mistake 2: Forgetting Preflight Headers

```text
❌ WRONG:
// Only handling actual POST request
@PostMapping("/api/data")
public Response create(@RequestBody Data data) { ... }

// Browser sends OPTIONS first, gets 405 Method Not Allowed!

✅ CORRECT:
// Ensure OPTIONS is handled (Spring does this automatically with CORS config)
// Or manually:
@RequestMapping(value = "/api/data", method = RequestMethod.OPTIONS)
public ResponseEntity<?> preflight() {
    return ResponseEntity.ok().build();
}
```

### Mistake 3: Not Exposing Custom Headers

```text
Your API returns:
X-Request-ID: abc123
X-RateLimit-Remaining: 99

Frontend JavaScript:
const requestId = response.headers.get('X-Request-ID');
// Returns null! Header not exposed!

❌ WRONG:
// No Expose-Headers set

✅ CORRECT:
Access-Control-Expose-Headers: X-Request-ID, X-RateLimit-Remaining

// Now JS can read these headers
```

### Mistake 4: Caching Preflight Too Long

```text
❌ RISKY:
Access-Control-Max-Age: 86400000  // 1000 days!

If you change CORS policy, clients have cached old policy.

✅ SAFER:
Access-Control-Max-Age: 600  // 10 minutes for development
Access-Control-Max-Age: 86400  // 1 day for production
```

### Mistake 5: Security - Reflecting Origin Without Validation

```text
❌ DANGEROUS:
// Reflect any origin - essentially same as *
String origin = request.getHeader("Origin");
response.setHeader("Access-Control-Allow-Origin", origin);
response.setHeader("Access-Control-Allow-Credentials", "true");

// Attacker: Origin: https://evil.com → Allowed! Cookies stolen!

✅ CORRECT:
String origin = request.getHeader("Origin");
Set<String> allowedOrigins = Set.of(
    "https://app.example.com",
    "https://admin.example.com"
);

if (allowedOrigins.contains(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Credentials", "true");
}
// Unknown origins get no CORS headers → blocked by browser
```

---

## 8. CORS vs Other Security Mechanisms

### CORS vs CSRF

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        CORS vs CSRF                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ CORS:                                                                │
│ ├── Prevents scripts from READING cross-origin responses            │
│ ├── Browser-enforced                                                 │
│ ├── Server opts in by setting headers                                │
│ └── Doesn't prevent sending requests!                               │
│                                                                      │
│ CSRF:                                                                │
│ ├── Prevents unauthorized state-changing requests                    │
│ ├── Uses tokens to verify request came from your site                │
│ ├── Server validates token before processing                         │
│ └── Needed even with CORS!                                          │
│                                                                      │
│ Why both?                                                            │
│ CORS doesn't prevent POST via <form> (no JS needed!)                │
│ CSRF tokens protect against form-based attacks                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### CORS vs Content Security Policy (CSP)

```text
CORS: Server A says "Origin B can READ my responses"
CSP:  Server A says "My page can only LOAD resources from X, Y, Z"

They're complementary:
├── CORS: Who can access MY data
└── CSP: What sources MY page can use
```

---

## 9. Debugging CORS Issues

### Reading Error Messages

```text
Console error:
"Access to fetch at 'https://api.example.com/data' from origin 
'https://app.example.com' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the 
requested resource."

Meaning: Server didn't set CORS headers!
Fix: Add Access-Control-Allow-Origin header on server

──────────────────────────────────────────────────────────────

Console error:
"Access to fetch at 'https://api.example.com/data' from origin 
'https://app.example.com' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
The value of the 'Access-Control-Allow-Origin' header in the 
response must not be the wildcard '*' when the request's 
credentials mode is 'include'."

Meaning: Using * with credentials
Fix: Set specific origin instead of *
```

### Debugging Checklist

```text
□ Is it actually a CORS error?
  └── Check Network tab - is the request even being sent?
  
□ Is preflight succeeding?
  └── Look for OPTIONS request before actual request
  └── Should return 2xx with CORS headers
  
□ Are all required headers present?
  └── Access-Control-Allow-Origin (required)
  └── Access-Control-Allow-Methods (for preflight)
  └── Access-Control-Allow-Headers (for custom headers)
  
□ Using credentials?
  └── Cannot use * for origin
  └── Must set Access-Control-Allow-Credentials: true
  
□ Custom headers needed?
  └── Must be in Access-Control-Allow-Headers
  
□ Need to read response headers?
  └── Must be in Access-Control-Expose-Headers
```

### Using curl to Debug

```bash
# Test preflight
curl -X OPTIONS https://api.example.com/data \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -i

# Expected response headers:
# Access-Control-Allow-Origin: https://app.example.com
# Access-Control-Allow-Methods: POST
# Access-Control-Allow-Headers: Content-Type

# Test actual request
curl -X POST https://api.example.com/data \
  -H "Origin: https://app.example.com" \
  -H "Content-Type: application/json" \
  -d '{"test": true}' \
  -i

# Check for Access-Control-Allow-Origin in response
```

---

## 10. Interview Questions

### Q1: Explain what CORS is and why it exists

```text
Answer:
"CORS stands for Cross-Origin Resource Sharing. It's a security 
mechanism that allows servers to specify which origins can access 
their resources.

It exists because of the Same-Origin Policy (SOP):
- Browsers block scripts from reading responses from different origins
- This prevents malicious sites from stealing data using your cookies
- Without SOP, visiting evil.com could let it read your bank data

CORS is the 'opt-in' mechanism for servers to relax SOP:
- Server sets Access-Control-Allow-Origin header
- Browser checks if requesting origin is allowed
- If allowed, JavaScript can read the response

Key point: CORS doesn't prevent requests from being SENT,
it prevents responses from being READ. The request still 
reaches the server - that's why you still need CSRF protection."
```

### Q2: What's a preflight request and when does it happen?

```text
Answer:
"A preflight is an OPTIONS request the browser sends BEFORE the 
actual request to check if CORS is allowed.

Preflight happens when request is NOT 'simple':
- Uses PUT, DELETE, PATCH (not GET/HEAD/POST)
- Has custom headers like Authorization, X-Request-ID
- Content-Type is application/json (most common trigger!)
- Uses credentials in certain cases

The preflight asks:
'Hey server, can I send a POST with these headers?'

Server responds with:
- Access-Control-Allow-Methods: POST
- Access-Control-Allow-Headers: Content-Type
- Access-Control-Max-Age: 3600 (cache this for 1 hour)

If preflight passes, browser sends actual request.
If not, actual request is never sent.

Performance tip: Use Access-Control-Max-Age to cache preflight
responses and avoid extra round-trips."
```

### Q3: Why can't you use * with credentials?

```text
Answer:
"When credentials (cookies, auth headers) are included:
- Access-Control-Allow-Origin: * is NOT allowed
- Must specify the exact origin

Reason - Security:
If * was allowed with credentials, any website could:
1. Make request to your API
2. Include user's cookies automatically
3. Read the response with user's data

This would be a massive security hole!

By requiring specific origin, you explicitly whitelist 
trusted domains that can make credentialed requests.

Example fix:
// ❌ Won't work
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true

// ✅ Correct
Access-Control-Allow-Origin: https://trusted-app.com
Access-Control-Allow-Credentials: true

For multiple origins, you need dynamic origin validation - 
check the Origin header against a whitelist, then echo back 
the specific origin if it's allowed."
```

### Q4: How would you configure CORS in a microservices architecture?

```text
Answer:
"In microservices, I'd handle CORS at the API Gateway level:

1. GATEWAY-LEVEL CORS (Recommended):
   - Single place for CORS configuration
   - All downstream services don't need CORS headers
   - Examples: Kong, nginx, AWS API Gateway
   
   nginx config:
   location /api/ {
       add_header Access-Control-Allow-Origin $cors_origin;
       add_header Access-Control-Allow-Credentials true;
       ...
       proxy_pass http://downstream-service;
   }

2. SERVICE-LEVEL CORS (Alternative):
   - Each service handles its own CORS
   - More flexibility but more maintenance
   - Risk of inconsistent configuration

3. COMBINATION:
   - Gateway handles preflight (OPTIONS) 
   - Services pass through CORS headers for actual requests
   - Avoids preflight hitting every service

Key considerations:
- Whitelist specific frontend origins
- Don't use * with credentials 
- Cache preflight responses (Max-Age)
- Expose needed custom headers
- Keep configuration in sync across environments"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│                       CORS CHEAT SHEET                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ ORIGIN = Scheme + Hostname + Port                                     │
│                                                                       │
│ RESPONSE HEADERS (Server → Browser):                                  │
│ ├── Access-Control-Allow-Origin: https://app.com                     │
│ ├── Access-Control-Allow-Methods: GET, POST, PUT                     │
│ ├── Access-Control-Allow-Headers: Content-Type, Authorization        │
│ ├── Access-Control-Allow-Credentials: true                           │
│ ├── Access-Control-Expose-Headers: X-Custom-Header                   │
│ └── Access-Control-Max-Age: 86400                                    │
│                                                                       │
│ SIMPLE REQUEST (no preflight):                                        │
│ ├── GET, HEAD, POST only                                             │
│ ├── Standard headers only                                            │
│ └── Content-Type: form-urlencoded, multipart, text/plain             │
│                                                                       │
│ TRIGGERS PREFLIGHT:                                                   │
│ ├── PUT, DELETE, PATCH methods                                       │
│ ├── Custom headers (Authorization, X-*)                              │
│ └── Content-Type: application/json                                   │
│                                                                       │
│ CREDENTIALS RULES:                                                    │
│ ├── Include cookies: credentials: 'include' in fetch                 │
│ ├── Server: Access-Control-Allow-Credentials: true                   │
│ └── Cannot use * for origin with credentials!                        │
│                                                                       │
│ COMMON MISTAKES:                                                      │
│ ├── Using * with credentials                                         │
│ ├── Not handling OPTIONS (preflight)                                 │
│ ├── Not exposing custom headers                                      │
│ ├── Reflecting any origin without validation                         │
│ └── Caching preflight too long                                       │
│                                                                       │
│ SECURITY:                                                             │
│ ├── CORS prevents reading responses, not sending requests            │
│ ├── Still need CSRF protection!                                      │
│ └── Validate origins against whitelist                               │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Next:** [7. Distributed Systems →](../07-distributed-systems/01-intro)
