---
title: 3. Design URL Shortener
sidebar_position: 3
description: Complete system design for URL shortener like bit.ly - ID generation, storage, analytics.
keywords: [url shortener, system design, bit.ly, base62, distributed id]
---

# Design URL Shortener (bit.ly)

:::tip Interview Favorite
URL shortener is the **most common starter question** in system design interviews. It tests fundamentals: ID generation, storage, caching, and scaling.
:::

## Step 1: Requirements (5 min)

### Functional Requirements

```text
1. Given a long URL, generate a short URL
2. When user visits short URL, redirect to long URL
3. (Optional) Custom short URLs
4. (Optional) Analytics: click count, geographic data
5. (Optional) Expiration for URLs
```

### Non-Functional Requirements

```text
1. High availability (URL redirects must work 24/7)
2. Low latency (redirect should be instant)
3. Short URLs should not be guessable (security)
4. Scale: Handle billions of URLs
```

### Clarifying Questions to Ask

```text
Q: What's the expected traffic?
A: 100 million URLs created per month, 10 billion redirects

Q: How long should URLs be valid?
A: Default 5 years, can be customized

Q: Do we need analytics?
A: Yes, basic click counts

Q: Custom URLs allowed?
A: Yes, for premium users
```

---

## Step 2: Estimations (5 min)

### Traffic Estimates

```text
WRITES:
- 100 million new URLs/month
- 100M / (30 days × 24 hours × 3600 sec) = ~40 URLs/second
- Peak: ~400 URLs/second

READS:
- 10 billion redirects/month
- Read:Write ratio = 100:1
- 10B / 2.6M seconds = ~4,000 redirects/second
- Peak: ~40,000 redirects/second

SYSTEM IS READ-HEAVY → Focus on read optimization
```

### Storage Estimates

```text
URL STORAGE:
- Short URL: 7 characters = 7 bytes
- Long URL: Average 200 bytes
- Created timestamp: 8 bytes
- Expiry: 8 bytes
- User ID: 8 bytes
- Click count: 4 bytes
- Total per URL: ~250 bytes

5 YEARS OF DATA:
- 100M URLs/month × 12 months × 5 years = 6 billion URLs
- 6B × 250 bytes = 1.5 TB

→ Fits in a single database with sharding
```

### URL Length Calculation

```text
How many characters for short URL?

Using Base62 (a-z, A-Z, 0-9):
- 6 characters: 62^6 = 56.8 billion combinations
- 7 characters: 62^7 = 3.5 trillion combinations

For 6 billion URLs over 5 years → 7 characters is safe
Short URL format: https://short.ly/Ab12XyZ
```

---

## Step 3: High-Level Design (10 min)

### System Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      URL SHORTENER ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────┐          ┌─────────────────┐                         │
│   │  Client  │─────────▶│  Load Balancer  │                         │
│   └──────────┘          └────────┬────────┘                         │
│                                  │                                   │
│                    ┌─────────────┼─────────────┐                    │
│                    ▼             ▼             ▼                    │
│              ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│              │  API     │  │  API     │  │  API     │              │
│              │ Server 1 │  │ Server 2 │  │ Server 3 │              │
│              └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│                   │             │             │                     │
│                   └─────────────┼─────────────┘                     │
│                                 │                                    │
│               ┌─────────────────┼─────────────────┐                 │
│               │                 │                 │                 │
│               ▼                 ▼                 ▼                 │
│         ┌──────────┐      ┌──────────┐     ┌──────────────┐        │
│         │  Cache   │      │   URL    │     │ ID Generator │        │
│         │ (Redis)  │      │ Database │     │   Service    │        │
│         └──────────┘      └──────────┘     └──────────────┘        │
│                                                                      │
│   ASYNC PROCESSING:                                                  │
│         ┌──────────────────────────────────────────┐                │
│         │            Message Queue                 │                │
│         │                   │                      │                │
│         │         ┌─────────┴─────────┐            │                │
│         │         ▼                   ▼            │                │
│         │   ┌──────────┐        ┌──────────┐       │                │
│         │   │Analytics │        │Analytics │       │                │
│         │   │ Worker   │        │ Worker   │       │                │
│         │   └────┬─────┘        └────┬─────┘       │                │
│         │        │                   │             │                │
│         │        └─────────┬─────────┘             │                │
│         │                  ▼                       │                │
│         │           ┌──────────┐                   │                │
│         │           │Analytics │                   │                │
│         │           │    DB    │                   │                │
│         │           └──────────┘                   │                │
│         └──────────────────────────────────────────┘                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### API Design

