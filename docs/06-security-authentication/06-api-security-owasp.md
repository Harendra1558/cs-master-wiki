---
title: 6. API Security & OWASP
sidebar_position: 6
description: Master OWASP Top 10, defense in depth, rate limiting, and secrets management for interviews.
keywords: [owasp, api security, sql injection, xss, csrf, rate limiting, secrets management]
---

# API Security & OWASP

:::danger Interview Critical
Security vulnerabilities are deal-breakers. Knowing OWASP Top 10 and how to prevent common attacks is expected for any backend role.
:::

## 1. OWASP Top 10 API Security Risks

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    OWASP TOP 10 (2023)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Broken Object Level Authorization (BOLA)                        │
│     └── Accessing other users' data by changing IDs                 │
│                                                                      │
│  2. Broken Authentication                                           │
│     └── Weak credentials, missing MFA, session issues               │
│                                                                      │
│  3. Broken Object Property Level Authorization                      │
│     └── Mass assignment, exposing sensitive fields                  │
│                                                                      │
│  4. Unrestricted Resource Consumption                               │
│     └── No rate limiting, DoS vulnerabilities                       │
│                                                                      │
│  5. Broken Function Level Authorization                             │
│     └── Accessing admin functions as regular user                   │
│                                                                      │
│  6. Server-Side Request Forgery (SSRF)                              │
│     └── Making server request internal resources                    │
│                                                                      │
│  7. Security Misconfiguration                                       │
│     └── Default credentials, verbose errors, open ports             │
│                                                                      │
│  8. Lack of Protection from Automated Threats                       │
│     └── Bots, credential stuffing, scraping                         │
│                                                                      │
│  9. Improper Inventory Management                                   │
│     └── Old API versions, shadow APIs, zombie APIs                  │
│                                                                      │
│  10. Unsafe Consumption of APIs                                     │
│      └── Trusting third-party API responses without validation      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Injection Attacks

### SQL Injection

```java
// ❌ VULNERABLE - String concatenation
public User findUser(String username) {
    String query = "SELECT * FROM users WHERE username = '" + username + "'";
    // Input: "admin' OR '1'='1" → Returns all users!
    // Input: "admin'; DROP TABLE users;--" → Deletes table!
    return jdbcTemplate.queryForObject(query, userRowMapper);
}

// ✅ SAFE - Parameterized queries
public User findUser(String username) {
    return jdbcTemplate.queryForObject(
        "SELECT * FROM users WHERE username = ?",
        new Object[]{username},
        userRowMapper
    );
}

// ✅ SAFE - JPA (parameters are automatically escaped)
@Query("SELECT u FROM User u WHERE u.username = :username")
User findByUsername(@Param("username") String username);

// ✅ SAFE - Criteria API
CriteriaBuilder cb = em.getCriteriaBuilder();
CriteriaQuery<User> query = cb.createQuery(User.class);
Root<User> user = query.from(User.class);
query.where(cb.equal(user.get("username"), username));
```

### Command Injection

```java
// ❌ VULNERABLE
public String runCommand(String filename) {
    Runtime.getRuntime().exec("convert " + filename + " output.jpg");
    // Input: "image.jpg; rm -rf /" → Deletes everything!
}

// ✅ SAFE - Use ProcessBuilder with separate arguments
public String runCommand(String filename) {
    // Validate input first!
    if (!filename.matches("[a-zA-Z0-9_.-]+")) {
        throw new IllegalArgumentException("Invalid filename");
    }
    
    ProcessBuilder pb = new ProcessBuilder("convert", filename, "output.jpg");
    pb.directory(new File("/safe/directory"));
    Process process = pb.start();
    return readOutput(process);
}

// ✅ BETTER - Avoid shell commands entirely
public BufferedImage processImage(String filename) {
    // Use Java libraries instead of shell commands
    return ImageIO.read(new File(UPLOAD_DIR, filename));
}
```

### NoSQL Injection

```java
// ❌ VULNERABLE - MongoDB with string concatenation
public Document findUser(String username) {
    String query = "{'username': '" + username + "'}";
    // Input: "admin', $or: [{},{'a':'a" → Returns all users!
    return collection.find(Document.parse(query)).first();
}

// ✅ SAFE - Use document builders
public Document findUser(String username) {
    return collection.find(eq("username", username)).first();
}

// ✅ SAFE - Spring Data MongoDB
@Query("{'username': ?0}")
User findByUsername(String username);
```

---

## 3. XSS (Cross-Site Scripting)

