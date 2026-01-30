---
title: 4. Multi-Level Caching
sidebar_position: 4
description: Master multi-level caching, CDN, browser caching, and cache warming strategies for interviews.
keywords: [multi-level cache, l1 l2 cache, cdn, cache warming, caffeine, distributed cache]
---

# Multi-Level Caching

:::tip Performance Optimization
Multi-level caching can reduce latency by **10x** compared to single-level caching. Understanding the hierarchy is crucial for system design interviews.
:::

## 1. Cache Hierarchy Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    MULTI-LEVEL CACHE HIERARCHY                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   User Request                                                       │
│        │                                                             │
│        ▼                                                             │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  L0: BROWSER CACHE                                          │   │
│   │  ├── HTTP Cache Headers (Cache-Control, ETag)               │   │
│   │  ├── LocalStorage/SessionStorage                            │   │
│   │  └── Latency: 0ms (no network)                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│        │ Miss                                                        │
│        ▼                                                             │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  L1: CDN (Edge Cache)                                       │   │
│   │  ├── CloudFront, Akamai, Cloudflare                         │   │
│   │  ├── Static assets + API responses                          │   │
│   │  └── Latency: 10-50ms (geographically close)                │   │
│   └─────────────────────────────────────────────────────────────┘   │
│        │ Miss                                                        │
│        ▼                                                             │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  L2: APPLICATION CACHE (In-Process)                         │   │
│   │  ├── Caffeine, Guava Cache                                  │   │
│   │  ├── JVM heap memory                                        │   │
│   │  └── Latency: sub-1ms (no network)                          │   │
│   └─────────────────────────────────────────────────────────────┘   │
│        │ Miss                                                        │
│        ▼                                                             │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  L3: DISTRIBUTED CACHE                                      │   │
│   │  ├── Redis, Memcached                                       │   │
│   │  ├── Shared across all app instances                        │   │
│   │  └── Latency: 1-5ms (network)                               │   │
│   └─────────────────────────────────────────────────────────────┘   │
│        │ Miss                                                        │
│        ▼                                                             │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  L4: DATABASE                                               │   │
│   │  ├── PostgreSQL, MySQL                                      │   │
│   │  └── Latency: 5-50ms                                        │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Latency Comparison

| Cache Level | Latency | Capacity | Scope |
|-------------|---------|----------|-------|
| Browser (L0) | 0ms | ~50MB | Single user |
| CDN (L1) | 10-50ms | Unlimited | Global |
| App Cache (L2) | sub-1ms | ~1GB | Single instance |
| Redis (L3) | 1-5ms | ~100GB | All instances |
| Database (L4) | 5-50ms | Unlimited | Source of truth |

---

## 2. L1: In-Process Cache (Caffeine)

### Why Local Cache?

```text
Even with Redis (1ms), high-traffic applications benefit from L1:

Without L1:
├── 10,000 requests/second
├── 10,000 Redis calls/second
├── 10,000ms total latency per second
└── Network bandwidth consumption

With L1 (90% hit rate):
├── 10,000 requests/second
├── 1,000 Redis calls/second (90% served locally)
├── 1,000ms total latency per second
└── 10x less network traffic
```

### Caffeine Setup

```java
@Configuration
public class CacheConfig {
    
    @Bean
    public Cache<Long, User> userCache() {
        return Caffeine.newBuilder()
            .maximumSize(10_000)                    // Max 10k entries
            .expireAfterWrite(Duration.ofMinutes(5)) // TTL 5 minutes
            .expireAfterAccess(Duration.ofMinutes(1)) // Idle timeout
            .recordStats()                           // Enable metrics
            .build();
    }
}

@Service
public class UserService {
    
    @Autowired
    private Cache<Long, User> userCache;
    
    @Autowired
    private StringRedisTemplate redis;
    
    public User getUser(Long userId) {
        // L1: Check local cache first
        User user = userCache.getIfPresent(userId);
        if (user != null) {
            return user;  // L1 hit - fastest!
        }
        
        // L2: Check Redis
        String userJson = redis.opsForValue().get("user:" + userId);
        if (userJson != null) {
            user = parseUser(userJson);
            userCache.put(userId, user);  // Populate L1
            return user;
        }
        
        // L3: Database
        user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            redis.opsForValue().set("user:" + userId, toJson(user), 
                Duration.ofMinutes(30));
            userCache.put(userId, user);
        }
        
        return user;
    }
}
```

