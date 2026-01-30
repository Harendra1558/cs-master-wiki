---
title: 3. Redis Deep Dive
sidebar_position: 3
description: Master Redis data structures, persistence, clustering, and production patterns for interviews.
keywords: [redis, cache, persistence, rdb, aof, cluster, pub sub, memcached]
---

# Redis Deep Dive

:::tip Interview Essential
Redis is the **#1 caching solution** in the industry. Understanding its internals, data structures, and persistence options is crucial for any backend interview.
:::

## 1. Redis Overview

### What is Redis?

**Redis** = **RE**mote **DI**ctionary **S**erver

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        REDIS ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                      REDIS SERVER                           │   │
│   │  ┌─────────────────────────────────────────────────────┐    │   │
│   │  │              IN-MEMORY DATA STORE                   │    │   │
│   │  │  ┌─────────┬─────────┬─────────┬─────────┬───────┐  │    │   │
│   │  │  │ Strings │ Hashes  │  Lists  │  Sets   │ ZSets │  │    │   │
│   │  │  └─────────┴─────────┴─────────┴─────────┴───────┘  │    │   │
│   │  └─────────────────────────────────────────────────────┘    │   │
│   │                           │                                  │   │
│   │           ┌───────────────┴───────────────┐                 │   │
│   │           ▼                               ▼                 │   │
│   │     ┌──────────┐                   ┌──────────┐             │   │
│   │     │   RDB    │                   │   AOF    │             │   │
│   │     │ Snapshot │                   │   Log    │             │   │
│   │     └──────────┘                   └──────────┘             │   │
│   │                         DISK                                 │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   Key Features:                                                      │
│   ├── Single-threaded (per command) → No lock contention           │
│   ├── In-memory → Ultra-low latency (sub-millisecond)              │
│   ├── Persistence options → Data durability                        │
│   └── Cluster mode → Horizontal scaling                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Single-Threaded is Good

```text
Common misconception: "Single-threaded = slow"

Reality:
├── No context switching overhead
├── No lock contention
├── No race conditions
├── Atomic operations by default
├── 100,000+ operations per second on single core!

Since Redis 6.0:
├── I/O threads for network operations
├── Command execution still single-threaded
└── Best of both worlds
```

---

## 2. Data Structures

### Strings (Most Common)

```bash
# Basic operations
SET user:123:name "John"
GET user:123:name                    # "John"

# With expiration
SET session:abc123 "data" EX 3600    # Expires in 1 hour
SETEX session:abc123 3600 "data"     # Same thing

# Atomic increment (counters, rate limiting)
SET page:views 0
INCR page:views                      # 1
INCRBY page:views 10                 # 11

# Set if not exists (distributed lock)
SETNX lock:resource "owner1"         # 1 (success)
SETNX lock:resource "owner2"         # 0 (already locked)
```

```java
// Spring Boot
@Autowired
private StringRedisTemplate redis;

// Basic operations
redis.opsForValue().set("user:123", "John");
redis.opsForValue().set("session:abc", "data", Duration.ofHours(1));

// Atomic counter
redis.opsForValue().increment("page:views");
redis.opsForValue().increment("page:views", 10);

// Distributed lock
Boolean acquired = redis.opsForValue()
    .setIfAbsent("lock:resource", "owner1", Duration.ofSeconds(30));
```

### Hashes (Objects)

```bash
# Store object fields
HSET user:123 name "John" email "john@example.com" age 25
HGET user:123 name                   # "John"
HGETALL user:123                     # All fields

# Partial update (only change what's needed)
HSET user:123 age 26                 # Just update age

# Increment specific field
HINCRBY user:123 age 1               # 27
```

```java
// Store object as hash
Map<String, String> user = Map.of(
    "name", "John",
    "email", "john@example.com",
    "age", "25"
);
redis.opsForHash().putAll("user:123", user);

// Get single field
String name = (String) redis.opsForHash().get("user:123", "name");

// Get all fields
Map<Object, Object> userData = redis.opsForHash().entries("user:123");
```

