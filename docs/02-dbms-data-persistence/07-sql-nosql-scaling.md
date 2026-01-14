---
title: "6. SQL vs NoSQL & Scaling"
sidebar_position: 7
description: When to use SQL vs NoSQL, CAP theorem, Sharding, and Replication
---

# SQL vs NoSQL & Database Scaling

:::info Interview Importance ⭐⭐⭐⭐⭐
This is a **must-know topic** for system design interviews. Choosing the right database type and understanding scaling patterns is critical.
:::

---

## 1. SQL (Relational) Databases

### What is SQL/RDBMS?

**Simple Answer:** Stores data in tables with rows and columns, with strict relationships between tables.

**Examples:** PostgreSQL, MySQL, Oracle, SQL Server, SQLite

### Key Characteristics

| Feature | Description |
|---------|-------------|
| **Schema** | Fixed, predefined structure |
| **Data Model** | Tables, rows, columns |
| **Relationships** | Foreign keys, JOINs |
| **Query Language** | SQL (Structured Query Language) |
| **ACID** | Strong transactional guarantees |
| **Scaling** | Primarily vertical |

### When to Use SQL?

✅ **Good for:**
- Complex queries with JOINs
- Transactions (financial, inventory)
- Strong data integrity requirements
- Well-defined, stable schema
- Reporting and analytics

```sql
-- Complex JOIN query (SQL strength)
SELECT 
    c.name,
    COUNT(o.id) as order_count,
    SUM(o.total) as total_spent
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
WHERE o.order_date > '2024-01-01'
GROUP BY c.id, c.name
HAVING SUM(o.total) > 1000
ORDER BY total_spent DESC;
```

---

## 2. NoSQL Databases

### What is NoSQL?

**Simple Answer:** "Not Only SQL" - databases that don't use traditional table-based structure.

### Types of NoSQL Databases

#### 1. Document Databases

**Examples:** MongoDB, CouchDB

**Data Model:** JSON-like documents

```javascript
// MongoDB document
{
  "_id": "order123",
  "customer": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "items": [
    {"product": "iPhone", "price": 999, "qty": 1},
    {"product": "AirPods", "price": 249, "qty": 2}
  ],
  "total": 1497,
  "status": "shipped"
}
```

**Good for:** 
- Variable/flexible schema
- Nested/hierarchical data
- Rapid development
- Content management

#### 2. Key-Value Stores

**Examples:** Redis, Amazon DynamoDB, Memcached

**Data Model:** Simple key → value pairs

```
Key: "user:1001"
Value: {"name": "John", "email": "john@example.com"}

Key: "session:abc123"
Value: {"user_id": 1001, "expires": "2024-01-15T10:00:00Z"}
```

**Good for:**
- Caching
- Session storage  
- Real-time data
- Simple lookups by key

#### 3. Wide-Column Stores

**Examples:** Apache Cassandra, HBase, ScyllaDB

**Data Model:** Tables with dynamic columns

```
Row Key: "user:1001"
Columns: {
  "name": "John",
  "email": "john@example.com",
  "order:2024-01-01": {...},
  "order:2024-01-15": {...},
  "order:2024-02-01": {...}
}
```

**Good for:**
- Time-series data
- Write-heavy workloads  
- Large scale (petabytes)
- Distributed systems

#### 4. Graph Databases

**Examples:** Neo4j, Amazon Neptune

**Data Model:** Nodes and relationships

```
(User:John)-[:FRIENDS_WITH]->(User:Jane)
(User:John)-[:PURCHASED]->(Product:iPhone)
(Product:iPhone)-[:CATEGORY]->(Category:Electronics)
```

**Good for:**
- Social networks
- Recommendation engines
- Fraud detection
- Knowledge graphs

### NoSQL Characteristics Summary

| Type | Example | Best For |
|------|---------|----------|
| **Document** | MongoDB | Flexible schemas, nested data |
| **Key-Value** | Redis | Caching, sessions, simple lookups |
| **Wide-Column** | Cassandra | Time-series, write-heavy, scale |
| **Graph** | Neo4j | Relationships, social networks |

---

## 3. SQL vs NoSQL Comparison