### Spring Cache Abstraction (Multi-Level)

```java
@Configuration
@EnableCaching
public class MultiLevelCacheConfig {
    
    @Bean
    public CacheManager cacheManager(RedisConnectionFactory redisFactory) {
        // L1: Caffeine (local)
        CaffeineCacheManager caffeineManager = new CaffeineCacheManager();
        caffeineManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(1)));
        
        // L2: Redis (distributed)
        RedisCacheManager redisManager = RedisCacheManager.builder(redisFactory)
            .cacheDefaults(RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(30)))
            .build();
        
        // Composite: Try L1 first, then L2
        return new CompositeCacheManager(caffeineManager, redisManager);
    }
}

// Or use custom implementation
public class TwoLevelCacheManager implements CacheManager {
    
    private final CaffeineCacheManager l1;
    private final RedisCacheManager l2;
    
    @Override
    public Cache getCache(String name) {
        return new TwoLevelCache(
            l1.getCache(name),
            l2.getCache(name)
        );
    }
}

public class TwoLevelCache implements Cache {
    
    private final Cache l1;  // Caffeine
    private final Cache l2;  // Redis
    
    @Override
    public ValueWrapper get(Object key) {
        // Try L1 first
        ValueWrapper value = l1.get(key);
        if (value != null) {
            return value;
        }
        
        // Try L2
        value = l2.get(key);
        if (value != null) {
            l1.put(key, value.get());  // Populate L1
        }
        
        return value;
    }
    
    @Override
    public void put(Object key, Object value) {
        l1.put(key, value);
        l2.put(key, value);  // Write-through
    }
    
    @Override
    public void evict(Object key) {
        l1.evict(key);
        l2.evict(key);
    }
}
```

---

## 3. Cache Coherence Problem

### The Problem

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    CACHE COHERENCE PROBLEM                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Time T1: User profile updated                                     │
│                                                                      │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                      │
│   │ Server 1 │    │ Server 2 │    │ Server 3 │                      │
│   │ L1 Cache │    │ L1 Cache │    │ L1 Cache │                      │
│   │ user:123 │    │ user:123 │    │ user:123 │                      │
│   │ (stale!) │    │ (stale!) │    │ (stale!) │                      │
│   └──────────┘    └──────────┘    └──────────┘                      │
│        │               │               │                             │
│        └───────────────┴───────────────┘                             │
│                        │                                             │
│                        ▼                                             │
│                 ┌──────────┐                                         │
│                 │  Redis   │                                         │
│                 │ user:123 │ ← Updated!                             │
│                 │ (fresh)  │                                         │
│                 └──────────┘                                         │
│                                                                      │
│   Problem: L1 caches have stale data!                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Solution 1: Short TTL for L1

```java
// Simple but effective: Very short L1 TTL
Cache<Long, User> userCache = Caffeine.newBuilder()
    .maximumSize(10_000)
    .expireAfterWrite(Duration.ofSeconds(30))  // Very short!
    .build();

// Trade-off:
// ✅ Low staleness (max 30 seconds)
// ❌ More L2/Redis calls
```

### Solution 2: Pub/Sub Invalidation

```java
// When data changes, broadcast invalidation
@Service
public class UserService {
    
    @Autowired
    private StringRedisTemplate redis;
    
    @Autowired
    private Cache<Long, User> localCache;
    
    public void updateUser(User user) {
        // 1. Update database
        userRepository.save(user);
        
        // 2. Update Redis
        redis.opsForValue().set("user:" + user.getId(), toJson(user));
        
        // 3. Broadcast invalidation to all instances
        redis.convertAndSend("cache:invalidate", "user:" + user.getId());
    }
}

// Listener on each instance
@Component
public class CacheInvalidationListener implements MessageListener {
    
    @Autowired
    private Cache<Long, User> localCache;
    
    @Override
    public void onMessage(Message message, byte[] pattern) {
        String key = new String(message.getBody());
        Long userId = parseUserId(key);
        localCache.invalidate(userId);  // Clear local cache
        log.info("Invalidated local cache for: {}", key);
    }
}

@Bean
public RedisMessageListenerContainer container(RedisConnectionFactory factory) {
    RedisMessageListenerContainer container = new RedisMessageListenerContainer();
    container.setConnectionFactory(factory);
    container.addMessageListener(cacheInvalidationListener, 
        new ChannelTopic("cache:invalidate"));
    return container;
}
```