### Types of XSS

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        XSS ATTACK TYPES                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STORED XSS (Persistent):                                           │
│  ├── Malicious script saved in database                            │
│  ├── Executed when other users view the content                    │
│  └── Example: Comment with <script>stealCookies()</script>          │
│                                                                      │
│  REFLECTED XSS:                                                      │
│  ├── Script in URL parameter                                        │
│  ├── Reflected back in response                                     │
│  └── Example: /search?q=<script>alert('XSS')</script>               │
│                                                                      │
│  DOM XSS:                                                            │
│  ├── Script modifies DOM directly                                   │
│  ├── Never sent to server                                           │
│  └── Example: document.innerHTML = location.hash                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Prevention

```java
// For REST APIs returning JSON, XSS is mostly a frontend concern
// But ALWAYS sanitize/escape when:
// 1. Rendering HTML on server
// 2. Storing user input that will be rendered as HTML

// ✅ Use HTML encoding
import org.owasp.encoder.Encode;

public String sanitizeForHtml(String input) {
    return Encode.forHtml(input);
    // <script> becomes &lt;script&gt;
}

public String sanitizeForAttribute(String input) {
    return Encode.forHtmlAttribute(input);
}

public String sanitizeForJavaScript(String input) {
    return Encode.forJavaScript(input);
}

// ✅ Content-Type headers
@GetMapping("/api/data")
public ResponseEntity<String> getData() {
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_JSON)  // Not text/html!
        .body(jsonData);
}

// ✅ CSP Header (Content Security Policy)
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    return http
        .headers(headers -> headers
            .contentSecurityPolicy(csp -> csp
                .policyDirectives("default-src 'self'; script-src 'self'; style-src 'self'")
            )
        )
        .build();
}
```

---

## 4. CSRF (Cross-Site Request Forgery)

### How CSRF Works

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      CSRF ATTACK FLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. User logs into bank.com (session cookie stored)                 │
│                                                                      │
│  2. User visits evil.com (in another tab)                           │
│                                                                      │
│  3. evil.com contains:                                               │
│     <form action="https://bank.com/transfer" method="POST">         │
│       <input name="amount" value="10000">                           │
│       <input name="to" value="attacker">                            │
│     </form>                                                          │
│     <script>document.forms[0].submit();</script>                    │
│                                                                      │
│  4. Browser sends request to bank.com WITH session cookie!         │
│                                                                      │
│  5. Bank.com processes transfer (user authenticated via cookie)    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Prevention

```java
// For REST APIs with JWT (no cookies), CSRF is NOT a concern
// CSRF only affects cookie-based authentication

// Option 1: Use SameSite cookies (modern browsers)
ResponseCookie cookie = ResponseCookie.from("session", sessionId)
    .httpOnly(true)
    .secure(true)
    .sameSite("Strict")  // Won't be sent on cross-origin requests
    .build();

// Option 2: CSRF tokens (for session-based auth)
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    return http
        .csrf(csrf -> csrf
            .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            // Frontend reads XSRF-TOKEN cookie, sends as X-XSRF-TOKEN header
        )
        .build();
}

// Option 3: Custom header requirement
// Browsers don't allow cross-origin requests to set custom headers
// If X-Requested-With header present → not CSRF
@Component
public class CsrfHeaderFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        
        if (isStateChanging(request.getMethod())) {
            String header = request.getHeader("X-Requested-With");
            if (!"XMLHttpRequest".equals(header)) {
                response.sendError(403, "Missing anti-CSRF header");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
```

---

## 5. BOLA/IDOR (Broken Object Level Authorization)

### The Problem

```java
// ❌ VULNERABLE - No ownership check
@GetMapping("/api/orders/{orderId}")
public Order getOrder(@PathVariable Long orderId) {
    return orderRepository.findById(orderId)
        .orElseThrow(() -> new NotFoundException("Order not found"));
    // Any authenticated user can access ANY order!
}

// ❌ VULNERABLE - Only checking authentication
@DeleteMapping("/api/documents/{id}")
public void deleteDocument(@PathVariable Long id) {
    documentRepository.deleteById(id);
    // User can delete anyone's documents!
}
```

### Prevention

