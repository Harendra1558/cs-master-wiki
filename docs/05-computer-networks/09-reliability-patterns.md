---
title: 9. Reliability Patterns
sidebar_position: 9
description: Timeouts, Retries, Circuit Breakers, Idempotency, and handling cascading failures for interviews.
keywords: [timeout, retry, circuit breaker, idempotency, cascading failure, backoff, resilience]
---

# Reliability Patterns

:::info Interview Importance ⭐⭐⭐⭐⭐
Reliability patterns are critical for system design interviews. Understanding how to handle failures gracefully differentiates senior engineers from junior ones.
:::

## 1. Why Reliability Matters

### The Reality of Distributed Systems

```text
In distributed systems, failures are NORMAL:

┌─────────────────────────────────────────────────────────┐
│ Things that WILL fail:                                   │
│ ├── Network partitions (packets lost)                   │
│ ├── Server crashes (OOM, bugs, hardware)                │
│ ├── Overloaded dependencies (database, APIs)            │
│ ├── DNS resolution failures                             │
│ ├── TLS handshake failures                              │
│ ├── Connection timeouts                                 │
│ └── Everything, eventually                              │
└─────────────────────────────────────────────────────────┘

Peter Deutsch's Fallacies of Distributed Computing:
1. The network is reliable           ← FALSE
2. Latency is zero                   ← FALSE
3. Bandwidth is infinite             ← FALSE
4. The network is secure             ← FALSE
5. Topology doesn't change           ← FALSE
6. There is one administrator        ← FALSE
7. Transport cost is zero            ← FALSE
8. The network is homogeneous        ← FALSE
```

---

## 2. Timeout Strategies

### Why Timeouts are Critical

```text
Without timeout:
Client ─── Request ───→ Server (hangs forever)
          ↑
    Client waits indefinitely
    Resources locked
    Threads exhausted
    Cascading failure!

With timeout:
Client ─── Request ───→ Server
       Wait 5 seconds...
Client: "No response, giving up"
        Free resources, handle error gracefully
```

### Types of Timeouts

```text
1. CONNECTION TIMEOUT
   └── How long to wait for TCP handshake
   └── Typically: 1-5 seconds
   └── Indicates: Server unreachable, network issue

2. READ/SOCKET TIMEOUT
   └── How long to wait for response data
   └── Depends on operation complexity
   └── Indicates: Server processing slowly

3. REQUEST TIMEOUT
   └── Total time for entire request
   └── Connection + Read + Processing
   └── Usually what you set in HTTP clients

4. IDLE/KEEP-ALIVE TIMEOUT
   └── How long to keep idle connection open
   └── Typically: 60-120 seconds
   └── Balances resource usage and connection reuse
```

### Timeout Configuration

```java
// Java HttpClient
HttpClient client = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(2))    // TCP connect timeout
    .build();

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/data"))
    .timeout(Duration.ofSeconds(10))          // Request timeout
    .build();

// OkHttp
OkHttpClient client = new OkHttpClient.Builder()
    .connectTimeout(2, TimeUnit.SECONDS)
    .readTimeout(10, TimeUnit.SECONDS)
    .writeTimeout(10, TimeUnit.SECONDS)
    .callTimeout(30, TimeUnit.SECONDS)        // Total call timeout
    .build();

// Spring RestTemplate
@Bean
public RestTemplate restTemplate() {
    HttpComponentsClientHttpRequestFactory factory = 
        new HttpComponentsClientHttpRequestFactory();
    factory.setConnectTimeout(2000);          // 2 seconds
    factory.setReadTimeout(10000);            // 10 seconds
    return new RestTemplate(factory);
}
```

### Timeout Guidelines

| Operation Type | Timeout Range | Reasoning |
|---------------|---------------|-----------|
| **Simple read** | 1-5s | Should be fast |
| **Database query** | 5-30s | Depends on complexity |
| **File upload** | 60-300s | Large data transfer |
| **Report generation** | 60-600s | Complex processing |
| **External API** | 5-30s | Network variability |
| **Health check** | 2-5s | Must be quick |

