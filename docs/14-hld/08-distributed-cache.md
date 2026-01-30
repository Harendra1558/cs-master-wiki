---
title: 8. Design Distributed Cache
sidebar_position: 8
description: Complete system design for distributed caching - Redis, Memcached, consistency, eviction strategies.
keywords: [distributed cache, redis, memcached, caching, system design, cache invalidation]
---

# Design Distributed Cache

:::info Fundamental Component
Caching is used in almost every system design. Understanding cache design, consistency, and eviction is essential for senior interviews.
:::

## Step 1: Requirements (5 min)

### Functional Requirements

```text
Core Features:
1. PUT(key, value, ttl) - Store data with expiration
2. GET(key) - Retrieve data
3. DELETE(key) - Remove data
4. MGET(keys) - Batch get
5. TTL support (auto-expiration)

Advanced Features:
6. Atomic operations (increment, compare-and-set)
7. Data structures (lists, sets, hashes)
8. Pub/Sub for cache invalidation
9. Cluster support (distributed)
```

### Non-Functional Requirements

```text
1. Low latency: < 1ms for reads
2. High throughput: 100K+ ops/second per node
3. High availability: 99.99% uptime
4. Scalable: Handle TB of cached data
5. Consistent: No stale reads (or configurable staleness)
```

### Clarifying Questions

```text
Q: What's the cache size?
A: 100GB-1TB, growing

Q: Read/write ratio?
A: 100:1 read-heavy

Q: Consistency requirements?
A: Eventually consistent is OK for most, strong for some

Q: Value sizes?
A: Small (<1KB) to medium (<1MB)
```

---

## Step 2: Caching Strategies

### Where to Cache

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    CACHING LEVELS                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  LEVEL 1: CLIENT-SIDE                                               │
│  └── Browser cache, mobile app cache                                │
│  └── Latency: 0ms                                                   │
│  └── Size: MB                                                       │
│                                                                      │
│  LEVEL 2: CDN                                                       │
│  └── Static assets, API responses                                   │
│  └── Latency: 10-50ms                                               │
│  └── Size: TB                                                       │
│                                                                      │
│  LEVEL 3: API GATEWAY                                               │
│  └── Response caching, rate limit data                              │
│  └── Latency: 1-5ms                                                 │
│  └── Size: GB                                                       │
│                                                                      │
│  LEVEL 4: APPLICATION (LOCAL)                                       │
│  └── In-process cache (Caffeine, Guava)                             │
│  └── Latency: < 0.1ms                                               │
│  └── Size: MB (per instance)                                        │
│                                                                      │
│  LEVEL 5: DISTRIBUTED CACHE                    ← Focus of design    │
│  └── Shared cache (Redis, Memcached)                                │
│  └── Latency: 0.5-2ms                                               │
│  └── Size: GB-TB                                                    │
│                                                                      │
│  LEVEL 6: DATABASE                                                  │
│  └── Query cache, buffer pool                                       │
│  └── Latency: 5-50ms                                                │
│  └── Size: GB                                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Caching Patterns

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    CACHING PATTERNS                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. CACHE-ASIDE (Lazy Loading)                                      │
│  ─────────────────────────────                                      │
│  Read:  App checks cache → miss → query DB → populate cache         │
│  Write: App writes to DB → invalidate cache                         │
│                                                                      │
│  ┌─────┐    1. Get     ┌───────┐                                    │
│  │ App │───────────────▶│ Cache │  ← Cache Miss                      │
│  └──┬──┘               └───────┘                                    │
│     │ 2. Query                                                      │
│     ▼                                                               │
│  ┌──────┐  3. Return                                                │
│  │  DB  │──────────────▶ App populates cache                        │
│  └──────┘                                                           │
│                                                                      │
│  ✅ Only caches what's needed                                        │
│  ✅ Simple to implement                                              │
│  ❌ Cache miss penalty (first request slow)                          │
│  ❌ Data can become stale                                            │
│                                                                      │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  2. READ-THROUGH                                                    │
│  ───────────────                                                    │
│  Cache handles loading data from DB                                 │
│                                                                      │
│  ┌─────┐    Get     ┌───────┐   Miss    ┌──────┐                    │
│  │ App │───────────▶│ Cache │──────────▶│  DB  │                    │
│  └─────┘            └───────┘           └──────┘                    │
│                        │ ◀─────────Load─────┘                        │
│                        └─────Return─────▶ App                        │
│                                                                      │
│  ✅ App code simpler                                                 │
│  ✅ Cache always consistent                                          │
│  ❌ Requires cache library support                                   │
│                                                                      │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  3. WRITE-THROUGH                                                   │
│  ────────────────                                                   │
│  Writes go to cache AND database synchronously                      │
│                                                                      │
│  ┌─────┐   Write    ┌───────┐   Write   ┌──────┐                    │
│  │ App │───────────▶│ Cache │──────────▶│  DB  │                    │
│  └─────┘            └───────┘           └──────┘                    │
│                                                                      │
│  ✅ Cache always up-to-date                                          │
│  ✅ No stale reads                                                   │
│  ❌ Higher write latency                                             │
│  ❌ May cache data that's never read                                 │
│                                                                      │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  4. WRITE-BEHIND (Write-Back)                                       │
│  ───────────────────────────                                        │
│  Writes go to cache, async flush to DB                              │
│                                                                      │
│  ┌─────┐   Write    ┌───────┐  Async    ┌──────┐                    │
│  │ App │───────────▶│ Cache │─ ─ ─ ─ ─▶│  DB  │                    │
│  └─────┘            └───────┘           └──────┘                    │
│           Immediate ACK                                             │
│                                                                      │
│  ✅ Very fast writes                                                 │
│  ✅ Batch writes for efficiency                                      │
│  ❌ Risk of data loss if cache fails                                 │
│  ❌ Complex consistency                                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Cache-Aside Implementation

