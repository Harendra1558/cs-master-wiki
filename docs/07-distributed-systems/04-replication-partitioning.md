---
title: 4. Replication & Partitioning
sidebar_position: 4
description: Master database replication strategies, sharding, consistent hashing, and data distribution for interviews.
keywords: [replication, sharding, partitioning, consistent hashing, master-slave, read replica]
---

# Replication & Partitioning

:::info Interview Importance ⭐⭐⭐⭐⭐
Replication and partitioning are fundamental to building scalable, highly available systems. These concepts come up in almost every system design interview.
:::

## 1. Why Replication?

### Goals of Replication

```text
1. HIGH AVAILABILITY
   └── System stays up even if some nodes fail
   └── No single point of failure

2. REDUCED LATENCY
   └── Data closer to users (geographic distribution)
   └── Read from nearest replica

3. INCREASED READ THROUGHPUT
   └── Spread read load across replicas
   └── Scale reads horizontally

4. DISASTER RECOVERY
   └── Survive datacenter failures
   └── Backups across regions
```

### Replication vs Backup

```text
REPLICATION                          BACKUP
├── Real-time or near real-time      ├── Periodic (hourly, daily)
├── Automatic failover possible      ├── Manual restore required
├── Same data format                 ├── May be compressed/archived
├── Active nodes (can serve reads)   ├── Passive storage
└── For availability + performance   └── For disaster recovery

You need BOTH:
├── Replication for availability/performance
└── Backup for protection against data corruption, ransomware
    (replication would copy the corruption!)
```

---

## 2. Single-Leader Replication (Master-Slave)

### How It Works

```text
                    ┌──────────────┐
      Writes ──────→│    LEADER    │
                    │   (Master)   │
                    └──────┬───────┘
                           │ Replication
            ┌──────────────┼──────────────┐
            ↓              ↓              ↓
      ┌──────────┐   ┌──────────┐   ┌──────────┐
      │ FOLLOWER │   │ FOLLOWER │   │ FOLLOWER │
      │ (Slave 1)│   │ (Slave 2)│   │ (Slave 3)│
      └──────────┘   └──────────┘   └──────────┘
            ↑              ↑              ↑
         Reads          Reads          Reads

Rules:
├── All WRITES go to leader only
├── READS can go to leader or followers
├── Leader pushes changes to followers
└── Followers are read-only replicas
```

### Synchronous vs Asynchronous Replication

```text
SYNCHRONOUS:
Client ──Write──→ Leader ──Replicate──→ Followers
                    ↓                        │
                   Wait ←────── ACK ─────────┘
                    ↓
               Respond to Client

Pros: Strong consistency (all replicas have data)
Cons: Higher latency, reduced availability (blocked by slow follower)

═══════════════════════════════════════════════════════════════

ASYNCHRONOUS:
Client ──Write──→ Leader ──→ Respond to Client
                    │
                    └──Replicate (async)──→ Followers

Pros: Low latency, better availability
Cons: Data loss if leader fails before replication

═══════════════════════════════════════════════════════════════

SEMI-SYNCHRONOUS (Common approach):
Wait for ONE follower to ACK, async to others.

Client ──Write──→ Leader ──Replicate──→ Follower1 (sync)
                    │                        │
                   Wait ←────── ACK ─────────┘
                    │
                    └──Replicate (async)──→ Follower2, Follower3
```

### Replication Lag

```text
Time since a follower received latest update from leader.

Problems caused by replication lag:

1. READ-AFTER-WRITE INCONSISTENCY
   User writes X=5 ──→ Leader (done)
   User reads X     ──→ Follower (still shows X=old value)
   
   Fix: Read your writes from leader, or wait for sync

2. MONOTONIC READ VIOLATIONS
   User reads from Follower1: sees X=5
   User reads from Follower2: sees X=3 (older)
   
   Fix: Sticky sessions (same user → same replica)

3. CAUSALITY VIOLATIONS
   User A writes: "Question?"
   User B replies: "Answer!"
   
   Reader sees: "Answer!" then "Question?" (wrong order)
   
   Fix: Causal consistency guarantees
```

### Handling Follower Failures