### Solution 3: Version-Based Invalidation

```java
// Include version in cache key
public class User {
    private Long id;
    private int version;  // Incremented on every update
}

// Cache key includes version
String cacheKey = "user:" + userId + ":v" + version;

// Old versions automatically become orphaned
// New requests use new version key
```

---

## 4. CDN Caching

### How CDN Works

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         CDN ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   User (New York)                     User (London)                  │
│        │                                   │                         │
│        ▼                                   ▼                         │
│   ┌──────────┐                       ┌──────────┐                   │
│   │ CDN Edge │                       │ CDN Edge │                   │
│   │ New York │                       │ London   │                   │
│   └────┬─────┘                       └────┬─────┘                   │
│        │ Miss                              │ Miss                    │
│        │                                   │                         │
│        └───────────────┬───────────────────┘                        │
│                        │                                             │
│                        ▼                                             │
│                 ┌──────────────┐                                     │
│                 │ Origin Server│                                     │
│                 │ (Your API)   │                                     │
│                 └──────────────┘                                     │
│                                                                      │
│   First request: Origin → CDN → User (slow)                        │
│   Subsequent:    CDN → User (fast, origin not hit)                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Cache-Control Headers

```java
@RestController
public class ProductController {
    
    // Static content - cache for 1 year
    @GetMapping("/static/logo.png")
    public ResponseEntity<Resource> getLogo() {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS)
                .cachePublic())
            .body(logoResource);
    }
    
    // API response - cache for 5 minutes
    @GetMapping("/api/products/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable Long id) {
        Product product = productService.findById(id);
        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES)
                .cachePublic())
            .eTag(product.getVersion().toString())
            .body(product);
    }
    
    // Private data - don't cache on CDN
    @GetMapping("/api/users/me")
    public ResponseEntity<User> getCurrentUser() {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())  // Never cache
            .body(currentUser);
    }
    
    // Dynamic but cacheable per-user
    @GetMapping("/api/users/{id}/recommendations")
    public ResponseEntity<List<Product>> getRecommendations() {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS)
                .cachePrivate())  // Cache in browser, not CDN
            .body(recommendations);
    }
}
```

### Cache Headers Cheat Sheet

| Header | Value | Use Case |
|--------|-------|----------|
| `Cache-Control: public, max-age=31536000` | 1 year | Static assets with versioned URLs |
| `Cache-Control: public, max-age=300` | 5 min | API responses that can be stale |
| `Cache-Control: private, max-age=3600` | 1 hour | User-specific data (browser only) |
| `Cache-Control: no-cache` | Validate | Force revalidation with ETag |
| `Cache-Control: no-store` | Never | Sensitive data, auth responses |

### CDN Cache Invalidation

```java
// AWS CloudFront invalidation
@Service
public class CdnInvalidationService {
    
    @Autowired
    private AmazonCloudFront cloudFront;
    
    public void invalidate(List<String> paths) {
        CreateInvalidationRequest request = new CreateInvalidationRequest()
            .withDistributionId("E1234567890ABC")
            .withInvalidationBatch(new InvalidationBatch()
                .withPaths(new Paths()
                    .withItems(paths)
                    .withQuantity(paths.size()))
                .withCallerReference(UUID.randomUUID().toString()));
        
        cloudFront.createInvalidation(request);
    }
}

// Usage: After product update
cdnInvalidationService.invalidate(List.of("/api/products/123"));
```

---

## 5. Cache Warming

### Why Cache Warming?

```text
Cold Cache Problem:
├── Server restarts → Empty cache
├── First requests hit database
├── Slow responses during "warm-up"
├── Potential database overload

Solution: Pre-populate cache before traffic arrives
```

### Strategy 1: On-Startup Warming