```java
// ✅ SAFE - Always verify ownership
@GetMapping("/api/orders/{orderId}")
public Order getOrder(@PathVariable Long orderId, 
                      @AuthenticationPrincipal UserDetails user) {
    Order order = orderRepository.findById(orderId)
        .orElseThrow(() -> new NotFoundException("Order not found"));
    
    if (!order.getUserId().equals(user.getUserId())) {
        throw new AccessDeniedException("Not your order");
    }
    
    return order;
}

// ✅ SAFE - Query with user constraint
@GetMapping("/api/orders/{orderId}")
public Order getOrder(@PathVariable Long orderId,
                      @AuthenticationPrincipal UserDetails user) {
    // Query includes user ID - can't access others' orders
    return orderRepository.findByIdAndUserId(orderId, user.getUserId())
        .orElseThrow(() -> new NotFoundException("Order not found"));
}

// ✅ SAFE - Use PreAuthorize with custom check
@PreAuthorize("@orderSecurity.canAccess(#orderId, authentication)")
@GetMapping("/api/orders/{orderId}")
public Order getOrder(@PathVariable Long orderId) {
    return orderRepository.findById(orderId).orElseThrow();
}

@Component("orderSecurity")
public class OrderSecurityService {
    
    @Autowired
    private OrderRepository orderRepository;
    
    public boolean canAccess(Long orderId, Authentication auth) {
        CustomUserPrincipal principal = (CustomUserPrincipal) auth.getPrincipal();
        return orderRepository.existsByIdAndUserId(orderId, principal.getUserId());
    }
}
```

---

## 6. Rate Limiting

### Implementation

```java
// Using Bucket4j for rate limiting
@Component
public class RateLimitFilter extends OncePerRequestFilter {
    
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        
        String clientId = getClientIdentifier(request);
        Bucket bucket = buckets.computeIfAbsent(clientId, this::createBucket);
        
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        
        if (probe.isConsumed()) {
            response.setHeader("X-Rate-Limit-Remaining", 
                String.valueOf(probe.getRemainingTokens()));
            chain.doFilter(request, response);
        } else {
            response.setStatus(429);  // Too Many Requests
            response.setHeader("X-Rate-Limit-Retry-After", 
                String.valueOf(probe.getNanosToWaitForRefill() / 1_000_000_000));
            response.getWriter().write("{\"error\": \"Rate limit exceeded\"}");
        }
    }
    
    private Bucket createBucket(String clientId) {
        // 100 requests per minute
        return Bucket.builder()
            .addLimit(Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1))))
            .build();
    }
    
    private String getClientIdentifier(HttpServletRequest request) {
        // Use user ID if authenticated, otherwise IP
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            return "user:" + auth.getName();
        }
        return "ip:" + getClientIp(request);
    }
    
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

// Different limits for different endpoints
@Service
public class TieredRateLimiter {
    
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    
    public Bucket resolveBucket(String userId, String endpoint) {
        String key = userId + ":" + endpoint;
        return buckets.computeIfAbsent(key, k -> createBucket(endpoint));
    }
    
    private Bucket createBucket(String endpoint) {
        if (endpoint.startsWith("/api/auth")) {
            // Strict limit on auth endpoints (prevent brute force)
            return Bucket.builder()
                .addLimit(Bandwidth.classic(10, Refill.intervally(10, Duration.ofMinutes(1))))
                .build();
        } else if (endpoint.startsWith("/api/search")) {
            // Medium limit on search
            return Bucket.builder()
                .addLimit(Bandwidth.classic(30, Refill.intervally(30, Duration.ofMinutes(1))))
                .build();
        } else {
            // Standard limit
            return Bucket.builder()
                .addLimit(Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1))))
                .build();
        }
    }
}
```

### Redis-Based Distributed Rate Limiting

```java
@Service
public class RedisRateLimiter {
    
    @Autowired
    private StringRedisTemplate redis;
    
    private static final int LIMIT = 100;
    private static final int WINDOW_SECONDS = 60;
    
    public boolean tryAcquire(String clientId) {
        String key = "rate_limit:" + clientId;
        long now = System.currentTimeMillis();
        long windowStart = now - (WINDOW_SECONDS * 1000);
        
        // Use sorted set with timestamp as score
        redis.opsForZSet().removeRangeByScore(key, 0, windowStart);
        Long count = redis.opsForZSet().count(key, windowStart, now);
        
        if (count != null && count >= LIMIT) {
            return false;
        }
        
        redis.opsForZSet().add(key, String.valueOf(now), now);
        redis.expire(key, Duration.ofSeconds(WINDOW_SECONDS));
        
        return true;
    }
}

// Sliding window algorithm with Lua script (atomic)
@Service
public class AtomicRedisRateLimiter {
    
    @Autowired
    private StringRedisTemplate redis;
    
    private final RedisScript<Long> rateLimitScript = RedisScript.of("""
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        
        redis.call('ZREMRANGEBYSCORE', key, 0, now - window * 1000)
        local count = redis.call('ZCARD', key)
        
        if count < limit then
            redis.call('ZADD', key, now, now)
            redis.call('EXPIRE', key, window)
            return 1
        else
            return 0
        end
        """, Long.class);
    
    public boolean tryAcquire(String clientId, int limit, int windowSeconds) {
        Long result = redis.execute(rateLimitScript,
            List.of("rate_limit:" + clientId),
            String.valueOf(limit),
            String.valueOf(windowSeconds),
            String.valueOf(System.currentTimeMillis())
        );
        return result != null && result == 1;
    }
}
```