```text
1. FOLLOWER CRASHES AND RESTARTS:
   ├── Follower has log of changes
   ├── On restart, request missing changes since last known position
   └── Catch up with leader, then ready

2. LEADER FAILS (Failover):
   ┌────────────────────────────────────────────────────────┐
   │ 1. DETECT failure (timeout, health checks)             │
   │ 2. CHOOSE new leader (most up-to-date follower)        │
   │ 3. RECONFIGURE system (clients, other followers)       │
   └────────────────────────────────────────────────────────┘
   
   Challenges:
   ├── Uncommitted writes on old leader may be lost
   ├── Split-brain if old leader comes back
   └── Need fencing to prevent old leader from accepting writes
```

### Implementation Example

```java
// Read with replication lag tolerance
public User readUser(long userId, ReadConsistency consistency) {
    switch (consistency) {
        case LEADER:
            // Always read from leader (strongest)
            return leader.read(userId);
            
        case FOLLOWER:
            // Read from any follower (fastest, may be stale)
            return getRandomFollower().read(userId);
            
        case BOUNDED_STALENESS:
            // Read from follower if lag < threshold
            Follower follower = getLeastLaggedFollower();
            if (follower.getLag() < maxLagMs) {
                return follower.read(userId);
            }
            return leader.read(userId);
            
        case READ_YOUR_WRITES:
            // Read from follower only if it has user's last write
            if (follower.getPosition() >= user.getLastWritePosition()) {
                return follower.read(userId);
            }
            return leader.read(userId);
    }
}
```

---

## 3. Multi-Leader Replication (Master-Master)

### How It Works

```text
┌──────────────────┐              ┌──────────────────┐
│   LEADER (DC1)   │←────────────→│   LEADER (DC2)   │
│   New York       │  Bidirectional│   London         │
│                  │  Replication  │                  │
└──────────────────┘              └──────────────────┘
        ↑                                   ↑
    Writes/Reads                       Writes/Reads
        ↑                                   ↑
   US Clients                          EU Clients

Each datacenter has its own leader.
All leaders accept writes and replicate to each other.
```

### Use Cases

```text
1. MULTI-DATACENTER OPERATION
   └── Low latency for geographically distributed users
   └── Datacenter failure tolerance

2. OFFLINE CLIENTS
   └── Each device is a "leader" while offline
   └── Syncs when back online (e.g., mobile apps, CouchDB)

3. COLLABORATIVE EDITING
   └── Google Docs: each user's edits are local leaders
   └── Merge conflicts resolved automatically
```

### The Conflict Problem

```text
SCENARIO: Two leaders accept conflicting writes simultaneously

Leader A (NYC):  UPDATE users SET name='Alice' WHERE id=1
Leader B (LON):  UPDATE users SET name='Alicia' WHERE id=1

Both writes succeed locally. When they replicate...

Leader A sees: name='Alice', then replication says 'Alicia'
Leader B sees: name='Alicia', then replication says 'Alice'

WITHOUT CONFLICT RESOLUTION: Data diverges forever!
```

### Conflict Resolution Strategies

```text
1. LAST WRITE WINS (LWW)
   Each write has timestamp, newer wins.
   
   Pros: Simple, deterministic
   Cons: Clock skew issues, data loss
   
   Example:
   Write A: name='Alice' at t=100
   Write B: name='Alicia' at t=101
   → Alicia wins (newer timestamp)

2. CONFLICT-FREE REPLICATED DATA TYPES (CRDTs)
   Data structures designed to auto-merge without conflicts.
   
   Examples:
   ├── G-Counter: Only increments, sum across replicas
   ├── PN-Counter: Positive/Negative, tracks both
   ├── LWW-Register: Last-write-wins for single value
   └── OR-Set: Observed-Remove Set
   
3. MERGE FUNCTION
   Custom application logic to merge conflicting values.
   
   Example (shopping cart):
   Cart A: {item1: 2, item2: 1}
   Cart B: {item1: 1, item3: 3}
   Merge:  {item1: MAX(2,1)=2, item2: 1, item3: 3}

4. PROMPT USER
   Store all conflicting versions, ask user to resolve.
   
   Example: Git merge conflicts
```