| Aspect | SQL | NoSQL |
|--------|-----|-------|
| **Schema** | Fixed, rigid | Flexible, dynamic |
| **Scalability** | Vertical (scale up) | Horizontal (scale out) |
| **Consistency** | Strong (ACID) | Eventual (BASE) |
| **JOINs** | Supported | Limited or none |
| **Transactions** | Full ACID | Limited (depends on DB) |
| **Query Language** | SQL (standard) | DB-specific APIs |
| **Best for** | Complex queries, integrity | Scale, flexibility, speed |

### When to Choose What?

```
Choose SQL when:
├── You need complex JOINs and queries
├── Data integrity is critical (banking, e-commerce orders)
├── Schema is well-defined and stable
├── ACID transactions are required
└── You need strong consistency

Choose NoSQL when:
├── Schema evolves frequently
├── Massive scale (millions of ops/sec)
├── Data is denormalized/hierarchical
├── Eventual consistency is acceptable
└── Specific use case (caching, time-series, graphs)
```

---

## 4. CAP Theorem

### What is CAP Theorem?

In a distributed system, you can only guarantee **2 out of 3** properties:

- **C**onsistency: Every read returns the latest write
- **A**vailability: Every request gets a response
- **P**artition Tolerance: System works despite network failures

```
        Consistency
           /\
          /  \
         /    \
        / CP   \
       /   DB   \
      /          \
     /            \
    /--------------\
   /   AP    CA     \
  /    DB    DB      \
 /                    \
Availability --------- Partition Tolerance
              (Network issues)
```

### The Reality: P is Not Optional

In distributed systems, **network partitions WILL happen**. So the real choice is:

- **CP:** Sacrifice availability during partitions (block requests)
- **AP:** Sacrifice consistency (serve stale data)

### Database Classifications

| Category | Behavior | Examples |
|----------|----------|----------|
| **CP** | Consistent, may reject requests | MongoDB (default), HBase, Redis Cluster |
| **AP** | Available, may return stale data | Cassandra, DynamoDB, CouchDB |
| **CA** | Consistent and available (single node) | Traditional RDBMS (non-distributed) |

### Interview Question: Can a database be all three?

**Answer:** No, during a network partition, you must choose between consistency and availability. However, **when there's no partition**, you can have both C and A. The CAP theorem is about behavior during failures.

---

## 5. ACID vs BASE

### ACID (SQL Databases)

| Property | Meaning |
|----------|---------|
| **A**tomicity | All or nothing |
| **C**onsistency | Valid state to valid state |
| **I**solation | Transactions don't interfere |
| **D**urability | Committed = permanent |

### BASE (NoSQL Databases)

| Property | Meaning |
|----------|---------|
| **B**asically **A**vailable | System is always available |
| **S**oft state | State may change over time (sync) |
| **E**ventual consistency | Will become consistent eventually |

### Comparison

```
ACID:
├── Strong guarantees
├── Lower throughput
├── Higher latency
└── Easier to reason about

BASE:
├── Weaker guarantees
├── Higher throughput
├── Lower latency
└── Must handle inconsistency in application
```

---

## 6. Database Scaling

### Vertical Scaling (Scale Up)

Add more resources to a **single server**.

```
Before:           After:
┌─────────┐      ┌─────────────┐
│ 4 CPU   │  →   │ 32 CPU      │
│ 16 GB   │      │ 256 GB      │
│ 1 TB    │      │ 10 TB SSD   │
└─────────┘      └─────────────┘
```

**Pros:**
- Simple (no code changes)
- No distributed complexity

**Cons:**
- Hardware limits
- Expensive
- Single point of failure

### Horizontal Scaling (Scale Out)

Add more **servers** to the cluster.

```
Before:           After:
┌─────────┐      ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Server  │  →   │ Server 1│ │ Server 2│ │ Server 3│
└─────────┘      └─────────┘ └─────────┘ └─────────┘
```

**Pros:**
- Near-infinite scale
- Cost-effective (commodity hardware)
- High availability

**Cons:**
- Complex (distributed systems problems)
- Application changes needed
- Consistency challenges

---