**When to use Hash vs String?**

| Use Case | Recommendation |
|----------|----------------|
| Full object reads/writes | String (JSON serialized) |
| Partial field updates | Hash (update individual fields) |
| Memory efficiency | Hash (shared overhead) |
| Complex nested objects | String (JSON) |

### Lists (Queues, Recent Items)

```bash
# Add to list (queue)
LPUSH notifications:user:123 "msg1" "msg2" "msg3"
RPOP notifications:user:123          # "msg1" (FIFO queue)

# Recent items (keep last 100)
LPUSH recent:views:user:123 "product:456"
LTRIM recent:views:user:123 0 99     # Keep only 100

# Get range
LRANGE recent:views:user:123 0 9     # Last 10 views
```

```java
// Message queue
redis.opsForList().leftPush("queue:emails", emailJson);
String email = redis.opsForList().rightPop("queue:emails");

// Blocking pop (wait for message)
String email = redis.opsForList()
    .rightPop("queue:emails", Duration.ofSeconds(30));

// Recent items
redis.opsForList().leftPush("recent:user:123", itemId);
redis.opsForList().trim("recent:user:123", 0, 99);
```

### Sets (Unique Values, Relationships)

```bash
# Unique tags
SADD article:1:tags "java" "spring" "redis"
SMEMBERS article:1:tags              # All tags

# Check membership
SISMEMBER article:1:tags "java"      # 1 (true)

# Set operations
SADD user:1:following "user:2" "user:3"
SADD user:2:following "user:1" "user:3"
SINTER user:1:following user:2:following  # Common: "user:3"

# Random selection
SRANDMEMBER products:featured 5       # 5 random products
```

```java
// Tags
redis.opsForSet().add("article:1:tags", "java", "spring", "redis");
Boolean hasTag = redis.opsForSet().isMember("article:1:tags", "java");

// Followers common
Set<String> common = redis.opsForSet()
    .intersect("user:1:following", "user:2:following");
```

### Sorted Sets (Leaderboards, Ranking)

```bash
# Leaderboard
ZADD leaderboard 1000 "player:1" 850 "player:2" 1200 "player:3"

# Top 10 players (descending)
ZREVRANGE leaderboard 0 9 WITHSCORES

# Player rank
ZREVRANK leaderboard "player:1"       # 1 (second place)

# Score range
ZRANGEBYSCORE leaderboard 800 1000    # Players with 800-1000 points

# Increment score
ZINCRBY leaderboard 50 "player:1"     # Add 50 points
```

```java
// Leaderboard
redis.opsForZSet().add("leaderboard", "player:1", 1000);
redis.opsForZSet().incrementScore("leaderboard", "player:1", 50);

// Top 10
Set<ZSetOperations.TypedTuple<String>> top10 = redis.opsForZSet()
    .reverseRangeWithScores("leaderboard", 0, 9);

// Player rank
Long rank = redis.opsForZSet().reverseRank("leaderboard", "player:1");
```

---

## 3. Persistence Options

### RDB (Snapshotting)

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        RDB PERSISTENCE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Redis Memory ──[BGSAVE]──► dump.rdb (binary snapshot)             │
│                                                                      │
│   How it works:                                                      │
│   1. Fork child process                                              │
│   2. Child writes memory to disk                                     │
│   3. Parent continues serving requests                               │
│   4. atomic replace of old dump.rdb                                  │
│                                                                      │
│   ✅ Pros:                        ❌ Cons:                           │
│   ├── Compact single file         ├── Data loss (last snapshot)     │
│   ├── Fast restarts               ├── Fork can be slow (large data) │
│   └── Perfect for backups         └── Not real-time                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

```bash
# redis.conf
save 900 1      # Snapshot if 1 key changed in 900 seconds
save 300 10     # Snapshot if 10 keys changed in 300 seconds
save 60 10000   # Snapshot if 10000 keys changed in 60 seconds

dbfilename dump.rdb
dir /var/lib/redis/
```