```java
@Component
public class CacheWarmer implements ApplicationRunner {
    
    @Autowired
    private ProductService productService;
    
    @Autowired
    private Cache<Long, Product> productCache;
    
    @Override
    public void run(ApplicationArguments args) {
        log.info("Starting cache warm-up...");
        
        // Load top 1000 products
        List<Product> topProducts = productService.findTop1000ByViews();
        for (Product product : topProducts) {
            productCache.put(product.getId(), product);
        }
        
        log.info("Cache warm-up complete: {} products loaded", topProducts.size());
    }
}
```

### Strategy 2: Background Refresh

```java
@Service
public class CacheRefreshService {
    
    @Scheduled(fixedRate = 60000)  // Every minute
    public void refreshHotData() {
        // Get list of frequently accessed keys
        Set<String> hotKeys = analyticsService.getHotKeys(100);
        
        for (String key : hotKeys) {
            // Refresh before expiration
            Object value = dataSource.get(key);
            cache.put(key, value);
        }
    }
}
```

### Strategy 3: Refresh-Ahead Pattern

```java
public class RefreshAheadCache<K, V> {
    
    private final Cache<K, CacheEntry<V>> cache;
    private final Function<K, V> loader;
    private final Duration ttl;
    private final Duration refreshThreshold;  // e.g., 80% of TTL
    
    public V get(K key) {
        CacheEntry<V> entry = cache.getIfPresent(key);
        
        if (entry == null) {
            // Cache miss - load synchronously
            V value = loader.apply(key);
            cache.put(key, new CacheEntry<>(value, Instant.now()));
            return value;
        }
        
        // Check if approaching expiration
        if (entry.isExpiringSoon(refreshThreshold)) {
            // Refresh asynchronously (don't block current request)
            CompletableFuture.runAsync(() -> {
                V freshValue = loader.apply(key);
                cache.put(key, new CacheEntry<>(freshValue, Instant.now()));
            });
        }
        
        return entry.getValue();
    }
}
```

### Strategy 4: Lazy Loading with Circuit Breaker

```java
@Service
public class ResilientCacheService {
    
    @Autowired
    private CircuitBreakerRegistry circuitBreakerRegistry;
    
    public Product getProduct(Long id) {
        // Try cache first
        Product cached = cache.getIfPresent(id);
        if (cached != null) {
            return cached;
        }
        
        // Load with circuit breaker protection
        CircuitBreaker cb = circuitBreakerRegistry.circuitBreaker("database");
        
        try {
            Product product = cb.executeSupplier(() -> 
                productRepository.findById(id).orElse(null));
            
            if (product != null) {
                cache.put(id, product);
            }
            return product;
            
        } catch (CallNotPermittedException e) {
            // Circuit open - return stale data or fallback
            log.warn("Database circuit open, returning stale cache");
            return cache.getIfPresent(id);  // May be stale but better than error
        }
    }
}
```

---

## 6. HTTP Caching (Browser)

### ETag Validation

```java
@GetMapping("/api/products/{id}")
public ResponseEntity<Product> getProduct(
        @PathVariable Long id,
        @RequestHeader(value = "If-None-Match", required = false) String ifNoneMatch) {
    
    Product product = productService.findById(id);
    String etag = "\"" + product.getVersion() + "\"";
    
    // If client has current version, return 304
    if (etag.equals(ifNoneMatch)) {
        return ResponseEntity.status(HttpStatus.NOT_MODIFIED)
            .eTag(etag)
            .build();
    }
    
    return ResponseEntity.ok()
        .eTag(etag)
        .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES))
        .body(product);
}
```

### Last-Modified Validation

```java
@GetMapping("/api/products/{id}")
public ResponseEntity<Product> getProduct(
        @PathVariable Long id,
        WebRequest request) {
    
    Product product = productService.findById(id);
    long lastModified = product.getUpdatedAt().toEpochMilli();
    
    // Check if modified since
    if (request.checkNotModified(lastModified)) {
        return ResponseEntity.status(HttpStatus.NOT_MODIFIED).build();
    }
    
    return ResponseEntity.ok()
        .lastModified(lastModified)
        .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES))
        .body(product);
}
```

---

## 7. Interview Questions

### Q1: Design a multi-level cache for a high-traffic e-commerce site