```java
@Service
public class UserService {
    
    @Autowired
    private StringRedisTemplate redis;
    
    @Autowired
    private UserRepository repository;
    
    private static final Duration CACHE_TTL = Duration.ofMinutes(15);
    
    public User getById(Long userId) {
        String key = "user:" + userId;
        
        // 1. Check cache
        String cached = redis.opsForValue().get(key);
        if (cached != null) {
            return deserialize(cached);
        }
        
        // 2. Cache miss - query database
        User user = repository.findById(userId)
            .orElseThrow(() -> new NotFoundException("User not found"));
        
        // 3. Populate cache
        redis.opsForValue().set(key, serialize(user), CACHE_TTL);
        
        return user;
    }
    
    @Transactional
    public User update(Long userId, UserUpdateRequest request) {
        // 1. Update database
        User user = repository.findById(userId).orElseThrow();
        user.updateFrom(request);
        repository.save(user);
        
        // 2. Invalidate cache (not update - avoids race conditions)
        String key = "user:" + userId;
        redis.delete(key);
        
        return user;
    }
}
```

---

## Step 3: High-Level Design

### Distributed Cache Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                   DISTRIBUTED CACHE ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                     APPLICATION LAYER                        │   │
│   │                                                              │   │
│   │   ┌───────────┐   ┌───────────┐   ┌───────────┐             │   │
│   │   │  App      │   │  App      │   │  App      │             │   │
│   │   │  Server 1 │   │  Server 2 │   │  Server 3 │             │   │
│   │   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘             │   │
│   │         │               │               │                    │   │
│   │         │    ┌──────────┴──────────┐    │                    │   │
│   │         └────┤   Cache Client      ├────┘                    │   │
│   │              │   (Lettuce/Jedis)   │                         │   │
│   │              └──────────┬──────────┘                         │   │
│   │                         │                                    │   │
│   └─────────────────────────┼────────────────────────────────────┘   │
│                             │                                        │
│                             │ TCP Connection Pool                    │
│                             │                                        │
│   ┌─────────────────────────┼────────────────────────────────────┐   │
│   │                         ▼                                    │   │
│   │              REDIS CLUSTER / SENTINEL                        │   │
│   │                                                              │   │
│   │    ┌─────────────────────────────────────────────────────┐  │   │
│   │    │                   CLUSTER PROXY                      │  │   │
│   │    │              (Optional - Redis Cluster Proxy)        │  │   │
│   │    └─────────────────────────────────────────────────────┘  │   │
│   │                             │                                │   │
│   │    ┌────────────────────────┼────────────────────────┐      │   │
│   │    │                        │                        │      │   │
│   │    ▼                        ▼                        ▼      │   │
│   │    ┌────────────┐    ┌────────────┐    ┌────────────┐      │   │
│   │    │  Primary 1 │    │  Primary 2 │    │  Primary 3 │      │   │
│   │    │ Slots 0-5K │    │Slots 5K-10K│    │Slots10K-16K│      │   │
│   │    └──────┬─────┘    └──────┬─────┘    └──────┬─────┘      │   │
│   │           │                 │                 │             │   │
│   │           ▼                 ▼                 ▼             │   │
│   │    ┌────────────┐    ┌────────────┐    ┌────────────┐      │   │
│   │    │ Replica 1a │    │ Replica 2a │    │ Replica 3a │      │   │
│   │    └────────────┘    └────────────┘    └────────────┘      │   │
│   │           │                 │                 │             │   │
│   │           ▼                 ▼                 ▼             │   │
│   │    ┌────────────┐    ┌────────────┐    ┌────────────┐      │   │
│   │    │ Replica 1b │    │ Replica 2b │    │ Replica 3b │      │   │
│   │    └────────────┘    └────────────┘    └────────────┘      │   │
│   │                                                              │   │
│   └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Components