### LWW Implementation

```java
public class LWWRegister<T> {
    private T value;
    private long timestamp;
    
    public synchronized void set(T newValue, long newTimestamp) {
        if (newTimestamp > this.timestamp) {
            this.value = newValue;
            this.timestamp = newTimestamp;
        }
        // Ignore if older timestamp
    }
    
    public T get() {
        return value;
    }
    
    // Merge with another replica
    public void merge(LWWRegister<T> other) {
        if (other.timestamp > this.timestamp) {
            this.value = other.value;
            this.timestamp = other.timestamp;
        }
    }
}
```

---

## 4. Leaderless Replication (Dynamo-style)

### How It Works

```text
No leader! Clients write to MULTIPLE replicas directly.

Write:
Client ──Write──→ Node A
       ──Write──→ Node B
       ──Write──→ Node C
       
Read:
Client ←──Read─── Node A (value: X=5, version: 10)
       ←──Read─── Node B (value: X=5, version: 10)
       ←──Read─── Node C (value: X=3, version: 8)  ← Stale!
       
Client picks value with highest version (X=5)
Client sends "repair" to Node C with correct value
```

### Quorum Reads and Writes

```text
N = Number of replicas
W = Write quorum (nodes that must ACK write)
R = Read quorum (nodes to read from)

For consistency: W + R > N

Common configurations:
┌────────────────────────────────────────────────────────────┐
│ N=3, W=2, R=2                                              │
│ └── Majority for both reads and writes                     │
│ └── Can tolerate 1 node failure                            │
│                                                            │
│ N=3, W=3, R=1                                              │
│ └── Strong write consistency                               │
│ └── Fast reads, but writes require all nodes               │
│                                                            │
│ N=3, W=1, R=3                                              │
│ └── Fast writes (fire and forget)                          │
│ └── Reads check all replicas                               │
└────────────────────────────────────────────────────────────┘
```

### Read Repair and Anti-Entropy

```text
How stale replicas get updated:

1. READ REPAIR
   When client reads, it detects stale values and writes
   the correct value back to stale replicas.
   
   Pros: Lazy, no background overhead
   Cons: Rarely-read data stays stale forever

2. ANTI-ENTROPY PROCESS
   Background process compares replicas and fixes differences.
   
   Uses Merkle trees for efficient comparison:
   └── Hash tree of data
   └── Compare root hashes
   └── If different, descend to find differing branches
   └── Sync only the differences
```

### Hinted Handoff

```text
When a node is temporarily down:

Normal write: Client → Node A, B, C

Node C is down:
Client → Node A (success)
       → Node B (success)
       → Node C (fail) → Write to Node D instead (hint)

Hint says: "This data belongs to Node C"

When Node C comes back up:
Node D sends hinted data to Node C ("handoff")

Provides better availability without sacrificing durability.
```

---

## 5. Partitioning (Sharding)

### Why Partition?

```text
PROBLEM: Data too large for single machine

Single DB:
├── 10 TB of data
├── 100,000 requests/second
├── Not enough RAM for indexes
└── Writes bottleneck on single disk

SOLUTION: Split data across multiple machines

Shard 1: Users A-H     (10,000 req/s)
Shard 2: Users I-P     (10,000 req/s)
Shard 3: Users Q-Z     (10,000 req/s)
...
└── Each shard handles fraction of total load
```

### Horizontal vs Vertical Partitioning

```text
VERTICAL PARTITIONING (by column):
┌───────────────────────┐    ┌────────────────┐ ┌─────────────────┐
│ ID │ Name │ Bio │ ... │ → │ ID │ Name      │ │ ID │ Bio │ ... │
└───────────────────────┘    └────────────────┘ └─────────────────┘
                             Frequently accessed  Rarely accessed

Use when: Some columns accessed much more than others

═══════════════════════════════════════════════════════════════════

HORIZONTAL PARTITIONING (by row):
┌────────────────────────┐
│ Users table (all rows) │
└────────────────────────┘
             ↓ Partition by user_id
┌────────────┐ ┌────────────┐ ┌────────────┐
│ Shard A    │ │ Shard B    │ │ Shard C    │
│ user_id    │ │ user_id    │ │ user_id    │
│ 1-1000     │ │ 1001-2000  │ │ 2001-3000  │
└────────────┘ └────────────┘ └────────────┘

Use when: Table has too many rows for single machine
```