```text
Answer:
"I'd implement a 4-level caching strategy:

LEVEL 1: BROWSER CACHE
- Static assets: Cache-Control max-age=1year (versioned URLs)
- API responses: max-age=5min for product listings
- Use ETags for validation

LEVEL 2: CDN (CloudFront/Cloudflare)
- Cache static assets globally
- Cache public API responses at edge
- Set Vary: Accept-Encoding header
- Invalidate on product updates

LEVEL 3: LOCAL CACHE (Caffeine)
- Hot products in JVM memory
- TTL: 30 seconds (balance freshness vs performance)
- Max 10,000 entries
- Use pub/sub for cross-instance invalidation

LEVEL 4: DISTRIBUTED CACHE (Redis)
- All product data
- TTL: 30 minutes
- Cluster mode for scalability
- Write-through on updates

CACHE COHERENCE:
- On product update: DB → Redis → Pub/Sub → L1 invalidation
- Short L1 TTL as safety net
- Version-based cache keys for atomicity"
```

### Q2: How do you handle cache coherence across microservices?

```text
Answer:
"Cache coherence across microservices is challenging. My approach:

1. EVENT-DRIVEN INVALIDATION:
   - Service publishes event on data change
   - Other services subscribe and invalidate their caches
   - Use Kafka for reliable delivery

   OrderService → 'product.updated' → ProductCache in other services

2. SHORT TTL + REFRESH-AHEAD:
   - L1: 30 seconds max
   - Refresh at 80% TTL proactively
   - Accept eventual consistency

3. CACHE VERSIONING:
   - Include version in API responses
   - Clients can detect stale data
   - Force refresh if version mismatch

4. SHARED DISTRIBUTED CACHE:
   - Single Redis cluster for shared data
   - Services read from same cache
   - Single source of truth

5. DOMAIN BOUNDARIES:
   - Each service owns its data
   - Other services cache read-only copies
   - Owner broadcasts changes"
```

### Q3: When would you NOT use caching?

```text
Answer:
"Caching isn't always the right solution:

1. FREQUENTLY CHANGING DATA:
   - Real-time stock prices
   - Live scores
   - Cache would always be stale

2. UNIQUE DATA PER REQUEST:
   - Personalized recommendations
   - Session-specific data
   - Low cache hit rate

3. WRITE-HEAVY WORKLOADS:
   - More writes than reads
   - Cache invalidation overhead exceeds benefit

4. SECURITY-SENSITIVE DATA:
   - Payment details
   - Auth tokens (short-lived)
   - Risk of stale security state

5. SIMPLE, FAST OPERATIONS:
   - If DB query is already under 1ms
   - Caching adds complexity without benefit

6. WHEN CONSISTENCY IS CRITICAL:
   - Financial transactions
   - Inventory counts
   - Use database directly"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│                 MULTI-LEVEL CACHING CHEAT SHEET                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ CACHE LEVELS:                                                         │
│   L0 Browser     0ms       HTTP headers, LocalStorage                │
│   L1 CDN         10-50ms   Static + API, global edge                 │
│   L2 Local       sub-1ms   Caffeine/Guava, per-instance              │
│   L3 Distributed 1-5ms     Redis, shared across instances            │
│   L4 Database    5-50ms    Source of truth                           │
│                                                                       │
│ CACHE-CONTROL HEADERS:                                                │
│   public, max-age=31536000    Static assets (versioned)              │
│   public, max-age=300         Cacheable API responses                │
│   private, max-age=3600       User-specific (browser only)           │
│   no-cache                    Force ETag/Last-Modified check         │
│   no-store                    Never cache (sensitive data)           │
│                                                                       │
│ CACHE COHERENCE SOLUTIONS:                                            │
│   Short TTL        Simple but more L2 calls                          │
│   Pub/Sub          Broadcast invalidation                            │
│   Versioning       Include version in key                            │
│   Event-Driven     Kafka/messages between services                   │
│                                                                       │
│ CACHE WARMING:                                                        │
│   On-startup       Load hot data before traffic                      │
│   Background       Scheduled refresh of popular items                │
│   Refresh-ahead    Async refresh before expiry                       │
│                                                                       │
│ CAFFEINE CONFIGURATION:                                               │
│   .maximumSize(10_000)                                               │
│   .expireAfterWrite(Duration.ofMinutes(5))                           │
│   .expireAfterAccess(Duration.ofMinutes(1))                          │
│   .recordStats()                                                      │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Next:** [9. Message Queues & Event-Driven Architecture →](../09-message-queues/01-intro)