### AOF (Append-Only File)

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        AOF PERSISTENCE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Every Write ──[append]──► appendonly.aof (write log)              │
│                                                                      │
│   Sync policies:                                                     │
│   ├── always     → fsync after every write (safest, slowest)       │
│   ├── everysec   → fsync every second (recommended)                │
│   └── no         → OS decides when to flush (fastest, risky)       │
│                                                                      │
│   AOF Rewrite (compaction):                                          │
│   SET x 1                                                            │
│   SET x 2        ──[rewrite]──►   SET x 3                           │
│   SET x 3                         (only final state)                │
│                                                                      │
│   ✅ Pros:                        ❌ Cons:                           │
│   ├── Durability (1 sec max loss) ├── Larger file size              │
│   ├── Human-readable log          ├── Slower than RDB               │
│   └── Auto-compaction             └── Slower restarts               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

```bash
# redis.conf
appendonly yes
appendfsync everysec     # Recommended
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

### RDB + AOF (Recommended for Production)

```bash
# redis.conf - Use both for best of both worlds
save 900 1
save 300 10
appendonly yes
appendfsync everysec

# On restart: Redis loads AOF (more complete) if it exists
# Backups: Use RDB snapshots
```

| Feature | RDB | AOF | RDB + AOF |
|---------|-----|-----|-----------|
| Data loss (worst case) | Minutes | 1 second | 1 second |
| File size | Small | Large | Medium |
| Restart speed | Fast | Slow | Medium |
| Use for | Backups | Durability | Production |

---

## 4. Redis Cluster

### Cluster Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     REDIS CLUSTER (6 nodes)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                      16384 HASH SLOTS                        │   │
│   │  ┌──────────────┬──────────────┬──────────────┐             │   │
│   │  │ Slots 0-5460 │ Slots 5461-  │ Slots 10923- │             │   │
│   │  │              │     10922    │     16383    │             │   │
│   │  └──────┬───────┴──────┬───────┴──────┬───────┘             │   │
│   │         │              │              │                      │   │
│   │         ▼              ▼              ▼                      │   │
│   │   ┌──────────┐   ┌──────────┐   ┌──────────┐                │   │
│   │   │ Master 1 │   │ Master 2 │   │ Master 3 │                │   │
│   │   │ (6379)   │   │ (6380)   │   │ (6381)   │                │   │
│   │   └────┬─────┘   └────┬─────┘   └────┬─────┘                │   │
│   │        │              │              │                       │   │
│   │        ▼              ▼              ▼                       │   │
│   │   ┌──────────┐   ┌──────────┐   ┌──────────┐                │   │
│   │   │ Replica 1│   │ Replica 2│   │ Replica 3│                │   │
│   │   │ (6382)   │   │ (6383)   │   │ (6384)   │                │   │
│   │   └──────────┘   └──────────┘   └──────────┘                │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   Key Routing: CRC16(key) % 16384 → slot → master node             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Hash Slot Routing

```java
// Redis Cluster distributes keys using:
int slot = CRC16(key) % 16384;

// Examples:
// "user:123" → slot 5912 → Master 2
// "user:456" → slot 12031 → Master 3

// Hash tags: Force keys to same slot
// {user:123}:profile → slot based on "user:123"
// {user:123}:orders  → same slot!