## 7. Replication

### What is Replication?

Copying data to multiple servers for:
- **High Availability:** If one server dies, others continue
- **Read Scaling:** Distribute read load
- **Disaster Recovery:** Data backup in different locations

### Replication Strategies

#### 1. Master-Slave (Primary-Replica)

```
┌──────────────┐
│   Primary    │  ← All writes go here
│   (Master)   │
└──────────────┘
       │
       │ Replication (async/sync)
       ▼
┌──────────────┐    ┌──────────────┐
│   Replica 1  │    │   Replica 2  │  ← Reads distributed here
│   (Slave)    │    │   (Slave)    │
└──────────────┘    └──────────────┘
```

**Characteristics:**
- Single write point (no conflicts)
- Read scaling
- Replication lag possible with async

#### 2. Master-Master (Multi-Primary)

```
┌──────────────┐         ┌──────────────┐
│   Primary 1  │ ←─────→ │   Primary 2  │
│   (writes)   │   sync  │   (writes)   │
└──────────────┘         └──────────────┘
```

**Characteristics:**
- Writes to any primary
- Conflict resolution needed
- Higher availability

#### 3. Synchronous vs Asynchronous Replication

| Type | Behavior | Trade-off |
|------|----------|-----------|
| **Synchronous** | Wait for replica confirmation | Strong consistency, higher latency |
| **Asynchronous** | Don't wait, replicate later | Lower latency, possible data loss |

```
Synchronous:
Client → Primary → Replica → Primary → Client
         write      ack       ack      response
         
Time: 50ms (includes replica wait)

Asynchronous:
Client → Primary → Client    (Replica syncs later)
         write     response
         
Time: 10ms (replica catches up eventually)
```

---

## 8. Sharding (Partitioning)

### What is Sharding?

Splitting data across multiple servers based on some key.

```
Full Dataset: Users 1-1,000,000

Shard 1 (Server A): Users 1-333,333
Shard 2 (Server B): Users 333,334-666,666
Shard 3 (Server C): Users 666,667-1,000,000
```

### Sharding Strategies

#### 1. Range-Based Sharding

```
Shard by user_id range:
├── Shard 1: user_id 1-1,000,000
├── Shard 2: user_id 1,000,001-2,000,000
└── Shard 3: user_id 2,000,001-3,000,000
```

**Pros:** Range queries efficient on single shard
**Cons:** Hotspots (new users always hit last shard)

#### 2. Hash-Based Sharding

```
shard_id = hash(user_id) % num_shards

User 12345: hash(12345) % 3 = 2 → Shard 2
User 67890: hash(67890) % 3 = 0 → Shard 0
```

**Pros:** Even distribution, no hotspots
**Cons:** Range queries need all shards, resharding is hard

#### 3. Directory-Based Sharding

```
Lookup Table:
├── user_id 1-1000 → Shard 1
├── user_id 1001-5000 → Shard 2
├── user_id 5001-10000 → Shard 3
└── ... (flexible mapping)
```

**Pros:** Flexible, custom logic
**Cons:** Lookup service is single point of failure

### Sharding Challenges

| Challenge | Description |
|-----------|-------------|
| **Cross-Shard Queries** | JOINs across shards are expensive |
| **Resharding** | Adding shards requires data movement |
| **Transactions** | Distributed transactions are complex |
| **Application Changes** | App must know about sharding |

### When to Shard?

```
Consider sharding when:
├── Single server can't handle load
├── Data doesn't fit on one server
├── Need geographic distribution
└── After trying: read replicas, caching, query optimization

Avoid sharding if:
├── Vertical scaling is still viable
├── Read replicas can handle load
├── Caching solves the problem
└── Data size is manageable (under 5TB)
```

---

## 9. Choosing the Right Database