```text
1. CACHE CLIENT
   - Connection pooling
   - Consistent hashing for key distribution
   - Automatic failover
   - Retry logic with backoff

2. CLUSTER MANAGEMENT
   - Hash slots (Redis: 16384 slots)
   - Slot assignment to nodes
   - Automatic resharding
   - Gossip protocol for cluster state

3. REPLICATION
   - Primary handles writes
   - Replicas for read scaling
   - Async replication (eventual consistency)
   - Automatic failover (Sentinel/Cluster)

4. DATA PARTITIONING
   - Consistent hashing
   - Key-based routing
   - Even distribution
```

---

## Step 4: Deep Dive - Data Partitioning

### Consistent Hashing

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    CONSISTENT HASHING                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PROBLEM with simple hashing:                                       │
│  slot = hash(key) % num_nodes                                       │
│                                                                      │
│  When adding/removing node, ALL keys move!                          │
│  3 nodes → 4 nodes: 75% of keys remapped                            │
│                                                                      │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  CONSISTENT HASHING SOLUTION:                                       │
│                                                                      │
│            Node A                                                   │
│               ●                                                     │
│         ╱     │     ╲                                               │
│       ╱       │       ╲                                             │
│     ●─────────┼─────────●  Hash Ring (0 to 2^32)                   │
│   Node D      │      Node B                                         │
│       ╲       │       ╱                                             │
│         ╲     │     ╱                                               │
│               ●                                                     │
│            Node C                                                   │
│                                                                      │
│  Key placement:                                                      │
│  - Hash the key                                                     │
│  - Walk clockwise on ring                                           │
│  - First node encountered owns the key                              │
│                                                                      │
│  Adding node E:                                                      │
│  - Only keys between D and E move to E                              │
│  - ~1/N keys move (not all keys!)                                   │
│                                                                      │
│  VIRTUAL NODES:                                                      │
│  - Each physical node = 100+ virtual nodes                          │
│  - Spreads keys more evenly                                         │
│  - Handles hotspots better                                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