### Deadline Propagation

```text
Problem: Nested service calls can exceed user's patience

User → Service A → Service B → Service C → Database
       5s timeout   5s timeout   5s timeout   5s timeout
                                             ↑
       If each takes 4 seconds... total = 16 seconds!
       User gave up after 10 seconds!

Solution: Deadline Propagation

User → Service A → Service B → Service C → Database
       ↓          ↓           ↓
       "10s left" "6s left"   "2s left"
       
Each service knows remaining time budget.
If deadline passed, don't even try.

Implementation:
- Pass deadline in header: X-Request-Deadline: 2024-01-29T12:00:00Z
- Calculate remaining time at each hop
- Fail fast if deadline already passed
```

---

## 3. Retry Strategies

### When to Retry

```text
✅ RETRY-SAFE (Transient errors):
├── Network timeout
├── Connection reset
├── 429 Too Many Requests (with backoff)
├── 503 Service Unavailable
├── 502 Bad Gateway
└── DNS resolution failure

❌ DON'T RETRY:
├── 400 Bad Request (client error, won't help)
├── 401/403 Unauthorized/Forbidden
├── 404 Not Found
├── 409 Conflict
├── 422 Validation Error
└── Any error indicating request is invalid
```

### Simple Retry

```java
// Basic retry (doesn't handle all cases)
public Response callWithRetry(Request request, int maxRetries) {
    Exception lastException = null;
    
    for (int attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return httpClient.execute(request);
        } catch (RetryableException e) {
            lastException = e;
            // Wait before retry (simple fixed delay)
            Thread.sleep(1000);
        }
    }
    throw new ServiceUnavailableException("All retries failed", lastException);
}
```

### Exponential Backoff

```text
Fixed delay: 1s, 1s, 1s, 1s...
Problem: All clients retry at same time → thundering herd!

Exponential backoff: 1s, 2s, 4s, 8s, 16s...
Each retry waits longer.
Reduces load on struggling server.

Formula:
delay = min(base * 2^attempt, maxDelay)

Example (base=1s, maxDelay=32s):
Attempt 1: 1s
Attempt 2: 2s
Attempt 3: 4s
Attempt 4: 8s
Attempt 5: 16s
Attempt 6: 32s (capped)
```

```java
public Response callWithExponentialBackoff(Request request) {
    int maxRetries = 5;
    long baseDelay = 1000;  // 1 second
    long maxDelay = 32000;  // 32 seconds
    
    for (int attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return httpClient.execute(request);
        } catch (RetryableException e) {
            if (attempt == maxRetries) {
                throw e;
            }
            
            long delay = Math.min(baseDelay * (long)Math.pow(2, attempt), maxDelay);
            Thread.sleep(delay);
        }
    }
}
```

### Exponential Backoff with Jitter

```text
Problem with pure exponential backoff:
All clients started at same time → All retry at same times!

Time 0:   [C1][C2][C3] → All fail
Time 1s:  [C1][C2][C3] → All retry together!
Time 2s:  [C1][C2][C3] → All retry together!

Solution: Add randomness (jitter)

Full Jitter:
delay = random(0, min(base * 2^attempt, maxDelay))

Equal Jitter:
temp = min(base * 2^attempt, maxDelay)
delay = temp/2 + random(0, temp/2)

Decorrelated Jitter (often best):
delay = random(base, prev_delay * 3)
```

```java
// Full jitter implementation
public Response callWithJitter(Request request) {
    int maxRetries = 5;
    long baseDelay = 1000;
    long maxDelay = 32000;
    Random random = new Random();
    
    for (int attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return httpClient.execute(request);
        } catch (RetryableException e) {
            if (attempt == maxRetries) {
                throw e;
            }
            
            long exponentialDelay = Math.min(baseDelay * (long)Math.pow(2, attempt), maxDelay);
            long jitteredDelay = random.nextLong(exponentialDelay);  // Full jitter
            Thread.sleep(jitteredDelay);
        }
    }
}
```