```text
1. CREATE Short URL
   POST /api/v1/shorten
   Request:
   {
     "long_url": "https://example.com/very/long/path...",
     "custom_alias": "mylink",  // optional
     "expiry_date": "2025-01-01"  // optional
   }
   
   Response:
   {
     "short_url": "https://short.ly/Ab12XyZ",
     "long_url": "https://example.com/very/long/path...",
     "expires_at": "2025-01-01T00:00:00Z"
   }

2. REDIRECT (Short → Long)
   GET /{short_code}
   
   Response: 301 Redirect to long_url
   (301 = permanent, cacheable by browser)
   (302 = temporary, not cached, better for analytics)

3. GET Analytics
   GET /api/v1/stats/{short_code}
   
   Response:
   {
     "short_url": "https://short.ly/Ab12XyZ",
     "total_clicks": 12345,
     "created_at": "2024-01-15T10:30:00Z",
     "last_accessed": "2024-06-20T15:45:00Z"
   }
```

---

## Step 4: Deep Dive (20 min)

### ID Generation Strategies

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ID GENERATION OPTIONS                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ OPTION 1: Auto-increment + Base62                                   │
│ ├── Database auto-increment: 1, 2, 3, ...                           │
│ ├── Convert to Base62: 1→"1", 62→"10", 3844→"100"                   │
│ ├── Pros: Simple, no collisions                                     │
│ └── Cons: Predictable (security risk), single point of failure     │
│                                                                      │
│ OPTION 2: Hash (MD5/SHA256)                                         │
│ ├── hash(long_url) → take first 7 chars                             │
│ ├── Pros: Same URL = same short code                                │
│ └── Cons: Collisions possible, need collision handling              │
│                                                                      │
│ OPTION 3: Pre-generated Keys (Recommended)                          │
│ ├── Generate keys in advance, store in Key DB                       │
│ ├── Worker pre-generates & marks used/unused                        │
│ ├── Pros: No collision, no coordination needed                      │
│ └── Cons: Need to manage key database                               │
│                                                                      │
│ OPTION 4: Distributed ID (Snowflake)                                │
│ ├── 64-bit ID: timestamp + worker_id + sequence                     │
│ ├── Convert to Base62                                               │
│ ├── Pros: Distributed, no single point of failure                   │
│ └── Cons: More complex, IDs are longer                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended: Pre-generated Keys

```java
// Key Generation Service
public class KeyGenerationService {
    
    private static final String CHARS = 
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    
    // Pre-generate keys and store in database
    public void generateKeys(int count) {
        SecureRandom random = new SecureRandom();
        Set<String> keys = new HashSet<>();
        
        while (keys.size() < count) {
            StringBuilder key = new StringBuilder(7);
            for (int i = 0; i < 7; i++) {
                key.append(CHARS.charAt(random.nextInt(62)));
            }
            keys.add(key.toString());
        }
        
        // Store in key_pool table with used=false
        keyRepository.saveAll(keys);
    }
    
    // Get unused key (atomic operation)
    @Transactional
    public String getKey() {
        // SELECT key FROM key_pool WHERE used=false LIMIT 1 FOR UPDATE
        // UPDATE key_pool SET used=true WHERE key=...
        return keyRepository.getAndMarkUsed();
    }
}
```

### Database Schema

```sql
-- Main URL table
CREATE TABLE urls (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    short_code      VARCHAR(10) UNIQUE NOT NULL,
    long_url        VARCHAR(2048) NOT NULL,
    user_id         BIGINT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP,
    click_count     INT DEFAULT 0,
    
    INDEX idx_short_code (short_code),
    INDEX idx_user_id (user_id),
    INDEX idx_expires (expires_at)
);

-- Key pool for pre-generated keys
CREATE TABLE key_pool (
    key_value       VARCHAR(10) PRIMARY KEY,
    used            BOOLEAN DEFAULT FALSE,
    used_at         TIMESTAMP NULL,
    
    INDEX idx_unused (used)
);

-- Analytics (separate DB for scale)
CREATE TABLE click_events (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    short_code      VARCHAR(10) NOT NULL,
    clicked_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address      VARCHAR(45),
    user_agent      VARCHAR(500),
    referer         VARCHAR(2048),
    country         VARCHAR(2),
    
    INDEX idx_short_code_time (short_code, clicked_at)
) PARTITION BY RANGE (YEAR(clicked_at));
```

### Caching Strategy

