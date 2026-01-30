---
title: 4. Design Rate Limiter
sidebar_position: 4
description: Complete system design for distributed rate limiter - algorithms, Redis implementation, API gateway.
keywords: [rate limiter, token bucket, sliding window, api gateway, throttling]
---

# Design Rate Limiter

:::info Interview Essential
Rate limiters are fundamental to API security and fair usage. You'll be asked about algorithms, distributed implementation, and handling edge cases.
:::

## Step 1: Requirements (5 min)

### Functional Requirements

```text
1. Limit number of requests per user/IP per time window
2. Support different rate limits for different APIs
3. Return informative response when rate limited
4. Must work in distributed environment
5. Low latency (should not slow down requests)
```

### Non-Functional Requirements

```text
1. Low latency: <1ms overhead per request
2. Accurate: No more than 1% error in limits
3. Distributed: Work across multiple servers
4. Fault tolerant: If rate limiter fails, allow traffic
5. Memory efficient: Handle millions of users
```

### Clarifying Questions

```text
Q: Where to implement - client, server, or API gateway?
A: API Gateway level (centralized)

Q: What happens when rate limited?
A: Return 429 Too Many Requests with retry-after header

Q: What are the rate limits?
A: Different per tier: Free=10/min, Pro=100/min, Enterprise=1000/min

Q: Per user or per IP?
A: Per user (authenticated), fallback to IP (anonymous)
```

---

## Step 2: Rate Limiting Algorithms

### Algorithm Comparison

```text
┌─────────────────────────────────────────────────────────────────────┐
│                  RATE LIMITING ALGORITHMS                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ 1. TOKEN BUCKET                                                     │
│    ┌─────────────────┐                                              │
│    │  Bucket (10)    │ ← Tokens refill at rate R                   │
│    │  ●●●●●●●○○○     │                                              │
│    └────────┬────────┘                                              │
│             │                                                        │
│    Request consumes 1 token                                         │
│    ✅ Allows bursts up to bucket size                               │
│    ✅ Smooths out traffic over time                                 │
│                                                                      │
│ 2. LEAKY BUCKET                                                     │
│    ┌─────────────────┐                                              │
│    │  Queue (FIFO)   │ ← Requests added to queue                   │
│    │  ○─○─○─○─○─○─○  │                                              │
│    └────────┬────────┘                                              │
│             ▼ Processed at fixed rate                               │
│    ✅ Constant output rate                                          │
│    ❌ Bursts cause delays, not rejections                           │
│                                                                      │
│ 3. FIXED WINDOW                                                     │
│    │ Window 1  │ Window 2  │ Window 3  │                           │
│    │ 0:00-1:00 │ 1:00-2:00 │ 2:00-3:00 │                           │
│    │  Count=8  │  Count=3  │  Count=?  │                           │
│    ❌ Burst at window boundary (2x limit)                           │
│                                                                      │
│ 4. SLIDING WINDOW LOG                                               │
│    │ Request timestamps stored │                                    │
│    │ Count requests in last N seconds │                             │
│    ✅ Accurate                                                       │
│    ❌ Memory intensive (store all timestamps)                       │
│                                                                      │
│ 5. SLIDING WINDOW COUNTER (Best for APIs)                           │
│    │ Combine fixed windows with weighted average │                  │
│    │ curr_count = prev_count × overlap% + curr_count │              │
│    ✅ Memory efficient + accurate                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Token Bucket - Deep Dive

```text
Parameters:
- Bucket size (b): Maximum burst size
- Refill rate (r): Tokens added per second

Example: b=10, r=2 tokens/sec
┌──────────────────────────────────────────┐
│ Time 0:  Bucket = 10 tokens              │
│ Request: Consume 1 → Bucket = 9          │
│ Request: Consume 1 → Bucket = 8          │
│ ...                                       │
│ Request: Consume 1 → Bucket = 0          │
│ Request: REJECTED (no tokens)            │
│                                          │
│ Time +1s: Refill 2 → Bucket = 2          │
│ Request: Consume 1 → Bucket = 1          │
│ Request: Consume 1 → Bucket = 0          │
│ Request: REJECTED                        │
└──────────────────────────────────────────┘

Pros: Simple, allows bursts, memory efficient
Cons: Doesn't guarantee even distribution
```

### Sliding Window Counter - Deep Dive

```text
Parameters:
- Window size: 1 minute
- Limit: 100 requests