### Retry Libraries

```java
// Spring Retry
@Retryable(
    value = {RetryableException.class},
    maxAttempts = 5,
    backoff = @Backoff(delay = 1000, multiplier = 2, maxDelay = 32000)
)
public Response callExternalService() {
    return httpClient.call();
}

@Recover
public Response recover(RetryableException e) {
    // Fallback after all retries exhausted
    return Response.fallback();
}

// Resilience4j
RetryConfig config = RetryConfig.custom()
    .maxAttempts(5)
    .waitDuration(Duration.ofSeconds(1))
    .retryOnException(e -> e instanceof RetryableException)
    .build();

Retry retry = Retry.of("externalService", config);
Supplier<Response> decoratedSupplier = Retry
    .decorateSupplier(retry, () -> httpClient.call());

Response response = Try.ofSupplier(decoratedSupplier)
    .recover(throwable -> Response.fallback())
    .get();
```

---

## 4. Circuit Breaker Pattern

### The Problem

```text
Without circuit breaker:

Service A → Service B (down)
            Timeout 5s ✗
Service A → Service B (still down)
            Timeout 5s ✗
Service A → Service B (still down)
            Timeout 5s ✗
...repeat 1000 times...

Problems:
├── Wasted time waiting for timeouts
├── Threads blocked on failing calls
├── Resources exhausted
├── Cascading failure to callers of Service A
└── Prevents Service B from recovering (constant load)
```

### Circuit Breaker States

```text
                 ┌─────────────────────────────────────────────┐
                 │                  CLOSED                      │
                 │          (Normal operation)                  │
                 │                                              │
                 │  Requests pass through                       │
                 │  Track success/failure rate                  │
                 │                                              │
                 └──────────────────┬────────────────────────────┘
                                    │
                    Failure threshold exceeded
                         (e.g., 50% of last 100 calls)
                                    │
                                    ▼
                 ┌─────────────────────────────────────────────┐
                 │                   OPEN                       │
                 │         (Fail fast, no requests)            │
                 │                                              │
                 │  Requests immediately rejected               │
                 │  Return fallback/error                       │
                 │  Wait for timeout (e.g., 60 seconds)         │
                 │                                              │
                 └──────────────────┬────────────────────────────┘
                                    │
                      Timeout expires
                                    │
                                    ▼
                 ┌─────────────────────────────────────────────┐
                 │               HALF-OPEN                      │
                 │         (Test if service recovered)          │
                 │                                              │
                 │  Allow limited requests through              │
                 │  If success → CLOSED                         │
                 │  If failure → OPEN                           │
                 │                                              │
                 └─────────────────────────────────────────────┘
```

### Circuit Breaker Implementation

```java
// Resilience4j Circuit Breaker
CircuitBreakerConfig config = CircuitBreakerConfig.custom()
    .failureRateThreshold(50)                 // Open if 50% failures
    .waitDurationInOpenState(Duration.ofSeconds(60))  // Stay open 60s
    .slidingWindowSize(100)                   // Based on last 100 calls
    .slowCallDurationThreshold(Duration.ofSeconds(5))
    .slowCallRateThreshold(100)               // 100% slow = failure
    .permittedNumberOfCallsInHalfOpenState(10)
    .build();

CircuitBreaker circuitBreaker = CircuitBreaker.of("externalService", config);

Supplier<Response> decoratedSupplier = CircuitBreaker
    .decorateSupplier(circuitBreaker, () -> httpClient.call());

// Execute with fallback
Response response = Try.ofSupplier(decoratedSupplier)
    .recover(CallNotPermittedException.class, e -> Response.fallback())
    .recover(throwable -> Response.error())
    .get();
```

```java
// Spring Cloud Circuit Breaker
@CircuitBreaker(name = "externalService", fallbackMethod = "fallback")
public Response callExternalService() {
    return httpClient.call();
}

public Response fallback(Exception e) {
    return Response.fallback();
}
```