// Use for multi-key operations
MGET {user:123}:profile {user:123}:orders  // Works!
MGET user:123:profile user:456:orders       // CROSSSLOT error!
```

```java
// Spring Boot - Cluster configuration
@Bean
public LettuceConnectionFactory redisConnectionFactory() {
    RedisClusterConfiguration clusterConfig = new RedisClusterConfiguration(
        List.of("node1:6379", "node2:6379", "node3:6379")
    );
    return new LettuceConnectionFactory(clusterConfig);
}
```

---

## 5. Pub/Sub Messaging

### How Pub/Sub Works

```text
┌─────────────────────────────────────────────────────────────────────┐
│                       REDIS PUB/SUB                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Publisher 1 ──┐                                                    │
│   Publisher 2 ──┼──► Channel: "orders" ──┬──► Subscriber 1          │
│   Publisher 3 ──┘                        ├──► Subscriber 2          │
│                                          └──► Subscriber 3          │
│                                                                      │
│   ⚠️ Fire-and-forget: No persistence, no acknowledgment            │
│   ⚠️ Subscribers must be connected when message is published        │
│                                                                      │
│   Use for:                                                           │
│   ├── Real-time notifications                                       │
│   ├── Cache invalidation broadcast                                  │
│   └── Live updates (chat, dashboards)                               │
│                                                                      │
│   DON'T use for:                                                     │
│   ├── Reliable message delivery (use Kafka/RabbitMQ)                │
│   └── Message persistence                                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

```java
// Publisher
@Autowired
private StringRedisTemplate redis;

public void publishOrderCreated(Order order) {
    redis.convertAndSend("orders:created", objectMapper.writeValueAsString(order));
}

// Subscriber
@Component
public class OrderListener implements MessageListener {
    
    @Override
    public void onMessage(Message message, byte[] pattern) {
        String orderJson = new String(message.getBody());
        Order order = objectMapper.readValue(orderJson, Order.class);
        // Handle order...
    }
}

@Bean
public RedisMessageListenerContainer container(RedisConnectionFactory factory) {
    RedisMessageListenerContainer container = new RedisMessageListenerContainer();
    container.setConnectionFactory(factory);
    container.addMessageListener(orderListener, new PatternTopic("orders:*"));
    return container;
}
```

---

## 6. Redis vs Memcached

### Feature Comparison

| Feature | Redis | Memcached |
|---------|-------|-----------|
| **Data Structures** | Strings, Hashes, Lists, Sets, Sorted Sets | Strings only |
| **Persistence** | RDB, AOF | None |
| **Replication** | Master-Replica | None built-in |
| **Clustering** | Native cluster mode | Client-side sharding |
| **Pub/Sub** | Yes | No |
| **Lua Scripting** | Yes | No |
| **Transactions** | MULTI/EXEC | No |
| **Memory Efficiency** | Lower (more features) | Higher |
| **Multi-threading** | I/O threads (6.0+) | Fully multi-threaded |

### When to Use Each

```text
Use Redis when:
├── Need complex data structures
├── Need persistence
├── Need pub/sub
├── Need atomic operations
├── Need clustering

Use Memcached when:
├── Simple key-value caching
├── Maximum memory efficiency
├── Simple horizontal scaling
├── Lower memory footprint needed
```

### Interview Answer

> "I prefer Redis because of its rich data structures and persistence options. Memcached is simpler and slightly faster for basic caching, but Redis's features like Sorted Sets for leaderboards, Pub/Sub for cache invalidation, and built-in clustering make it more versatile for real-world applications."

---

## 7. Distributed Locking with Redis

### Simple Lock (SETNX)

```java
public boolean acquireLock(String resource, String owner, Duration timeout) {
    String key = "lock:" + resource;
    Boolean acquired = redis.opsForValue()
        .setIfAbsent(key, owner, timeout);
    return Boolean.TRUE.equals(acquired);
}

public void releaseLock(String resource, String owner) {
    String key = "lock:" + resource;
    String currentOwner = redis.opsForValue().get(key);
    if (owner.equals(currentOwner)) {
        redis.delete(key);
    }
}
```

### Redlock Algorithm (Production)

```java
// For production: Use Redisson library
@Bean
public RedissonClient redissonClient() {
    Config config = new Config();
    config.useSingleServer().setAddress("redis://localhost:6379");
    return Redisson.create(config);
}

// Usage
RLock lock = redisson.getLock("resource:123");
try {
    if (lock.tryLock(10, 30, TimeUnit.SECONDS)) {
        // Critical section
        processResource();
    }
} finally {
    lock.unlock();
}
```

---

## 8. Interview Questions

### Q1: Explain Redis persistence options and when to use each