How it works:
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│  Previous Window    │    Current Window                          │
│  (0:00 - 1:00)      │    (1:00 - 2:00)                           │
│  Count: 80          │    Count: 30                               │
│                     │                                            │
│  Current time: 1:15 (25% into current window)                    │
│  Overlap with previous window: 75%                               │
│                                                                   │
│  Effective count = 80 × 0.75 + 30 = 90                           │
│                                                                   │
│  New request arrives:                                             │
│  90 + 1 = 91 < 100 → ALLOWED                                     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

Pros: Smooth, memory efficient (2 counters per user)
Cons: Slightly approximate (usually acceptable)
```

---

## Step 3: High-Level Design

### Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    RATE LIMITER ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────┐                                                       │
│   │  Client  │                                                       │
│   └────┬─────┘                                                       │
│        │                                                             │
│        ▼                                                             │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                     API GATEWAY                              │   │
│   │  ┌─────────────────────────────────────────────────────┐    │   │
│   │  │             RATE LIMITER MIDDLEWARE                  │    │   │
│   │  │                                                      │    │   │
│   │  │  1. Extract client ID (user_id or IP)               │    │   │
│   │  │  2. Get rate limit config for endpoint               │    │   │
│   │  │  3. Check Redis for current count                    │    │   │
│   │  │  4. If under limit → Allow + increment               │    │   │
│   │  │  5. If over limit → Return 429                       │    │   │
│   │  │                                                      │    │   │
│   │  └──────────────────────┬───────────────────────────────┘    │   │
│   │                         │                                    │   │
│   └─────────────────────────┼────────────────────────────────────┘   │
│                             │                                        │
│                             ▼                                        │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                     REDIS CLUSTER                            │   │
│   │                                                              │   │
│   │   ┌───────────┐  ┌───────────┐  ┌───────────┐              │   │
│   │   │  Node 1   │  │  Node 2   │  │  Node 3   │              │   │
│   │   │           │  │           │  │           │              │   │
│   │   │ user:123  │  │ user:456  │  │ user:789  │              │   │
│   │   │ count: 45 │  │ count: 12 │  │ count: 98 │              │   │
│   │   └───────────┘  └───────────┘  └───────────┘              │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│                             │                                        │
│                             ▼                                        │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                   BACKEND SERVICES                           │   │
│   │                                                              │   │
│   │   ┌───────────┐  ┌───────────┐  ┌───────────┐              │   │
│   │   │  Service  │  │  Service  │  │  Service  │              │   │
│   │   │     A     │  │     B     │  │     C     │              │   │
│   │   └───────────┘  └───────────┘  └───────────┘              │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Rate Limit Rules Configuration

```yaml
# Rate limit rules per endpoint/tier
rate_limits:
  default:
    requests: 100
    window: 60  # seconds
    
  endpoints:
    "/api/search":
      requests: 30
      window: 60
      
    "/api/upload":
      requests: 10
      window: 60
      
  tiers:
    free:
      multiplier: 1.0
    pro:
      multiplier: 10.0
    enterprise:
      multiplier: 100.0
```

---

## Step 4: Deep Dive - Implementation

### Token Bucket with Redis

```java
@Service
public class TokenBucketRateLimiter {
    
    @Autowired
    private StringRedisTemplate redis;
    
    private static final int BUCKET_SIZE = 10;
    private static final int REFILL_RATE = 2;  // tokens per second
    
    /**
     * Returns true if request is allowed, false if rate limited
     */
    public boolean tryAcquire(String clientId) {
        String key = "ratelimit:" + clientId;
        
        // Lua script for atomic token bucket
        String script = """
            local key = KEYS[1]
            local bucket_size = tonumber(ARGV[1])
            local refill_rate = tonumber(ARGV[2])
            local now = tonumber(ARGV[3])
            
            local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
            local tokens = tonumber(bucket[1]) or bucket_size
            local last_refill = tonumber(bucket[2]) or now
            
            -- Calculate tokens to add
            local elapsed = now - last_refill
            local tokens_to_add = elapsed * refill_rate
            tokens = math.min(bucket_size, tokens + tokens_to_add)
            
            -- Try to consume a token
            if tokens >= 1 then
                tokens = tokens - 1
                redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
                redis.call('EXPIRE', key, 60)
                return 1
            else
                redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
                redis.call('EXPIRE', key, 60)
                return 0
            end
            """;
        
        Long result = redis.execute(
            RedisScript.of(script, Long.class),
            List.of(key),
            String.valueOf(BUCKET_SIZE),
            String.valueOf(REFILL_RATE),
            String.valueOf(System.currentTimeMillis() / 1000.0)
        );
        
        return result != null && result == 1;
    }
}
```

### Sliding Window Counter with Redis

```java
@Service
public class SlidingWindowRateLimiter {
    