### Partitioning Strategies

#### 1. Key-based (Hash) Partitioning

```text
shard = hash(key) % num_shards

Example:
hash("user_123") = 847293
847293 % 4 = 1
→ Goes to Shard 1

Pros:
├── Even distribution (good hash function)
├── Simple to understand
└── Any key finds its shard

Cons:
├── Adding shards requires rehashing EVERYTHING
├── Range queries need to hit ALL shards
└── Hot keys still create hotspots
```

#### 2. Range Partitioning

```text
Partition by key ranges:

Shard 1: A-H
Shard 2: I-P  
Shard 3: Q-Z

Or by time:
Shard Jan: 2024-01-01 to 2024-01-31
Shard Feb: 2024-02-01 to 2024-02-28
...

Pros:
├── Range queries hit single shard
├── Easy to add new shards (just new range)
└── Predictable data location

Cons:
├── Uneven distribution (more "S" names than "X")
├── Hot partitions (recent time shard gets all writes)
└── Need to rebalance as data grows unevenly
```

### Consistent Hashing

```text
PROBLEM with simple hash: Adding shard requires rehashing all keys

KEY INSIGHT: Map both keys AND servers to a ring

                    0°
                    │
                    │  Server A (45°)
          ┌────────•────────┐
         /                   \     Key X (60°) → Server B
       /      Key Z (30°)      \   (first server clockwise)
      •         → Server A      •  Server B (90°)
     /                           \
    •                             •
  270°                           180°
    •                             •
     \         Server C (240°)   /
      •                         •
       \                       /
        ─────────•───────────
                180°

When adding new server:
Only keys between new server and previous server need to move!
```

```java
public class ConsistentHash<T> {
    private final SortedMap<Long, T> ring = new TreeMap<>();
    private final int virtualNodes;  // For better distribution
    
    public ConsistentHash(List<T> nodes, int virtualNodes) {
        this.virtualNodes = virtualNodes;
        for (T node : nodes) {
            addNode(node);
        }
    }
    
    public void addNode(T node) {
        for (int i = 0; i < virtualNodes; i++) {
            long hash = hash(node.toString() + "-" + i);
            ring.put(hash, node);
        }
    }
    
    public void removeNode(T node) {
        for (int i = 0; i < virtualNodes; i++) {
            long hash = hash(node.toString() + "-" + i);
            ring.remove(hash);
        }
    }
    
    public T getNode(String key) {
        if (ring.isEmpty()) return null;
        
        long hash = hash(key);
        // Find first node with hash >= key's hash
        SortedMap<Long, T> tailMap = ring.tailMap(hash);
        
        Long nodeHash = tailMap.isEmpty() 
            ? ring.firstKey()  // Wrap around
            : tailMap.firstKey();
            
        return ring.get(nodeHash);
    }
    
    private long hash(String key) {
        // Use MurmurHash or similar for better distribution
        return Hashing.murmur3_128().hashString(key, UTF_8).asLong();
    }
}
```

### Hot Partitions

```text
PROBLEM: Uneven access patterns create hot spots

Example: Celebrity tweet goes viral
├── All reads/writes for that tweet hit ONE shard
├── That shard gets 1000x normal load
└── System degrades despite having spare capacity

Solutions:

1. KEY SPLITTING
   Add random suffix to hot keys: 
   tweet_123 → tweet_123_0, tweet_123_1, ..., tweet_123_9
   Reads must combine results from all splits.

2. CACHING
   Cache hot data in front of shards
   (Covered in Caching section)

3. READ REPLICAS FOR HOT PARTITIONS
   Add extra read replicas for hot shards only

4. APPLICATION-LEVEL SHARDING
   Special handling for known hot keys
   Route celebrity tweets to dedicated shard cluster
```

---

## 6. Rebalancing Partitions

### When to Rebalance