### Circuit Breaker Metrics

```text
Key metrics to monitor:

1. State transitions: CLOSED → OPEN → HALF-OPEN → CLOSED
   Alert when circuit opens!

2. Failure rate: % of failed requests
   Watch for degradation before threshold

3. Slow call rate: % of calls exceeding slow threshold
   Often indicates impending failure

4. Rejected calls: Requests rejected while OPEN
   Shows impact of circuit being open

5. Successful calls in HALF-OPEN
   Shows recovery progress
```

---

## 5. Idempotency

### Why Idempotency Matters

```text
Scenario: User clicks "Pay $100" button

Request 1: POST /pay {"amount": 100}
           (network timeout, but server processed!)
           
Client retries:
Request 2: POST /pay {"amount": 100}
           (server processes again!)
           
User charged $200! 💀

With idempotency:
Request 1: POST /pay {"amount": 100, "idempotency_key": "abc123"}
           (timeout, but processed)
           
Request 2: POST /pay {"amount": 100, "idempotency_key": "abc123"}
           (server: "I've seen abc123, return previous result")
           
User charged correctly!
```

### Idempotency Key Pattern

```text
┌─────────────────────────────────────────────────────────────────┐
│                    IDEMPOTENCY FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Client                     Server                               │
│    │                          │                                  │
│    │── POST /pay ────────────→│                                  │
│    │   Idempotency-Key: xyz   │                                  │
│    │                          │─── Check: Is "xyz" in cache?     │
│    │                          │    NO → Process request          │
│    │                          │         Store: xyz → result      │
│    │                          │                                  │
│    │←── 200 OK ───────────────│                                  │
│    │   (charge $100)          │                                  │
│    │                          │                                  │
│    │── POST /pay (retry) ────→│                                  │
│    │   Idempotency-Key: xyz   │                                  │
│    │                          │─── Check: Is "xyz" in cache?     │
│    │                          │    YES → Return cached result    │
│    │                          │                                  │
│    │←── 200 OK ───────────────│                                  │
│    │   (same result, no charge)│                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

```java
@RestController
public class PaymentController {
    
    @Autowired
    private RedisTemplate<String, String> redis;
    
    @PostMapping("/pay")
    public ResponseEntity<PaymentResult> pay(
            @RequestBody PaymentRequest request,
            @RequestHeader("Idempotency-Key") String idempotencyKey) {
        
        // Check if we've seen this key
        String cachedResult = redis.opsForValue().get("idempotency:" + idempotencyKey);
        if (cachedResult != null) {
            return ResponseEntity.ok(deserialize(cachedResult));
        }
        
        // Acquire lock to prevent race conditions
        Boolean locked = redis.opsForValue().setIfAbsent(
            "lock:" + idempotencyKey, 
            "1", 
            Duration.ofMinutes(5)
        );
        
        if (!locked) {
            // Another request is processing, wait and return cached
            return ResponseEntity.status(409).build();  // Conflict
        }
        
        try {
            // Process payment
            PaymentResult result = paymentService.process(request);
            
            // Store result (TTL 24 hours)
            redis.opsForValue().set(
                "idempotency:" + idempotencyKey,
                serialize(result),
                Duration.ofHours(24)
            );
            
            return ResponseEntity.ok(result);
        } finally {
            redis.delete("lock:" + idempotencyKey);
        }
    }
}
```

### Idempotency Key Best Practices

```text
Client Responsibilities:
├── Generate unique key per logical operation
├── Use same key for retries of same operation
├── Use UUIDv4 or similar (high entropy)
└── Store key until operation confirmed

Server Responsibilities:
├── Store key → result mapping
├── Return cached result for duplicate keys
├── Handle concurrent requests for same key (locking)
├── Set reasonable TTL (24-48 hours typical)
└── Document which endpoints are idempotent
```

---

## 6. Cascading Failures

### How Cascading Failures Happen

```text
Normal state:
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│Service │────→│Service │────→│Service │────→│Database│
│   A    │     │   B    │     │   C    │     │        │
└────────┘     └────────┘     └────────┘     └────────┘
   100%           100%           100%           100%