```java
public class ConsistentHash<T> {
    
    private final SortedMap<Integer, T> ring = new TreeMap<>();
    private final int virtualNodes;
    private final HashFunction hashFunction;
    
    public ConsistentHash(Collection<T> nodes, int virtualNodes) {
        this.virtualNodes = virtualNodes;
        this.hashFunction = Hashing.murmur3_32();
        
        for (T node : nodes) {
            addNode(node);
        }
    }
    
    public void addNode(T node) {
        for (int i = 0; i < virtualNodes; i++) {
            int hash = hash(node.toString() + "#" + i);
            ring.put(hash, node);
        }
    }
    
    public void removeNode(T node) {
        for (int i = 0; i < virtualNodes; i++) {
            int hash = hash(node.toString() + "#" + i);
            ring.remove(hash);
        }
    }
    
    public T getNode(String key) {
        if (ring.isEmpty()) {
            throw new IllegalStateException("No nodes available");
        }
        
        int hash = hash(key);
        
        // Find first node clockwise from key's hash
        SortedMap<Integer, T> tailMap = ring.tailMap(hash);
        int nodeHash = tailMap.isEmpty() ? ring.firstKey() : tailMap.firstKey();
        
        return ring.get(nodeHash);
    }
    
    private int hash(String key) {
        return hashFunction.hashString(key, StandardCharsets.UTF_8).asInt();
    }
}
```

---

## Step 5: Cache Eviction

### Eviction Policies

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    EVICTION POLICIES                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. LRU (Least Recently Used)                                       │
│  ─────────────────────────────                                      │
│  Evicts item not accessed for longest time                          │
│                                                                      │
│  Access order: A, B, C, D, E (capacity 4)                           │
│  Cache: [B, C, D, E]  →  Access B  →  [C, D, E, B]                  │
│  Add F: Evict C (LRU) → [D, E, B, F]                                │
│                                                                      │
│  ✅ Good for temporal locality                                       │
│  ❌ One-time scans pollute cache                                     │
│                                                                      │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  2. LFU (Least Frequently Used)                                     │
│  ──────────────────────────────                                     │
│  Evicts item with lowest access count                               │
│                                                                      │
│  Frequencies: A=10, B=3, C=7, D=1                                   │
│  Evict: D (frequency=1)                                             │
│                                                                      │
│  ✅ Keeps popular items                                              │
│  ❌ New items have low frequency, may be evicted too soon           │
│                                                                      │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  3. TTL (Time To Live)                                              │
│  ─────────────────────                                              │
│  Items expire after fixed duration                                  │
│                                                                      │
│  SET key value EX 300  (expire in 5 minutes)                        │
│                                                                      │
│  ✅ Guarantees freshness                                             │
│  ✅ Simple to reason about                                           │
│  ❌ May evict still-popular items                                    │
│                                                                      │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  4. FIFO (First In First Out)                                       │
│  ────────────────────────────                                       │
│  Evicts oldest item                                                 │
│                                                                      │
│  ✅ Simple                                                           │
│  ❌ Ignores access patterns                                          │
│                                                                      │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  5. Random                                                          │
│  ────────                                                           │
│  Evicts random item                                                 │
│                                                                      │
│  ✅ No metadata overhead                                             │
│  ❌ May evict hot items                                              │
│                                                                      │
│  REDIS OPTIONS: volatile-lru, allkeys-lru, volatile-ttl,            │
│                 volatile-lfu, allkeys-lfu, noeviction               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### LRU Implementation