```text
1. Adding new nodes to handle more load
2. Removing failed nodes
3. Upgrading to bigger machines
4. Data distribution becomes skewed
```

### Rebalancing Strategies

```text
1. FIXED NUMBER OF PARTITIONS
   ├── Create many more partitions than nodes (e.g., 1000)
   ├── Assign multiple partitions per node
   ├── Moving node = reassign partitions (not data)
   ├── Used by: Riak, Elasticsearch, Couchbase
   └── Downside: Must choose partition count upfront

2. DYNAMIC PARTITIONING
   ├── Start with one partition
   ├── Split when partition gets too big
   ├── Merge when partitions get too small
   ├── Used by: HBase, RethinkDB
   └── Upside: Adapts to data size

3. PROPORTIONAL TO NODES
   ├── Fixed number of partitions per node
   ├── Adding node splits existing partitions
   ├── Used by: Cassandra
   └── Each node handles roughly equal load
```

### Zero-Downtime Rebalancing

```java
// Simple approach: Stop-the-world
// Bad for availability!

// Better: Online rebalancing
public class OnlineRebalancer {
    
    public void migratePartition(int partitionId, Node source, Node target) {
        // 1. Start copying data (takes time)
        target.startReceiving(partitionId);
        
        // 2. Stream existing data
        while (source.hasMoreData(partitionId)) {
            Batch batch = source.readBatch(partitionId);
            target.writeBatch(partitionId, batch);
        }
        
        // 3. Stream any new writes that came in during copy
        // (Double-write briefly to both)
        
        // 4. Atomic switchover
        synchronized (routingTable) {
            routingTable.update(partitionId, target);
        }
        
        // 5. Cleanup
        source.deletePartition(partitionId);
    }
}
```

---

## 7. Interview Questions

### Q1: How would you design a sharding strategy for a social media app?

```text
Answer:
"I'd approach this by analyzing access patterns:

1. User data: Shard by user_id
   ├── Profile reads: User accesses own profile
   ├── Most writes are user-initiated
   └── Consistent hashing for even distribution

2. Posts/Tweets: Shard by user_id (author)
   ├── Timeline reads need user's posts
   ├── Fans access author's posts (cache for hot authors)
   └── Keep user's posts co-located

3. Follower relationships: MORE COMPLEX
   ├── Option A: Shard by follower_id
   │   └── Getting 'who do I follow' is fast
   │   └── Getting 'who follows me' requires scatter-gather
   │
   ├── Option B: Shard by followed_id  
   │   └── Opposite trade-off
   │
   └── Option C: Bidirectional storage (denormalize)
       └── Store both directions, duplicate data

4. Fan-out considerations:
   ├── Push model: Write to all followers' timelines
   │   └── Slow for celebrities (millions of writes)
   ├── Pull model: Query author at read time
   │   └── Slow reads if following many
   └── Hybrid: Push for normal users, pull for celebrities"
```

### Q2: Explain the trade-offs between consistency levels in replication

```text
Answer:
"Different consistency levels offer different trade-offs:

STRONG CONSISTENCY (e.g., synchronous replication):
├── Pros: Always see latest data, simpler reasoning
├── Cons: Higher latency, lower availability
├── Use for: Financial transactions, inventory
└── Implementation: Wait for all/quorum replicas before ACK

EVENTUAL CONSISTENCY (e.g., async replication):
├── Pros: Low latency, high availability
├── Cons: May read stale data, conflict resolution needed
├── Use for: Social media feeds, analytics
└── Implementation: Write to leader, async replicate

BOUNDED STALENESS:
├── Pros: Balance of consistency and performance
├── Cons: More complex, need to track lag
├── Use for: Most applications with SLA requirements
└── Implementation: Read from replica if lag < threshold

SESSION CONSISTENCY (Read-your-writes):
├── Pros: User always sees their own writes
├── Cons: Only guarantees for same user
├── Use for: User-facing applications
└── Implementation: Track user's last write position

I'd choose based on:
1. Business requirements (can we show stale data?)
2. Latency requirements (how fast must reads be?)
3. Availability requirements (what if a node is down?)"
```

### Q3: What happens when you add a node to a consistent hash ring?