```text
READ PATH (Most Critical):
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   Request: GET /Ab12XyZ                                             │
│                                                                      │
│   1. Check Cache (Redis)                                            │
│      └── Key: "url:Ab12XyZ"                                         │
│      └── Value: "https://example.com/..."                           │
│      └── TTL: 24 hours                                              │
│                                                                      │
│   2. If Cache Miss → Query Database                                 │
│      └── SELECT long_url FROM urls WHERE short_code = 'Ab12XyZ'     │
│      └── Populate cache                                             │
│                                                                      │
│   3. Return 301/302 Redirect                                        │
│                                                                      │
│   4. Async: Publish click event to Kafka                            │
│      └── Analytics workers process later                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

Cache Hit Ratio Target: 99%+ (most URLs are accessed repeatedly)
```

```java
@Service
public class UrlService {
    
    @Autowired
    private StringRedisTemplate redis;
    
    @Autowired
    private UrlRepository urlRepository;
    
    @Autowired
    private KafkaTemplate<String, ClickEvent> kafka;
    
    public String getLongUrl(String shortCode) {
        // 1. Check cache
        String cacheKey = "url:" + shortCode;
        String longUrl = redis.opsForValue().get(cacheKey);
        
        if (longUrl != null) {
            // Cache hit - async log click
            publishClickEvent(shortCode);
            return longUrl;
        }
        
        // 2. Cache miss - query DB
        Url url = urlRepository.findByShortCode(shortCode)
            .orElseThrow(() -> new NotFoundException("URL not found"));
        
        // Check expiry
        if (url.getExpiresAt() != null && url.getExpiresAt().isBefore(Instant.now())) {
            throw new ExpiredException("URL has expired");
        }
        
        // 3. Populate cache
        redis.opsForValue().set(cacheKey, url.getLongUrl(), Duration.ofHours(24));
        
        // 4. Log click async
        publishClickEvent(shortCode);
        
        return url.getLongUrl();
    }
    
    private void publishClickEvent(String shortCode) {
        ClickEvent event = new ClickEvent(shortCode, Instant.now());
        kafka.send("click-events", event);
    }
}
```

### Handling Scale

```text
DATABASE SHARDING:
- Shard by short_code hash
- shard_id = hash(short_code) % num_shards
- Each shard handles ~1B URLs

READ REPLICAS:
- 1 Primary (writes)
- 3+ Replicas (reads)
- Eventual consistency OK for reads

CACHE SCALING:
- Redis Cluster (6+ nodes)
- Consistent hashing for key distribution
- ~100GB cache holds billions of hot URLs

API SERVER SCALING:
- Stateless design
- Auto-scaling group (10-100 instances)
- Behind load balancer
```

---

## Step 5: Wrap Up (5 min)

### Trade-offs Discussed

| Decision | Trade-off |
|----------|-----------|
| 301 vs 302 redirect | 301 (cached, less analytics) vs 302 (always hits server) |
| Pre-generated keys | More storage vs no collision handling |
| Async analytics | Eventually consistent vs real-time |
| 7-char short code | Long enough for scale vs shorter is better |

### Potential Bottlenecks

```text
1. Key generation service
   - Solution: Multiple key servers, key pool per server

2. Database writes
   - Solution: Sharding, async writes to analytics

3. Cache stampede (many cache misses at once)
   - Solution: Distributed locking, cache-aside with TTL jitter

4. Hot URLs (viral content)
   - Solution: Multi-level caching, CDN for popular URLs
```

### Monitoring

```text
Metrics to Track:
├── URL creation rate (writes/sec)
├── Redirect rate (reads/sec)
├── Cache hit ratio (target: 99%+)
├── P99 latency (target: <100ms)
├── Error rate (4xx, 5xx)
├── Key pool size (alert if low)
└── Database connection pool usage
```

---

## Complete Flow Summary

```text
CREATE SHORT URL:
1. Client → POST /shorten with long_url
2. Check if long_url already exists (optional deduplication)
3. Get unused key from key_pool
4. Store mapping in database
5. Return short URL

REDIRECT:
1. Client → GET /Ab12XyZ
2. Check Redis cache
3. If miss, query database
4. Populate cache
5. Publish click event to Kafka (async)
6. Return 301/302 redirect

ANALYTICS:
1. Kafka consumer reads click events
2. Batch insert to click_events table
3. Aggregate statistics periodically
4. Cache aggregated stats in Redis
```

---

## Interview Tips

```text
✅ Start with requirements (don't jump to solution)
✅ Calculate scale - shows you think about production
✅ Discuss trade-offs between 301/302
✅ Mention caching early (it's key for read-heavy)
✅ Explain why you chose your ID generation strategy
✅ Mention async processing for analytics
✅ End with monitoring/observability

❌ Don't over-engineer for small scale
❌ Don't forget about expiration handling
❌ Don't ignore security (rate limiting for creation)
```

---

**Next:** [4. Design Rate Limiter →](./04-rate-limiter.md)