```java
public class LRUCache<K, V> {
    
    private final int capacity;
    private final Map<K, Node<K, V>> map;
    private final DoublyLinkedList<K, V> dll;
    
    public LRUCache(int capacity) {
        this.capacity = capacity;
        this.map = new HashMap<>();
        this.dll = new DoublyLinkedList<>();
    }
    
    public synchronized V get(K key) {
        Node<K, V> node = map.get(key);
        if (node == null) {
            return null;
        }
        
        // Move to front (most recently used)
        dll.moveToFront(node);
        return node.value;
    }
    
    public synchronized void put(K key, V value) {
        Node<K, V> existing = map.get(key);
        
        if (existing != null) {
            // Update existing
            existing.value = value;
            dll.moveToFront(existing);
        } else {
            // Add new
            if (map.size() >= capacity) {
                // Evict LRU (tail)
                Node<K, V> lru = dll.removeTail();
                map.remove(lru.key);
            }
            
            Node<K, V> newNode = new Node<>(key, value);
            dll.addToFront(newNode);
            map.put(key, newNode);
        }
    }
    
    private static class Node<K, V> {
        K key;
        V value;
        Node<K, V> prev, next;
        
        Node(K key, V value) {
            this.key = key;
            this.value = value;
        }
    }
}
```

---

## Step 6: Cache Consistency

### Invalidation Strategies

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    CACHE INVALIDATION                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  "There are only two hard things in computer science:               │
│   cache invalidation and naming things."                            │
│                                                                      │
│  STRATEGY 1: TTL-based                                              │
│  ─────────────────────                                              │
│  - Set TTL on every cache entry                                     │
│  - Accept staleness up to TTL duration                              │
│  - Simplest approach                                                │
│                                                                      │
│  STRATEGY 2: Event-driven invalidation                              │
│  ────────────────────────────────────                               │
│  - On database write, publish invalidation event                    │
│  - Cache listeners delete affected keys                             │
│  - Near real-time consistency                                       │
│                                                                      │
│  DB Write ──▶ Kafka ──▶ Cache Invalidator ──▶ Redis DEL key        │
│                                                                      │
│  STRATEGY 3: Write-through                                          │
│  ─────────────────────────                                          │
│  - Update cache and DB together                                     │
│  - Strong consistency                                               │
│  - Higher latency                                                   │
│                                                                      │
│  STRATEGY 4: Versioning                                             │
│  ─────────────────────                                              │
│  - Include version in cache key                                     │
│  - On update, increment version                                     │
│  - Old versions become unreachable                                  │
│                                                                      │
│  Key: user:123:v5  →  Update  →  user:123:v6                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Event-Driven Invalidation

```java
@Component
public class CacheInvalidationListener {
    
    @Autowired
    private StringRedisTemplate redis;
    
    @KafkaListener(topics = "database-changes", groupId = "cache-invalidation")
    public void handleDatabaseChange(DatabaseChangeEvent event) {
        switch (event.getTable()) {
            case "users":
                invalidateUser(event.getRecordId());
                break;
            case "products":
                invalidateProduct(event.getRecordId());
                break;
            case "orders":
                invalidateOrder(event.getRecordId());
                break;
        }
    }
    
    private void invalidateUser(Long userId) {
        // Delete all user-related cache entries
        redis.delete("user:" + userId);
        redis.delete("user:profile:" + userId);
        redis.delete("user:settings:" + userId);
        
        // Publish to other services that might cache user data
        // (if not using shared cache)
    }
}
```

### Handling Race Conditions

```text
RACE CONDITION PROBLEM:

Timeline:
1. Thread A: Read from DB (value = 1)
2. Thread B: Update DB (value = 2)
3. Thread B: Delete cache
4. Thread A: Write to cache (value = 1)  ← STALE!

SOLUTION 1: Delete-before-read
- Always delete cache before reading from DB
- Extra cache miss, but safe

SOLUTION 2: Lease-based
- Get a "lease" before populating cache
- If lease expired, someone else updated

SOLUTION 3: Version check
- Include DB version in cache
- On read, verify version is current
```