```text
Answer:
"When adding a new node to consistent hash:

1. Position new node on ring:
   hash(new_node_id) = position on ring
   
2. Identify affected keys:
   Only keys between NEW node and PREVIOUS node move.
   
   Before: ... → Node A (100°) → Node B (200°) → ...
   
   Add Node C at 150°:
   After:  ... → Node A (100°) → Node C (150°) → Node B (200°) → ...
   
   Keys 101° to 150°: Were at B, now at C
   All other keys: UNCHANGED
   
3. Data migration:
   ├── Copy affected keys from B to C
   ├── Update routing
   └── Delete from B
   
4. With virtual nodes:
   ├── Each physical node has many positions
   ├── Keys distributed more evenly
   └── Adding node still moves ~1/N of keys

Key benefit: Only ~1/N of keys move (vs ALL keys with simple hash)

Example with 4 shards:
Simple hash: Add shard → 75% of keys move
Consistent hash: Add shard → ~25% of keys move"
```

### Q4: How do you handle replication lag issues?

```text
Answer:
"Replication lag causes several problems with specific solutions:

1. Read-your-writes:
   Problem: User writes, then reads and doesn't see their write.
   
   Solutions:
   ├── Read from leader for user's own data
   ├── Track write timestamp, read from leader if recent
   └── Wait for replication before responding to write

2. Monotonic reads:
   Problem: User refreshes and sees older data.
   
   Solutions:
   ├── Sticky sessions (same user → same replica)
   └── Track last-read position, ensure next read is >= that

3. Cross-user causality:
   Problem: User A comments on B's post, C sees comment before post.
   
   Solutions:
   ├── Include causal dependencies in replication
   └── Logical timestamps for ordering

Monitoring:
├── Track replication lag metrics (seconds behind)
├── Alert if lag exceeds threshold
├── Auto-redirect reads to leader if lag too high

Prevention:
├── Upgrade replica hardware
├── Tune replication batch size
└── Ensure network bandwidth is sufficient"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│              REPLICATION & PARTITIONING CHEAT SHEET                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ REPLICATION TYPES:                                                    │
│ ├── Single-Leader: All writes to one node, reads from any            │
│ ├── Multi-Leader: Multiple nodes accept writes, sync between         │
│ └── Leaderless: Write to multiple, read from multiple (quorum)       │
│                                                                       │
│ SYNC VS ASYNC:                                                        │
│ ├── Sync: Wait for replicas, strong consistency, slower              │
│ └── Async: Don't wait, eventual consistency, faster                  │
│                                                                       │
│ CONFLICT RESOLUTION:                                                  │
│ ├── Last-Write-Wins (LWW): Timestamp decides                         │
│ ├── CRDTs: Auto-merge data structures                                │
│ └── Custom merge: Application logic                                  │
│                                                                       │
│ QUORUM:                                                               │
│ W + R > N for consistency                                             │
│ Example: N=3, W=2, R=2                                                │
│                                                                       │
│ PARTITIONING STRATEGIES:                                              │
│ ├── Hash: hash(key) % shards - even distribution                     │
│ ├── Range: A-H, I-P, Q-Z - range queries on one shard                │
│ └── Consistent Hash: Ring + virtual nodes - minimal rebalancing      │
│                                                                       │
│ HOT PARTITION SOLUTIONS:                                              │
│ ├── Key splitting: Add random suffix                                 │
│ ├── Caching: Cache hot data                                          │
│ └── Special handling: Dedicated cluster for hot keys                 │
│                                                                       │
│ REBALANCING:                                                          │
│ ├── Fixed partitions: Many partitions, move between nodes            │
│ ├── Dynamic: Split/merge as data grows                               │
│ └── Per-node: Fixed partitions per node, split on add                │
│                                                                       │
│ COMMON SYSTEMS:                                                       │
│ ├── Single-Leader: PostgreSQL, MySQL, MongoDB                        │
│ ├── Multi-Leader: CockroachDB (multi-region)                         │
│ └── Leaderless: Cassandra, DynamoDB, Riak                            │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Next:** [5. Distributed Transactions →](./distributed-transactions)