Database becomes slow:
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│Service │────→│Service │────→│Service │ ←───│Database│
│   A    │     │   B    │     │   C    │     │ SLOW!  │
└────────┘     └────────┘     └────────┘     └────────┘
                              ↓
                        C's threads pile up
                        waiting for database
                              ↓
                        C can't handle requests
                              ↓
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│Service │────→│Service │ ←───│Service │     │Database│
│   A    │     │   B    │     │   C    │     │ SLOW!  │
└────────┘     └────────┘     │TIMEOUT!│     └────────┘
                              └────────┘
                              ↓
                        B's threads pile up
                        waiting for C
                              ↓
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│Service │←────│Service │     │Service │     │Database│
│   A    │     │   B    │     │   C    │     │ SLOW!  │
│TIMEOUT!│     │TIMEOUT!│     │TIMEOUT!│     └────────┘
└────────┘     └────────┘     └────────┘
                              ↓
                    ENTIRE SYSTEM DOWN!
```

### Prevention Strategies

```text
1. TIMEOUTS (prevent infinite waiting)
   └── Always set timeouts on all external calls
   └── Propagate deadlines through the system

2. CIRCUIT BREAKER (fail fast)
   └── Stop calling failing service
   └── Return fallback immediately

3. BULKHEAD (isolate failures)
   └── Separate thread pools per dependency
   └── One slow service doesn't block others

4. RATE LIMITING (prevent overload)
   └── Limit incoming requests
   └── Reject with 429 before resources exhausted

5. LOAD SHEDDING (graceful degradation)
   └── Drop lower priority requests under load
   └── Serve critical paths first

6. RETRY BUDGET (prevent retry storms)
   └── Limit % of requests that can be retries
   └── Prevent amplification effect
```

### Bulkhead Pattern

```text
Without Bulkhead:
┌─────────────────────────────────────────────────────┐
│              SHARED THREAD POOL (100 threads)        │
│                                                      │
│  Calls to Service A ──────────────┐                  │
│  Calls to Service B ──────────────┼─→ [100 threads]  │
│  Calls to Service C ──────────────┘                  │
│                                                      │
│  If Service A is slow, it consumes all threads!     │
│  Services B and C can't be reached!                 │
└─────────────────────────────────────────────────────┘

With Bulkhead:
┌─────────────────────────────────────────────────────┐
│                                                      │
│  Calls to Service A ──────→ [30 threads]            │
│                              (isolated pool)         │
│                                                      │
│  Calls to Service B ──────→ [30 threads]            │
│                              (isolated pool)         │
│                                                      │
│  Calls to Service C ──────→ [40 threads]            │
│                              (isolated pool)         │
│                                                      │
│  If Service A is slow, only its pool is affected!   │
│  Services B and C continue working!                 │
└─────────────────────────────────────────────────────┘
```

```java
// Resilience4j Bulkhead
BulkheadConfig config = BulkheadConfig.custom()
    .maxConcurrentCalls(30)          // Max concurrent calls
    .maxWaitDuration(Duration.ofMillis(500))  // Wait for slot
    .build();

Bulkhead bulkhead = Bulkhead.of("serviceA", config);

Supplier<Response> decoratedSupplier = Bulkhead
    .decorateSupplier(bulkhead, () -> serviceA.call());
```

---

## 7. Rate Limiting

### Token Bucket Algorithm

```text
Token Bucket:
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  Tokens added at fixed rate (e.g., 10/second)              │
│              │                                             │
│              ▼                                             │
│  ┌──────────────────────────────────────┐                 │
│  │ Bucket (max 100 tokens)               │                 │
│  │ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ← Current: 85     │                 │
│  └──────────────────────────────────────┘                 │
│              │                                             │
│              ▼                                             │
│  Request arrives:                                          │
│  ├── Has tokens? Take 1, allow request                     │
│  └── No tokens? Reject with 429                            │
│                                                            │
│  Allows bursts (up to bucket capacity)                     │
│  But sustained rate limited                                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Rate Limit Response