```java
@Service
public class SafeCacheService {
    
    @Autowired
    private StringRedisTemplate redis;
    
    @Autowired
    private UserRepository repository;
    
    // Option: Use version for cache key
    public User getUserSafe(Long userId) {
        // First, check DB for current version
        Long currentVersion = repository.getVersion(userId);
        String key = "user:" + userId + ":v" + currentVersion;
        
        String cached = redis.opsForValue().get(key);
        if (cached != null) {
            return deserialize(cached);
        }
        
        // Cache miss - load from DB
        User user = repository.findById(userId).orElseThrow();
        
        // Only cache if version matches (no concurrent update)
        if (user.getVersion().equals(currentVersion)) {
            redis.opsForValue().set(key, serialize(user), Duration.ofMinutes(15));
        }
        
        return user;
    }
}
```

---

## Step 7: High Availability

### Redis Sentinel

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    REDIS SENTINEL                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌───────────────────────────────────────────────────────────┐     │
│   │                    SENTINEL CLUSTER                        │     │
│   │                                                            │     │
│   │   ┌───────────┐   ┌───────────┐   ┌───────────┐          │     │
│   │   │Sentinel 1 │   │Sentinel 2 │   │Sentinel 3 │          │     │
│   │   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘          │     │
│   │         │               │               │                 │     │
│   │         └───────────────┼───────────────┘                 │     │
│   │                    Monitor                                 │     │
│   └────────────────────────┬──────────────────────────────────┘     │
│                            │                                         │
│                            ▼                                         │
│   ┌───────────────────────────────────────────────────────────┐     │
│   │                                                            │     │
│   │     ┌───────────────┐         ┌───────────────┐           │     │
│   │     │    PRIMARY    │────────▶│   REPLICA 1   │           │     │
│   │     │   (writes)    │  sync   │   (reads)     │           │     │
│   │     └───────────────┘         └───────────────┘           │     │
│   │            │                                               │     │
│   │            │ sync                                          │     │
│   │            ▼                                               │     │
│   │     ┌───────────────┐                                      │     │
│   │     │   REPLICA 2   │                                      │     │
│   │     │   (reads)     │                                      │     │
│   │     └───────────────┘                                      │     │
│   │                                                            │     │
│   └────────────────────────────────────────────────────────────┘     │
│                                                                      │
│   FAILOVER PROCESS:                                                  │
│   1. Sentinels detect primary is down (quorum vote)                 │
│   2. Select best replica as new primary                             │
│   3. Reconfigure other replicas to follow new primary               │
│   4. Notify clients of new primary                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Redis Cluster

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    REDIS CLUSTER                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Hash Slots: 0 - 16383 (divided among nodes)                       │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                              │   │
│   │  Node A (slots 0-5460)        Node B (slots 5461-10922)     │   │
│   │  ┌─────────┐                  ┌─────────┐                   │   │
│   │  │ Primary │                  │ Primary │                   │   │
│   │  └────┬────┘                  └────┬────┘                   │   │
│   │       │                            │                        │   │
│   │  ┌────▼────┐                  ┌────▼────┐                   │   │
│   │  │ Replica │                  │ Replica │                   │   │
│   │  └─────────┘                  └─────────┘                   │   │
│   │                                                              │   │
│   │  Node C (slots 10923-16383)                                 │   │
│   │  ┌─────────┐                                                │   │
│   │  │ Primary │                                                │   │
│   │  └────┬────┘                                                │   │
│   │       │                                                     │   │
│   │  ┌────▼────┐                                                │   │
│   │  │ Replica │                                                │   │
│   │  └─────────┘                                                │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   KEY ROUTING:                                                       │
│   slot = CRC16(key) % 16384                                         │
│   Route to node owning that slot                                    │
│                                                                      │
│   CROSS-SLOT OPERATIONS:                                            │
│   Use hash tags: {user:123}:profile, {user:123}:settings            │
│   Same hash tag = same slot = same node                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 8: Common Issues & Solutions

### Cache Stampede