    @Autowired
    private StringRedisTemplate redis;
    
    /**
     * Sliding window counter - more accurate for APIs
     */
    public RateLimitResult checkLimit(String clientId, int limit, int windowSeconds) {
        String key = "ratelimit:sw:" + clientId;
        long now = System.currentTimeMillis();
        long windowStart = now - (windowSeconds * 1000);
        
        String script = """
            local key = KEYS[1]
            local now = tonumber(ARGV[1])
            local window_start = tonumber(ARGV[2])
            local limit = tonumber(ARGV[3])
            local window_seconds = tonumber(ARGV[4])
            
            -- Remove old entries
            redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
            
            -- Count current requests
            local count = redis.call('ZCARD', key)
            
            if count < limit then
                -- Add current request
                redis.call('ZADD', key, now, now .. ':' .. math.random())
                redis.call('EXPIRE', key, window_seconds)
                return {1, limit - count - 1}
            else
                return {0, 0}
            end
            """;
        
        List<Long> result = redis.execute(
            RedisScript.of(script, List.class),
            List.of(key),
            String.valueOf(now),
            String.valueOf(windowStart),
            String.valueOf(limit),
            String.valueOf(windowSeconds)
        );
        
        boolean allowed = result.get(0) == 1;
        int remaining = result.get(1).intValue();
        
        return new RateLimitResult(allowed, remaining, windowSeconds);
    }
}

public record RateLimitResult(
    boolean allowed,
    int remaining,
    int retryAfterSeconds
) {}
```

### Rate Limiter Middleware

```java
@Component
public class RateLimiterFilter implements Filter {
    
    @Autowired
    private SlidingWindowRateLimiter rateLimiter;
    
    @Autowired
    private RateLimitConfigService configService;
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                         FilterChain chain) throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        // 1. Extract client identifier
        String clientId = extractClientId(httpRequest);
        
        // 2. Get rate limit config for this endpoint
        String endpoint = httpRequest.getRequestURI();
        RateLimitConfig config = configService.getConfig(endpoint, clientId);
        
        // 3. Check rate limit
        RateLimitResult result = rateLimiter.checkLimit(
            clientId + ":" + endpoint,
            config.limit(),
            config.windowSeconds()
        );
        
        // 4. Set response headers
        httpResponse.setHeader("X-RateLimit-Limit", String.valueOf(config.limit()));
        httpResponse.setHeader("X-RateLimit-Remaining", String.valueOf(result.remaining()));
        httpResponse.setHeader("X-RateLimit-Reset", 
            String.valueOf(System.currentTimeMillis() / 1000 + result.retryAfterSeconds()));
        
        if (!result.allowed()) {
            // 5. Return 429 if rate limited
            httpResponse.setStatus(429);
            httpResponse.setHeader("Retry-After", String.valueOf(result.retryAfterSeconds()));
            httpResponse.getWriter().write("""
                {
                    "error": "Too Many Requests",
                    "message": "Rate limit exceeded. Try again later.",
                    "retryAfter": %d
                }
                """.formatted(result.retryAfterSeconds()));
            return;
        }
        
        // 6. Allow request to proceed
        chain.doFilter(request, response);
    }
    
    private String extractClientId(HttpServletRequest request) {
        // Prefer user ID for authenticated requests
        String userId = request.getHeader("X-User-Id");
        if (userId != null) {
            return "user:" + userId;
        }
        
        // Fallback to IP for anonymous
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null) {
            return "ip:" + ip.split(",")[0].trim();
        }
        
        return "ip:" + request.getRemoteAddr();
    }
}
```

---

## Step 5: Handling Edge Cases

### Race Conditions

```text
Problem: Two requests arrive simultaneously, both check count = 99 (limit 100),
         both increment → count becomes 101!