### Decision Framework

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE SELECTION                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Need complex JOINs and transactions?                           │
│  ├── YES → SQL (PostgreSQL, MySQL)                              │
│  └── NO ↓                                                       │
│                                                                  │
│  Need flexible schema for rapid development?                    │
│  ├── YES → Document DB (MongoDB)                                │
│  └── NO ↓                                                       │
│                                                                  │
│  Need ultra-fast caching/sessions?                              │
│  ├── YES → Key-Value (Redis)                                    │
│  └── NO ↓                                                       │
│                                                                  │
│  Need massive write throughput?                                 │
│  ├── YES → Wide-Column (Cassandra)                              │
│  └── NO ↓                                                       │
│                                                                  │
│  Need to model relationships/networks?                          │
│  ├── YES → Graph DB (Neo4j)                                     │
│  └── NO ↓                                                       │
│                                                                  │
│  Default: PostgreSQL (most versatile)                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Common Combos in Production

| Use Case | Databases Used |
|----------|----------------|
| **E-commerce** | PostgreSQL (orders) + Redis (cache) + Elasticsearch (search) |
| **Social Network** | PostgreSQL (users) + Cassandra (posts) + Redis (feeds) + Neo4j (graph) |
| **IoT/Analytics** | TimescaleDB or InfluxDB (time-series) + Kafka (streaming) |
| **Content Platform** | MongoDB (content) + Redis (cache) + Elasticsearch (search) |

---

## 10. Top Interview Questions

### Q1: When would you choose NoSQL over SQL?

**Answer:**
- **Flexible schema:** Evolving data structures
- **Horizontal scalability:** Massive scale requirements
- **High write throughput:** Time-series, logging
- **Specific data model:** Documents, graphs, key-value

But choose SQL when you need:
- Complex JOINs
- ACID transactions
- Strong consistency

### Q2: Explain CAP theorem with an example.

**Answer:** CAP states you can only guarantee 2 of 3: Consistency, Availability, Partition Tolerance.

Example: During network partition between data centers:
- **CP choice (MongoDB):** Reject writes to ensure consistency
- **AP choice (Cassandra):** Accept writes, sync later (eventual consistency)

In practice, P is mandatory, so choose between C and A during failures.

### Q3: What is the difference between sharding and replication?

**Answer:**
- **Replication:** Copying same data to multiple servers. For availability and read scaling.
- **Sharding:** Splitting data across servers by some key. For capacity and write scaling.

Usually used together: each shard is replicated for availability.

### Q4: What is eventual consistency?

**Answer:** Eventual consistency means that after an update, if no new updates are made, all reads will eventually return the latest value. There's a window where different nodes may return different values.

Example: User updates profile on Server A. Server B shows old data for 2 seconds until replication completes. Eventually both are consistent.

### Q5: How do you decide on a sharding key?

**Answer:**
1. **High cardinality:** Many unique values (user_id good, country_code bad)
2. **Even distribution:** Avoids hotspots
3. **Query patterns:** Most queries should hit single shard
4. **Immutable:** Key shouldn't change (resharding is expensive)

For users table: `user_id` is usually good. For orders: `customer_id` if most queries are per-customer.

---

## Quick Reference Card

```
┌──────────────────────────────────────────────────────────────────┐
│            SQL vs NoSQL CHEAT SHEET                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ SQL (PostgreSQL, MySQL):                                         │
│ ├── Fixed schema, tables with rows                              │
│ ├── Strong ACID transactions                                    │
│ ├── Complex JOINs                                               │
│ └── Good for: transactions, integrity, analytics                │
│                                                                  │
│ NoSQL TYPES:                                                     │
│ ├── Document (MongoDB)    → Flexible JSON documents             │
│ ├── Key-Value (Redis)     → Caching, sessions                   │
│ ├── Wide-Column(Cassandra)→ Time-series, write-heavy            │
│ └── Graph (Neo4j)         → Relationships, social               │
│                                                                  │
│ CAP THEOREM:                                                     │
│ └── Choose 2: Consistency, Availability, Partition Tolerance    │
│                                                                  │
│ SCALING:                                                         │
│ ├── Vertical: Bigger server (limited)                           │
│ ├── Replication: Same data, multiple servers (read scale)       │
│ └── Sharding: Split data across servers (write scale)           │
│                                                                  │
│ SHARDING KEYS:                                                   │
│ ├── High cardinality (many unique values)                       │
│ ├── Even distribution (no hotspots)                             │
│ └── Match query patterns                                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```