---

## 7. Secrets Management

### Never Hardcode Secrets!

```java
// ❌ NEVER DO THIS
public class Config {
    private static final String DB_PASSWORD = "MyP@ssw0rd123";
    private static final String API_KEY = "sk_live_abc123...";
}

// ❌ DON'T COMMIT TO GIT
# application.properties
spring.datasource.password=MyP@ssw0rd123
```

### Proper Secrets Management

```yaml
# Option 1: Environment Variables
# application.yml
spring:
  datasource:
    password: ${DB_PASSWORD}  # Read from environment

# Option 2: Spring Cloud Config + Vault
spring:
  cloud:
    vault:
      uri: https://vault.example.com
      token: ${VAULT_TOKEN}
      kv:
        backend: secret
        application-name: myapp
```

```java
// Option 3: AWS Secrets Manager
@Configuration
public class SecretsConfig {
    
    @Bean
    public DataSource dataSource() {
        // Fetch secret from AWS Secrets Manager
        AWSSecretsManager client = AWSSecretsManagerClientBuilder.standard()
            .withRegion("us-east-1")
            .build();
        
        GetSecretValueRequest request = new GetSecretValueRequest()
            .withSecretId("prod/myapp/database");
        
        GetSecretValueResult result = client.getSecretValue(request);
        JsonObject secret = JsonParser.parseString(result.getSecretString()).getAsJsonObject();
        
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(secret.get("url").getAsString());
        config.setUsername(secret.get("username").getAsString());
        config.setPassword(secret.get("password").getAsString());
        
        return new HikariDataSource(config);
    }
}

// Option 4: Kubernetes Secrets
# Secret definition
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  db-password: base64encodedpassword

# Mount as environment variable
env:
  - name: DB_PASSWORD
    valueFrom:
      secretRef:
        name: app-secrets
        key: db-password
```

### Secret Rotation

```java
@Service
public class SecretRotationService {
    
    @Autowired
    private SecretsManagerClient secretsManager;
    
    @Autowired
    private DataSourceProperties dataSourceProperties;
    
    @Scheduled(fixedRate = 3600000)  // Every hour
    public void checkAndRotateSecrets() {
        String currentSecret = getCurrentDbPassword();
        String latestSecret = fetchLatestFromVault();
        
        if (!currentSecret.equals(latestSecret)) {
            refreshDataSource(latestSecret);
            log.info("Database credentials rotated");
        }
    }
    
    private void refreshDataSource(String newPassword) {
        // Update password in connection pool
        HikariDataSource ds = (HikariDataSource) dataSource;
        ds.setPassword(newPassword);
        
        // Soft evict connections (they'll use new password on next acquire)
        ds.getHikariPoolMXBean().softEvictConnections();
    }
}
```

---

## 8. Security Headers

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    return http
        .headers(headers -> headers
            // Prevent clickjacking
            .frameOptions(frame -> frame.deny())
            
            // Enable XSS protection in older browsers
            .xssProtection(xss -> xss.block(true))
            
            // Prevent MIME type sniffing
            .contentTypeOptions(Customizer.withDefaults())
            
            // HTTPS only
            .httpStrictTransportSecurity(hsts -> hsts
                .includeSubDomains(true)
                .maxAgeInSeconds(31536000)  // 1 year
            )
            
            // Content Security Policy
            .contentSecurityPolicy(csp -> csp
                .policyDirectives("default-src 'self'; script-src 'self' 'unsafe-inline'; object-src 'none'")
            )
            
            // Referrer Policy  
            .referrerPolicy(referrer -> referrer
                .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.SAME_ORIGIN)
            )
            
            // Feature Policy / Permissions Policy
            .permissionsPolicy(permissions -> permissions
                .policy("geolocation=(self), microphone=()")
            )
        )
        .build();
}

// Response headers that result:
// X-Frame-Options: DENY
// X-XSS-Protection: 1; mode=block
// X-Content-Type-Options: nosniff
// Strict-Transport-Security: max-age=31536000; includeSubDomains
// Content-Security-Policy: default-src 'self'...
// Referrer-Policy: same-origin
// Permissions-Policy: geolocation=(self), microphone=()
```

---

## 9. Interview Questions

### Q1: How do you prevent SQL injection?

```text
Answer:
"SQL injection is prevented through proper input handling:

ALWAYS USE:
1. Parameterized queries / Prepared statements
   - Parameters are escaped automatically
   - Query structure is fixed, data can't modify it

2. ORM frameworks (JPA/Hibernate)
   - Automatically parameterize queries
   - Criteria API is safe by design

3. Stored procedures (with parameters)
   - Query logic in database
   - Less attack surface

ADDITIONALLY:
- Validate input (whitelist characters)
- Use least privilege DB users
- Escape special characters if dynamic SQL unavoidable
- Enable SQL logging in development to spot issues

EXAMPLE:
❌ 'SELECT * FROM users WHERE id = ' + userId
✅ 'SELECT * FROM users WHERE id = ?', [userId]"
```

### Q2: How do you implement rate limiting?

```text
Answer:
"Rate limiting protects against abuse and DoS attacks:

ALGORITHMS:
1. Token Bucket
   - Bucket fills at constant rate
   - Each request takes a token
   - Allows bursts up to bucket size

2. Sliding Window
   - Count requests in rolling time window
   - More accurate than fixed window
   - Use Redis ZADD with timestamps

IMPLEMENTATION:
- For single instance: In-memory (Bucket4j)
- For distributed: Redis with Lua scripts (atomic)

CONSIDERATIONS:
- Different limits per endpoint (/login stricter)
- Rate limit by user ID (authenticated) or IP (anonymous)
- Return 429 with Retry-After header
- Consider X-Forwarded-For behind load balancer

TIERED LIMITS:
- /auth/*: 10/minute (prevent brute force)
- /api/*: 100/minute (standard)
- Premium users: 500/minute (SLA)"
```

### Q3: What is BOLA and how do you prevent it?

```text
Answer:
"BOLA (Broken Object Level Authorization) is OWASP #1.
Also called IDOR (Insecure Direct Object Reference).

THE VULNERABILITY:
- User A requests /api/orders/123
- Server returns order 123 without checking ownership
- User A changes to /api/orders/456 (User B's order)
- Server returns User B's data!

PREVENTION:
1. Always verify ownership:
   findByIdAndUserId(orderId, currentUserId)

2. Use authorization annotations:
   @PreAuthorize('@orderSecurity.isOwner(#id, auth)')

3. Query with user context:
   WHERE id = :id AND user_id = :userId

4. Use UUIDs instead of sequential IDs
   (Makes guessing harder, but NOT sufficient alone!)

5. Centralize authorization logic:
   All data access goes through service layer with checks

TESTING:
- Automate tests: login as User A, try to access User B's resources
- Should always return 403 or 404"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│                API SECURITY CHEAT SHEET                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ INJECTION PREVENTION:                                                 │
│   SQL: Parameterized queries, ORM                                    │
│   Command: Avoid exec(), use libraries                               │
│   NoSQL: Use document builders, not string queries                   │
│                                                                       │
│ XSS PREVENTION:                                                       │
│   Output encoding: Encode.forHtml(input)                             │
│   CSP header: Content-Security-Policy                                │
│   Content-Type: application/json (not text/html)                     │
│                                                                       │
│ CSRF PREVENTION:                                                      │
│   SameSite cookies: SameSite=Strict                                  │
│   CSRF tokens (for session-based auth)                               │
│   Custom header requirement                                          │
│                                                                       │
│ BOLA PREVENTION:                                                      │
│   Always verify ownership before returning data                      │
│   Query with user constraint: WHERE user_id = ?                      │
│   Use @PreAuthorize with custom checks                               │
│                                                                       │
│ RATE LIMITING:                                                        │
│   Token bucket algorithm (allows bursts)                             │
│   Redis for distributed rate limiting                                │
│   Return 429 with Retry-After header                                 │
│                                                                       │
│ SECRETS MANAGEMENT:                                                   │
│   Never hardcode secrets                                             │
│   Use: Vault, AWS Secrets Manager, K8s Secrets                       │
│   Rotate secrets regularly                                           │
│                                                                       │
│ SECURITY HEADERS:                                                     │
│   X-Frame-Options: DENY                                              │
│   X-Content-Type-Options: nosniff                                    │
│   Strict-Transport-Security: max-age=31536000                        │
│   Content-Security-Policy: default-src 'self'                        │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Back:** [5. Spring Security Deep Dive ←](./spring-security-deep-dive)

**Next Section:** [7. Distributed Systems →](../07-distributed-systems/01-intro)