```text
Answer:
"Redis offers two persistence mechanisms:

RDB (Snapshotting):
- Point-in-time snapshots at configured intervals
- Compact single file, fast restarts
- Risk: Data loss since last snapshot
- Use for: Backups, development, non-critical data

AOF (Append-Only File):
- Logs every write operation
- Configurable: fsync always/everysec/no
- Can be replayed to reconstruct data
- Use for: Production, when durability matters

Recommendation:
Use BOTH in production. RDB for backups and fast restarts,
AOF for durability with 'everysec' sync policy.
Maximum data loss: 1 second of writes."
```

### Q2: How does Redis Cluster distribute data?

```text
Answer:
"Redis Cluster uses hash slot partitioning:

1. SLOT CALCULATION:
   slot = CRC16(key) % 16384
   
2. SLOT DISTRIBUTION:
   - 16384 total slots divided among masters
   - Each master owns a range of slots
   - Key goes to master owning its slot

3. KEY ROUTING:
   - Client computes slot locally
   - MOVED redirect if wrong node
   - Smart clients cache slot mappings

4. MULTI-KEY OPERATIONS:
   - Only work if keys are on same slot
   - Use hash tags: {user:123}:profile, {user:123}:orders
   - Hash computed only on {tagged} part

5. FAILOVER:
   - Each master has replica(s)
   - Automatic failover on master failure
   - Consensus among nodes for promotion"
```

### Q3: Redis vs Memcached - when would you choose Memcached?

```text
Answer:
"I'd choose Memcached over Redis in specific scenarios:

1. SIMPLE KEY-VALUE CACHING:
   - If I only need string storage
   - No complex data structures needed

2. MEMORY EFFICIENCY:
   - Memcached has lower memory overhead
   - Better for very large datasets with simple values

3. MULTI-THREADED PERFORMANCE:
   - Memcached is truly multi-threaded
   - Can utilize all CPU cores for throughput

4. EPHEMERAL CACHE ONLY:
   - When data loss is acceptable
   - No need for persistence

That said, I typically recommend Redis because:
- Sorted Sets are invaluable for leaderboards
- Pub/Sub enables cache invalidation patterns
- Persistence prevents cold cache on restart
- Built-in clustering simplifies ops"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│                      REDIS CHEAT SHEET                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ DATA STRUCTURES:                                                      │
│   String    SET/GET, INCR, EXPIRE         Counters, sessions         │
│   Hash      HSET/HGET/HGETALL             Objects, user profiles     │
│   List      LPUSH/RPOP, LRANGE            Queues, recent items       │
│   Set       SADD/SMEMBERS, SINTER         Unique values, tags        │
│   ZSet      ZADD/ZRANGE, ZRANK            Leaderboards, ranking      │
│                                                                       │
│ PERSISTENCE:                                                          │
│   RDB       Point-in-time snapshots       Backups, fast restart      │
│   AOF       Append-only log               Durability (1s loss max)   │
│   Both      RDB + AOF                     Production recommendation  │
│                                                                       │
│ CLUSTER:                                                              │
│   16384 hash slots distributed among masters                          │
│   CRC16(key) % 16384 → slot → master                                 │
│   Hash tags {tag} for multi-key operations                           │
│                                                                       │
│ VS MEMCACHED:                                                         │
│   Redis     Rich types, persistence, pub/sub, cluster                │
│   Memcached Simple strings, multi-threaded, lower memory             │
│                                                                       │
│ COMMON COMMANDS:                                                      │
│   SET key value EX seconds      String with expiry                   │
│   SETNX key value               Set if not exists (lock)             │
│   INCR key                      Atomic increment                     │
│   EXPIRE key seconds            Set TTL                              │
│   TTL key                       Check remaining TTL                  │
│   KEYS pattern                  Find keys (SLOW - use SCAN)          │
│   SCAN cursor MATCH pattern     Iterate keys safely                  │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Next:** [4. Multi-Level Caching →](./multi-level-caching)