```text
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706550000

{
    "error": "rate_limit_exceeded",
    "message": "You have exceeded the rate limit. Try again in 30 seconds.",
    "retry_after": 30
}

Headers explained:
├── X-RateLimit-Limit: Maximum requests allowed
├── X-RateLimit-Remaining: Requests left in window
├── X-RateLimit-Reset: Unix timestamp when limit resets
└── Retry-After: Seconds until retry is allowed
```

### Rate Limiting Implementation

```java
// Redis-based rate limiting (sliding window)
@Component
public class RateLimiter {
    
    @Autowired
    private RedisTemplate<String, String> redis;
    
    public boolean isAllowed(String key, int limit, Duration window) {
        long now = System.currentTimeMillis();
        long windowStart = now - window.toMillis();
        String redisKey = "ratelimit:" + key;
        
        // Remove old entries
        redis.opsForZSet().removeRangeByScore(redisKey, 0, windowStart);
        
        // Count requests in window
        Long count = redis.opsForZSet().count(redisKey, windowStart, now);
        
        if (count != null && count >= limit) {
            return false;  // Rate limited
        }
        
        // Add current request
        redis.opsForZSet().add(redisKey, String.valueOf(now), now);
        redis.expire(redisKey, window.plusSeconds(60));
        
        return true;  // Allowed
    }
}
```

---

## 8. Interview Questions

### Q1: How would you implement retries in a distributed system?

```text
Answer:
"I'd implement retries with several key considerations:

1. Retry only idempotent operations or use idempotency keys
   - GET is naturally idempotent
   - POST/PUT/DELETE need idempotency keys

2. Use exponential backoff with jitter
   - Prevents thundering herd
   - Example: 1s, 2s, 4s, 8s with random jitter

3. Set maximum retry count and total timeout
   - Don't retry forever
   - Respect deadline propagation

4. Only retry transient errors
   - 5xx, timeouts, connection errors: retry
   - 4xx (except 429): don't retry

5. Combine with circuit breaker
   - Stop retrying if service is clearly down
   - Fail fast instead of exhausting retries

6. Monitor retry rates
   - High retry rate indicates underlying issue
   - Alert on anomalies"
```

### Q2: Explain the circuit breaker pattern

```text
Answer:
"A circuit breaker prevents cascading failures by failing fast when
a downstream service is unhealthy:

States:
1. CLOSED: Normal operation, requests pass through
   - Track success/failure rate
   - Open when failure rate exceeds threshold (e.g., 50%)

2. OPEN: Fail fast, no requests to downstream
   - Return fallback/error immediately
   - Wait for timeout (e.g., 60 seconds)

3. HALF-OPEN: Test if service recovered
   - Allow small number of test requests
   - Success → CLOSED
   - Failure → OPEN

Benefits:
- Prevents thread pool exhaustion
- Gives failing service time to recover
- Provides fallback behavior
- Enables graceful degradation

Configuration matters:
- Failure threshold: not too sensitive (false opens)
- Window size: enough samples for accurate rate
- Recovery timeout: balance between quick recovery and giving time"
```

### Q3: What is idempotency and why is it important?

```text
Answer:
"Idempotency means making the same request multiple times produces
the same result as making it once.

Why it matters in distributed systems:
- Network failures cause retries
- Without idempotency, retries cause duplicate effects
- Example: Charging customer twice for same order

Implementation:
1. Client generates unique idempotency key per operation
2. Client sends key with request
3. Server stores key → result mapping
4. On duplicate key, return stored result instead of reprocessing

Storage considerations:
- Use Redis/DynamoDB for fast lookup
- Set TTL (24-48 hours typical)
- Handle concurrent requests (locking)

HTTP methods:
- GET, PUT, DELETE are naturally idempotent by definition
- POST typically needs explicit idempotency key"
```