Solution: Use atomic operations in Redis (Lua scripts)
- Lua scripts are atomic in Redis
- Check and increment in single operation
- No race condition possible
```

### Distributed Synchronization

```text
Problem: Rate limiter runs on multiple API Gateway instances

Solution: 
1. Use Redis as central state store (already covered)
2. All instances check/update same Redis keys
3. Redis Cluster for high availability
```

### Failure Handling

```text
Problem: Redis becomes unavailable

Solutions:
1. Fail OPEN (allow traffic)
   - Better UX, but no protection
   - Use for non-critical limits

2. Fail CLOSED (block traffic)
   - Safety first
   - Use for security-critical limits

3. Local fallback rate limit
   - Each server maintains local counter
   - Less accurate but still provides protection
```

```java
public boolean tryAcquireWithFallback(String clientId) {
    try {
        return rateLimiter.tryAcquire(clientId);
    } catch (RedisConnectionFailureException e) {
        log.warn("Redis unavailable, using local fallback");
        return localRateLimiter.tryAcquire(clientId);
    }
}
```

### Hot Keys (Celebrity Problem)

```text
Problem: One user makes millions of requests, 
         all hitting same Redis key → Hot key!

Solutions:
1. Shard key across multiple Redis keys
   key = "ratelimit:" + clientId + ":" + (hash % 10)
   Sum all shards for actual count

2. Local caching with short TTL
   Cache rate limit result for 100ms locally
   Reduces Redis calls by 90%

3. Separate handling for known heavy users
   Route to dedicated rate limit cluster
```

---

## Step 6: Rate Limiting Strategies

### Multi-Level Rate Limiting

```text
┌─────────────────────────────────────────────────────────────────────┐
│                  MULTI-LEVEL RATE LIMITING                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Level 1: Per-Second (Burst Protection)                            │
│   └── 10 requests/second max                                        │
│                                                                      │
│   Level 2: Per-Minute (Normal Usage)                                │
│   └── 100 requests/minute max                                       │
│                                                                      │
│   Level 3: Per-Hour (Abuse Prevention)                              │
│   └── 1000 requests/hour max                                        │
│                                                                      │
│   Level 4: Per-Day (Quota)                                          │
│   └── 10000 requests/day max                                        │
│                                                                      │
│   Request must pass ALL levels to be allowed                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Cost-Based Rate Limiting

```text
Different endpoints have different "costs":

POST /api/search        →  cost: 1
POST /api/upload        →  cost: 10
POST /api/heavy-compute →  cost: 50

Budget: 100 units per minute

User can make:
- 100 searches, OR
- 10 uploads, OR
- 2 heavy computes, OR
- Any combination totaling ≤ 100
```

---

## Complete System Summary

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      RATE LIMITER SUMMARY                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  REQUEST FLOW:                                                       │
│  1. Request arrives at API Gateway                                  │
│  2. Extract client ID (user_id or IP)                               │
│  3. Check rate limit in Redis (atomic Lua script)                   │
│  4. If allowed: forward to backend, set headers                     │
│  5. If blocked: return 429 with Retry-After                         │
│                                                                      │
│  KEY COMPONENTS:                                                     │
│  • API Gateway with rate limit middleware                           │
│  • Redis for distributed state                                      │
│  • Config service for rules                                         │
│  • Monitoring for visibility                                        │
│                                                                      │
│  ALGORITHM CHOICE:                                                   │
│  • Token Bucket: Simple, allows bursts                              │
│  • Sliding Window: More accurate for APIs                           │
│  • Choose based on requirements                                     │
│                                                                      │
│  HEADERS TO RETURN:                                                  │
│  • X-RateLimit-Limit: Maximum requests allowed                      │
│  • X-RateLimit-Remaining: Requests left in window                   │
│  • X-RateLimit-Reset: Unix timestamp when limit resets              │
│  • Retry-After: Seconds to wait (when rate limited)                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Interview Tips

```text
✅ Discuss multiple algorithms and trade-offs
✅ Explain why Redis (distributed, atomic operations)
✅ Mention Lua scripts for atomicity
✅ Discuss failure handling (fail open vs closed)
✅ Cover response headers (429, Retry-After)
✅ Mention multi-level limits for different use cases

❌ Don't forget about distributed nature
❌ Don't ignore race conditions
❌ Don't skip failure scenarios
```

---

**Next:** [5. Design Twitter Feed →](./05-twitter-feed)