```text
PROBLEM: TTL expires → many simultaneous cache misses → DB overload

SOLUTIONS:

1. LOCKING (Distributed Lock)
   - First request gets lock, loads from DB
   - Other requests wait or return stale

2. EARLY REFRESH
   - Refresh cache before TTL expires
   - Background job refreshes at 80% of TTL

3. PROBABILISTIC EARLY EXPIRATION
   - Each request has chance to refresh
   - Spreads refresh load

4. STALE-WHILE-REVALIDATE
   - Return stale value immediately
   - Refresh in background
```

```java
@Service
public class StampedeProtectedCache {
    
    @Autowired
    private StringRedisTemplate redis;
    
    @Autowired
    private RedissonClient redisson;
    
    public String getWithLock(String key, Supplier<String> loader) {
        // 1. Try cache first
        String value = redis.opsForValue().get(key);
        if (value != null) {
            return value;
        }
        
        // 2. Cache miss - acquire distributed lock
        RLock lock = redisson.getLock("lock:" + key);
        
        try {
            // Wait max 5s for lock, hold max 10s
            if (lock.tryLock(5, 10, TimeUnit.SECONDS)) {
                try {
                    // Double-check after acquiring lock
                    value = redis.opsForValue().get(key);
                    if (value != null) {
                        return value;
                    }
                    
                    // Load from source
                    value = loader.get();
                    redis.opsForValue().set(key, value, Duration.ofMinutes(15));
                    return value;
                    
                } finally {
                    lock.unlock();
                }
            } else {
                // Couldn't get lock - wait a bit and retry cache
                Thread.sleep(100);
                return redis.opsForValue().get(key);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Cache load interrupted", e);
        }
    }
}
```

### Hot Keys

```text
PROBLEM: Single popular key overwhelms one cache node

SOLUTIONS:

1. LOCAL CACHING
   - Cache hot keys locally in each app server
   - Short TTL (1-5 seconds)

2. KEY REPLICATION
   - Store same data under multiple keys
   - key:1, key:2, key:3 (random selection)
   - Spreads load across nodes

3. READ REPLICAS
   - Configure reads from replicas
   - Scales read throughput
```

---

## Quick Reference

```text
┌─────────────────────────────────────────────────────────────────────┐
│                 DISTRIBUTED CACHE CHEAT SHEET                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PATTERNS:                                                           │
│  • Cache-Aside: App manages cache, best for read-heavy              │
│  • Read-Through: Cache loads data, consistent                       │
│  • Write-Through: Update cache+DB together, consistent              │
│  • Write-Behind: Async DB writes, fast but risky                    │
│                                                                      │
│  EVICTION:                                                           │
│  • LRU: Good default, temporal locality                             │
│  • LFU: Keeps popular items                                         │
│  • TTL: Guarantees freshness                                        │
│                                                                      │
│  CONSISTENCY:                                                        │
│  • Delete on write (not update)                                     │
│  • Event-driven invalidation                                        │
│  • Version in cache key                                             │
│                                                                      │
│  SCALING:                                                            │
│  • Consistent hashing for partitioning                              │
│  • Redis Cluster for >100GB                                         │
│  • Read replicas for read scaling                                   │
│                                                                      │
│  PROBLEMS:                                                           │
│  • Stampede: Lock or stale-while-revalidate                         │
│  • Hot keys: Local cache or key replication                         │
│  • Consistency: Accept eventual or use write-through                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Interview Tips

```text
✅ Start with caching levels (client → CDN → local → distributed)
✅ Explain cache-aside pattern clearly
✅ Discuss eviction policies and when to use each
✅ Cover consistency challenges and solutions
✅ Mention Redis Cluster for scaling
✅ Address cache stampede problem

❌ Don't forget about cache invalidation
❌ Don't ignore consistency vs performance trade-off
❌ Don't skip HA (Sentinel/Cluster)
```

---

**Back to:** [1. HLD Introduction ←](./01-intro)