### Q4: How do you prevent cascading failures?

```text
Answer:
"I'd use multiple layers of protection:

1. Timeouts everywhere:
   - Connection timeout: 2s
   - Request timeout: 10-30s
   - Propagate deadlines through call chain

2. Circuit breakers:
   - Stop calling failing services
   - Return fallback quickly
   - One per downstream dependency

3. Bulkheads:
   - Isolate thread pools per dependency
   - Slow service doesn't consume all threads
   - Limits blast radius of failures

4. Rate limiting:
   - Prevent overload from upstream
   - Shed load gracefully with 429

5. Graceful degradation:
   - Serve cached data when source unavailable
   - Disable non-critical features under load
   - Provide reduced functionality vs. complete failure

6. Health checks & quick failover:
   - Remove unhealthy instances fast
   - Route around failures

7. Monitoring & alerting:
   - Detect issues before cascading
   - Auto-remediation when possible"
```

### Q5: Design a reliable payment system

```text
Answer:
"For a payment system, reliability is critical:

1. Idempotency (prevent double charges):
   - Client generates payment_intent_id
   - Server checks if ID already processed
   - Return existing result for duplicates

2. At-least-once delivery with deduplication:
   - Store payment state machine
   - Retry failed steps
   - Idempotency ensures no double processing

3. State machine:
   PENDING → AUTHORIZED → CAPTURED → COMPLETED
          ↘ FAILED

4. Timeouts & circuit breakers:
   - Payment provider has SLA
   - Circuit breaker prevents cascading
   - Fallback: queue for later processing

5. Compensation (saga pattern):
   - If step 3 fails, undo step 2
   - Eventually consistent
   - Record all state transitions

6. Reconciliation:
   - Daily comparison with payment provider
   - Detect and resolve discrepancies

7. Monitoring:
   - Alert on failure rate spikes
   - Track latency percentiles
   - Dashboard for real-time visibility"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│                   RELIABILITY PATTERNS CHEAT SHEET                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ TIMEOUTS:                                                             │
│ ├── Always set timeouts on external calls                            │
│ ├── Connection: 1-5s, Request: 5-30s                                  │
│ └── Propagate deadlines through service chain                         │
│                                                                       │
│ RETRIES:                                                              │
│ ├── Exponential backoff: delay = base * 2^attempt                     │
│ ├── Add jitter to prevent thundering herd                             │
│ ├── Only retry transient errors (5xx, timeout, connection)            │
│ └── Set max retries and total timeout                                 │
│                                                                       │
│ CIRCUIT BREAKER:                                                      │
│ ├── CLOSED: Normal, track failures                                    │
│ ├── OPEN: Fail fast, return fallback                                  │
│ └── HALF-OPEN: Test with limited requests                             │
│                                                                       │
│ IDEMPOTENCY:                                                          │
│ ├── Client generates unique key per operation                         │
│ ├── Server stores key → result (Redis, 24h TTL)                       │
│ └── Return cached result for duplicate keys                           │
│                                                                       │
│ BULKHEAD:                                                             │
│ ├── Isolate thread pools per dependency                               │
│ └── Slow dependency doesn't consume all resources                     │
│                                                                       │
│ RATE LIMITING:                                                        │
│ ├── Token bucket: allows burst, limits sustained rate                 │
│ ├── Return 429 with Retry-After header                                │
│ └── Include rate limit headers in response                            │
│                                                                       │
│ CASCADING FAILURE PREVENTION:                                         │
│ └── Timeouts + Circuit Breaker + Bulkhead + Rate Limiting             │
│                                                                       │
│ LIBRARIES:                                                            │
│ ├── Resilience4j (Java)                                               │
│ ├── Polly (.NET)                                                      │
│ └── failsafe-go (Go)                                                  │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Congratulations!** You've completed the Computer Networks section. These patterns are essential for building reliable distributed systems.

**Back to:** [← Computer Networks Overview](./intro)
