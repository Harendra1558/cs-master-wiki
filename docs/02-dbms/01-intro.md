---
id: dbms-data-persistence
title: DBMS & Data Persistence 
sidebar_position: 2
slug: /dbms-guide
---

# DBMS & Data Persistence - Complete Guide

:::info WHY THIS MATTERS
Understanding database internals prevents **production disasters**: slow queries, deadlocks, connection pool exhaustion, and data corruption. This knowledge is **critical** for building scalable backend systems.
:::

---

## 1. Index Trade-offs

### 1.1 The Write Penalty

**Every index slows down writes** because the database must update:
1. The actual table data
2. All indexes on that table

```sql
-- Table with 5 indexes
CREATE TABLE users (
    id BIGINT PRIMARY KEY,          -- Index 1
    email VARCHAR(255) UNIQUE,      -- Index 2
    username VARCHAR(100),
    created_at TIMESTAMP,
    status VARCHAR(20)
);

CREATE INDEX idx_username ON users(username);        -- Index 3
CREATE INDEX idx_created_at ON users(created_at);    -- Index 4
CREATE INDEX idx_status ON users(status);            -- Index 5

-- Single INSERT updates 5 index structures!
INSERT INTO users VALUES (1, 'user@example.com', 'john', NOW(), 'active');
```

**Performance Impact:**

| Indexes | INSERT/s | Notes |
|---------|----------|-------|
| 0 | 100,000 | Baseline |
| 1 | 80,000 | -20% |
| 3 | 50,000 | -50% |
| 5 | 30,000 | -70% |

**Real-World Example:**
```sql
-- BAD: Over-indexed table
CREATE TABLE events (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    event_type VARCHAR(50),
    created_at TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB
);

-- 10+ indexes slow down high-frequency inserts
CREATE INDEX idx_user_id ON events(user_id);
CREATE INDEX idx_event_type ON events(event_type);
CREATE INDEX idx_created_at ON events(created_at);
CREATE INDEX idx_ip ON events(ip_address);
-- ... 6 more indexes

-- GOOD: Index only frequently queried columns
CREATE INDEX idx_user_created ON events(user_id, created_at);
-- This single composite index covers most queries
```

**Rule of Thumb:**
- **Read-heavy tables**: More indexes OK
- **Write-heavy tables**: Minimize indexes
- **High-frequency inserts** (logs, events): 1-2 indexes max

### 1.2 Composite Index Column Order

**Order matters! Index on (A, B, C) is NOT the same as (C, B, A)**

```sql
CREATE TABLE orders (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    status VARCHAR(20),
    created_at TIMESTAMP
);

-- Composite index
CREATE INDEX idx_user_status_created 
ON orders(user_id, status, created_at);
```

**What This Index Can Optimize:**

✅ **Uses Index (Left-to-Right Match):**
```sql
-- Uses full index
SELECT * FROM orders 
WHERE user_id = 123 AND status = 'pending' AND created_at > '2025-01-01';

-- Uses index (user_id, status)
SELECT * FROM orders 
WHERE user_id = 123 AND status = 'pending';

-- Uses index (user_id only)
SELECT * FROM orders 
WHERE user_id = 123;
```

❌ **Does NOT Use Index:**
```sql
-- Skips first column → full table scan
SELECT * FROM orders WHERE status = 'pending';

-- Skips first column → full table scan
SELECT * FROM orders WHERE created_at > '2025-01-01';
```

**Column Order Strategy:**

```
1. Equality filters (=)         → Leftmost
2. Range filters (>, <, BETWEEN) → Middle
3. Sort columns (ORDER BY)       → Rightmost
```

**Example:**
```sql
-- Query pattern
SELECT * FROM orders 
WHERE user_id = ? 
  AND status = ? 
  AND created_at > ?
ORDER BY created_at DESC;

-- Optimal index order
CREATE INDEX idx_optimal 
ON orders(user_id, status, created_at DESC);
--         ^^^^^^^^ ^^^^^^ ^^^^^^^^^^
--         Equality Equality Range+Sort
```

### 1.3 Index-Only Scans (Covering Index)

**When query touches only indexed columns → no table access needed**

```sql
CREATE INDEX idx_user_email ON users(user_id, email);

-- Index-only scan (fast)
SELECT user_id, email FROM users WHERE user_id = 123;
-- ✅ All data in index → no table read

-- Requires table access (slower)
SELECT user_id, email, full_name FROM users WHERE user_id = 123;
-- ❌ full_name not in index → must read table
```

**PostgreSQL EXPLAIN:**
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, email FROM users WHERE user_id = 123;

-- Output shows "Index Only Scan"
Index Only Scan using idx_user_email on users
  (cost=0.42..8.44 rows=1 width=520) (actual time=0.015..0.016 rows=1 loops=1)
  Heap Fetches: 0  ← No table access!
```

**Use Case: Materialized Columns**
```sql
-- Frequently query aggregates
SELECT user_id, COUNT(*) 
FROM orders 
WHERE status = 'completed'
GROUP BY user_id;

-- Optimize with covering index
CREATE INDEX idx_covering 
ON orders(status, user_id) 
INCLUDE (created_at);  -- PostgreSQL 11+
-- All needed columns in index
```

### 1.4 SELECT * Anti-Pattern

**Why `SELECT *` Hurts Performance:**

```sql
-- BAD: Fetches 50 columns (2KB per row)
SELECT * FROM users WHERE id = 123;

-- GOOD: Fetches 3 columns (100 bytes)
SELECT id, email, username FROM users WHERE id = 123;
```

**Problems with SELECT *:**

1. **Network Overhead:**
```
SELECT *           → 2KB × 10,000 rows = 20MB network transfer
SELECT id, name    → 100B × 10,000 rows = 1MB network transfer
```

2. **Memory Pressure:**
```java
// Application server memory
List<User> users = jdbcTemplate.query("SELECT * FROM users LIMIT 10000");
// 10K rows × 2KB = 20MB in heap (before OOM!)
```

3. **Prevents Index-Only Scans:**
```sql
-- Index on (user_id, status)
SELECT * FROM orders WHERE user_id = 123;
-- ❌ Must read table for all columns

SELECT user_id, status FROM orders WHERE user_id = 123;
-- ✅ Index-only scan
```

4. **Breaking Changes:**
```sql
-- DBA adds new BLOB column
ALTER TABLE users ADD COLUMN profile_photo BYTEA;

-- Your code breaks (memory/performance)
SELECT * FROM users;  -- Now fetches MB-sized photos
```

**Best Practice:**
```sql
-- Always specify columns
SELECT id, email, username, created_at 
FROM users 
WHERE status = 'active';
```

---

## 2. Query Execution

### 2.1 Cost-Based Optimizer

**Database chooses query plan based on estimated cost:**

```sql
-- Query
SELECT * FROM orders WHERE user_id = 123;

-- Optimizer considers:
-- Option 1: Full table scan (cost: 10000)
-- Option 2: Index scan on user_id (cost: 45)
-- Option 3: Bitmap index scan (cost: 120)
-- 
-- Chooses Option 2 (lowest cost)
```

**Cost Calculation Factors:**
- **Table statistics** (row count, data distribution)
- **Index selectivity** (unique values)
- **I/O cost** (disk seeks)
- **CPU cost** (filtering, sorting)

**Statistics Matter:**
```sql
-- Outdated stats → bad plans
SELECT * FROM orders WHERE status = 'pending';
-- Optimizer thinks: 50% of rows are pending (old stat)
-- Reality: 1% are pending
-- Result: Full table scan instead of index

-- Fix: Update statistics
ANALYZE orders;  -- PostgreSQL
ANALYZE TABLE orders;  -- MySQL
```

**Force Index (Last Resort):**
```sql
-- PostgreSQL
SELECT * FROM orders WHERE user_id = 123
  AND created_at > '2025-01-01'
ORDER BY created_at DESC;

-- Force specific index if optimizer chooses wrong plan
SELECT /*+ INDEX(orders idx_user_created) */ 
  * FROM orders 
WHERE user_id = 123;
```

### 2.2 EXPLAIN - Reading Query Plans

**PostgreSQL:**
```sql
EXPLAIN 
SELECT o.id, u.email 
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending';
```

**Output:**
```
Hash Join  (cost=1234.56..5678.90 rows=100 width=520)
  Hash Cond: (o.user_id = u.id)
  ->  Seq Scan on orders o  (cost=0.00..2345.67 rows=500 width=8)
        Filter: (status = 'pending'::text)
  ->  Hash  (cost=789.01..789.01 rows=10000 width=520)
        ->  Seq Scan on users u  (cost=0.00..789.01 rows=10000 width=520)
```

**Key Metrics:**
- **cost=X..Y**: Estimated cost (startup..total)
- **rows=N**: Estimated rows returned
- **width=B**: Average row size in bytes
- **Seq Scan**: Full table scan (slow for large tables)
- **Index Scan**: Uses index (usually faster)
- **Hash Join**: Join algorithm

**Red Flags:**
- ❌ **Seq Scan on large tables** (millions of rows)
- ❌ **High cost** (> 10,000 for simple queries)
- ❌ **rows=X** where X is far from actual

### 2.3 EXPLAIN ANALYZE - Actual Execution

**Runs query and shows real metrics:**

```sql
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT * FROM orders 
WHERE user_id = 123 
  AND created_at > '2025-01-01'
ORDER BY created_at DESC
LIMIT 10;
```

**Output:**
```
Index Scan using idx_user_created on orders  
  (cost=0.56..123.45 rows=10 width=520) 
  (actual time=0.034..0.156 rows=10 loops=1)
  Index Cond: ((user_id = 123) AND (created_at > '2025-01-01'))
  Buffers: shared hit=15 read=2
Planning Time: 0.234 ms
Execution Time: 0.189 ms
```

**Key Differences from EXPLAIN:**
- **actual time**: Real execution time
- **actual rows**: Real row count
- **loops**: How many times operation ran
- **Buffers hit/read**: Cache hits vs disk reads

**Performance Indicators:**

✅ **Good:**
```
Buffers: shared hit=100 read=0  ← All from cache
Execution Time: 1.234 ms
```

❌ **Bad:**
```
Buffers: shared hit=10 read=5000  ← Disk I/O bottleneck
Execution Time: 2345.678 ms
```

**Real-World Example:**
```sql
-- Slow query investigation
EXPLAIN (ANALYZE, BUFFERS)
SELECT u.email, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.email
HAVING COUNT(o.id) > 10;

-- Look for:
-- 1. Seq Scans → Need indexes
-- 2. High actual time → Bottleneck
-- 3. Buffers read >> hit → Cache misses
-- 4. rows estimate vs actual → Update stats
```

---

## 3. Transactions

### 3.1 ACID Properties

**Atomicity:** All-or-nothing
```sql
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
  -- Both succeed or both rollback
COMMIT;
```

**Consistency:** Valid state transitions
```sql
-- CHECK constraint ensures consistency
ALTER TABLE accounts 
ADD CONSTRAINT balance_positive CHECK (balance >= 0);

BEGIN;
  UPDATE accounts SET balance = balance - 1000 WHERE id = 1;
  -- Fails if balance goes negative → ROLLBACK
COMMIT;
```

**Isolation:** Concurrent transactions don't interfere
```sql
-- Transaction 1
BEGIN;
  SELECT balance FROM accounts WHERE id = 1;  -- Sees 500
  -- Transaction 2 updates to 600
  SELECT balance FROM accounts WHERE id = 1;  -- Still sees 500 (REPEATABLE READ)
COMMIT;
```

**Durability:** Committed data survives crashes
```sql
COMMIT;  -- Data flushed to disk (WAL)
-- Server crashes here
-- On restart: committed data is safe
```

### 3.2 Isolation Levels

**Trade-off: Consistency vs Concurrency**

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Performance |
|-------|------------|---------------------|--------------|-------------|
| **READ UNCOMMITTED** | ✅ Yes | ✅ Yes | ✅ Yes | Fastest |
| **READ COMMITTED** | ❌ No | ✅ Yes | ✅ Yes | Default (most DBs) |
| **REPEATABLE READ** | ❌ No | ❌ No | ✅ Yes (PostgreSQL: No) | Slower |
| **SERIALIZABLE** | ❌ No | ❌ No | ❌ No | Slowest |

**1. READ UNCOMMITTED** (Almost never used)
```sql
-- Transaction 1
BEGIN;
  UPDATE accounts SET balance = 1000 WHERE id = 1;
  -- Not committed yet

-- Transaction 2 (READ UNCOMMITTED)
SELECT balance FROM accounts WHERE id = 1;  -- Sees 1000 (dirty read!)

-- Transaction 1
ROLLBACK;  -- Oops, Transaction 2 saw invalid data
```

**2. READ COMMITTED** (Default in PostgreSQL, Oracle)
```sql
-- Transaction 1
BEGIN;
  SELECT balance FROM accounts WHERE id = 1;  -- Sees 500

-- Transaction 2
UPDATE accounts SET balance = 600 WHERE id = 1;
COMMIT;

-- Transaction 1
  SELECT balance FROM accounts WHERE id = 1;  -- Sees 600 (non-repeatable read)
COMMIT;
```

**Use Case:** Most web applications (each request = short transaction)

**3. REPEATABLE READ** (Default in MySQL)
```sql
-- Transaction 1
BEGIN;
  SELECT * FROM accounts WHERE balance > 100;  -- Returns 5 rows

-- Transaction 2
INSERT INTO accounts VALUES (6, 150);
COMMIT;

-- Transaction 1
  SELECT * FROM accounts WHERE balance > 100;  
  -- PostgreSQL: Still 5 rows (snapshot isolation)
  -- MySQL: 6 rows (phantom read possible)
COMMIT;
```

**Use Case:** Reports, analytics (need consistent snapshot)

**4. SERIALIZABLE** (Strictest)
```sql
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Transaction 1
BEGIN;
  SELECT SUM(balance) FROM accounts;  -- Total: 1000

-- Transaction 2
BEGIN;
  INSERT INTO accounts VALUES (6, 200);
COMMIT;

-- Transaction 1
  -- Detects conflict → serialization error
  UPDATE accounts SET balance = balance * 1.1;
ROLLBACK;  -- Must retry
```

**Use Case:** Financial systems, critical operations

**Setting Isolation Level:**
```sql
-- PostgreSQL
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- MySQL
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Per transaction
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

### 3.3 MVCC (Multi-Version Concurrency Control)

**PostgreSQL/InnoDB:** Readers don't block writers, writers don't block readers

```sql
-- How MVCC Works:
-- Each row has hidden columns: xmin (created), xmax (deleted)

-- Time T1: Row inserted
INSERT INTO users VALUES (1, 'Alice');
-- Internal: xmin=100, xmax=NULL

-- Time T2: Transaction 101 starts
BEGIN;  -- Transaction ID: 101
  SELECT * FROM users WHERE id = 1;
  -- Sees row (xmin=100 < 101, xmax=NULL)

-- Time T3: Transaction 102 updates
BEGIN;  -- Transaction ID: 102
  UPDATE users SET name = 'Bob' WHERE id = 1;
  -- Creates new version: xmin=102, xmax=NULL
  -- Old version: xmin=100, xmax=102
COMMIT;

-- Time T4: Transaction 101 still sees old version
  SELECT * FROM users WHERE id = 1;  
  -- Sees "Alice" (xmin=100, xmax=102 > 101)
COMMIT;
```

**Benefits:**
- ✅ High concurrency (no read locks)
- ✅ Consistent snapshots
- ✅ No deadlocks between readers/writers

**Drawbacks:**
- ❌ VACUUM needed (PostgreSQL) to clean old versions
- ❌ Slightly more storage
- ❌ Write amplification

---

## 4. Locking

### 4.1 Row vs Table Locks

**Row-Level Locks** (InnoDB, PostgreSQL)
```sql
-- Lock only affected rows
BEGIN;
  UPDATE users SET status = 'active' WHERE id = 1;
  -- Only row id=1 is locked
  -- Other transactions can update id=2, id=3, etc.
COMMIT;
```

**Table-Level Locks** (MyISAM, older databases)
```sql
-- Lock entire table
LOCK TABLES users WRITE;
  UPDATE users SET status = 'active' WHERE id = 1;
  -- ALL rows locked → blocks all other writes
UNLOCK TABLES;
```

**Lock Types in PostgreSQL:**

| Lock Mode | Blocks | Use Case |
|-----------|--------|----------|
| **ACCESS SHARE** | ACCESS EXCLUSIVE | `SELECT` |
| **ROW EXCLUSIVE** | SHARE, EXCLUSIVE | `UPDATE`, `DELETE`, `INSERT` |
| **SHARE** | ROW EXCLUSIVE, SHARE, EXCLUSIVE | `CREATE INDEX CONCURRENTLY` |
| **EXCLUSIVE** | Most operations | `REFRESH MATERIALIZED VIEW` |
| **ACCESS EXCLUSIVE** | All | `ALTER TABLE`, `DROP TABLE` |

**Checking Locks:**
```sql
-- PostgreSQL
SELECT 
  pid, 
  usename, 
  pg_blocking_pids(pid) as blocked_by, 
  query 
FROM pg_stat_activity 
WHERE cardinality(pg_blocking_pids(pid)) > 0;
```

### 4.2 Optimistic vs Pessimistic Locking

**Pessimistic Locking** (Lock before read)
```sql
-- FOR UPDATE: Exclusive lock on selected rows
BEGIN;
  SELECT * FROM inventory 
  WHERE product_id = 123 
  FOR UPDATE;  -- Locks row
  
  -- Other transactions wait here
  
  UPDATE inventory 
  SET quantity = quantity - 1 
  WHERE product_id = 123;
COMMIT;
```

**Use Cases:**
- High contention
- Critical data (payments, inventory)
- Short transactions

**Optimistic Locking** (Version check)
```sql
-- Add version column
ALTER TABLE inventory ADD COLUMN version INT DEFAULT 0;

-- Application-level optimistic locking
-- Read
SELECT id, quantity, version FROM inventory WHERE product_id = 123;
-- version = 5, quantity = 10

-- Update with version check
UPDATE inventory 
SET quantity = 9, version = 6 
WHERE product_id = 123 AND version = 5;
-- If affected_rows = 0 → someone else updated → retry

-- Alternative: timestamp
UPDATE inventory 
SET quantity = 9, updated_at = NOW() 
WHERE product_id = 123 
  AND updated_at = '2025-01-08 10:00:00';
```

**Use Cases:**
- Low contention
- Long transactions
- Read-heavy workloads

**Comparison:**

| Aspect | Pessimistic | Optimistic |
|--------|-------------|-----------|
| **Locking** | Immediate | None (version check) |
| **Contention** | Blocks other transactions | Retries on conflict |
| **Deadlock Risk** | Higher | Lower |
| **Performance** | Better for high contention | Better for low contention |
| **Use Case** | Banking, inventory | Shopping cart, user profiles |

### 4.3 Deadlocks

**Classic Deadlock:**
```sql
-- Transaction 1
BEGIN;
  UPDATE accounts SET balance = 100 WHERE id = 1;  -- Locks row 1
  -- Wait...
  UPDATE accounts SET balance = 200 WHERE id = 2;  -- Waits for row 2

-- Transaction 2
BEGIN;
  UPDATE accounts SET balance = 300 WHERE id = 2;  -- Locks row 2
  -- Wait...
  UPDATE accounts SET balance = 400 WHERE id = 1;  -- Waits for row 1

-- DEADLOCK! Each waits for the other
-- Database detects and rolls back one transaction
```

**Deadlock Error:**
```
ERROR: deadlock detected
DETAIL: Process 1234 waits for ShareLock on transaction 5678;
        Process 5678 waits for ShareLock on transaction 1234.
HINT: See server log for query details.
```

**Prevention Strategies:**

**1. Consistent Lock Order**
```sql
-- BAD: Different order
-- Transaction 1: Lock A, then B
-- Transaction 2: Lock B, then A

-- GOOD: Always lock in same order
BEGIN;
  SELECT * FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE;
  -- Always locks id=1 first, then id=2
COMMIT;
```

**2. Use Smaller Transactions**
```sql
-- BAD: Long transaction holds locks
BEGIN;
  UPDATE accounts SET balance = 100 WHERE id = 1;
  -- ... complex business logic (5 seconds)
  -- ... external API call (10 seconds)
  UPDATE orders SET status = 'paid' WHERE user_id = 1;
COMMIT;

-- GOOD: Split into smaller transactions
BEGIN;
  UPDATE accounts SET balance = 100 WHERE id = 1;
COMMIT;
-- Business logic outside transaction
BEGIN;
  UPDATE orders SET status = 'paid' WHERE user_id = 1;
COMMIT;
```

**3. Timeout**
```sql
-- PostgreSQL
SET lock_timeout = '5s';

-- MySQL
SET innodb_lock_wait_timeout = 5;
```

**4. Retry Logic**
```java
// Application-level retry
public void transferMoney(long fromId, long toId, BigDecimal amount) {
    int maxRetries = 3;
    for (int i = 0; i < maxRetries; i++) {
        try {
            transactionTemplate.execute(status -> {
                // Transfer logic
                return null;
            });
            return; // Success
        } catch (DeadlockLoserDataAccessException e) {
            if (i == maxRetries - 1) throw e;
            Thread.sleep(100 * (i + 1)); // Exponential backoff
        }
    }
}
```

### 4.4 Gap Locks

**InnoDB/PostgreSQL:** Lock ranges to prevent phantom reads

```sql
-- Suppose table has rows: id = 1, 5, 10
CREATE INDEX idx_id ON users(id);

-- Transaction 1 (REPEATABLE READ)
BEGIN;
  SELECT * FROM users WHERE id BETWEEN 3 AND 7 FOR UPDATE;
  -- Locks:
  -- - Row id=5 (record lock)
  -- - Gap (1, 5) → prevents INSERT id=2,3,4
  -- - Gap (5, 10) → prevents INSERT id=6,7,8,9

-- Transaction 2
  INSERT INTO users VALUES (4, 'Alice');  
  -- BLOCKED by gap lock!
```

**Gap Lock Visualization:**
```
Existing rows: [1] ---- [5] ---- [10]
Gap locks:        (1,5)     (5,10)

WHERE id BETWEEN 3 AND 7 locks:
- Record lock: [5]
- Gap lock: (1,5) and (5,10)
```

**Disable Gap Locks (if needed):**
```sql
-- Set isolation to READ COMMITTED
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
-- No gap locks, but phantom reads possible
```

**Use Case:**
- Prevent duplicate insertions in ranges
- Maintain referential integrity
- Serializable isolation

---

## 5. Pagination

### 5.1 OFFSET Pagination (Traditional)

```sql
-- Page 1 (skip 0, take 20)
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 0;

-- Page 2 (skip 20, take 20)
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 20;

-- Page 100 (skip 1980, take 20)
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 1980;
```

**Problems:**

**1. Performance Degrades with Page Number**
```sql
-- Page 1: 1ms
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 0;

-- Page 1000: 500ms
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 19980;
-- Database must scan and skip 19,980 rows!
```

**2. Inconsistent Results (Shifting Data)**
```
User on page 5 → new post inserted → user clicks "next" → skips item
User on page 5 → post deleted → user clicks "next" → sees duplicate
```

**3. Expensive OFFSET**
```sql
EXPLAIN ANALYZE
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 100000;

-- Limit  (cost=12345.67..12367.89 rows=20)
--        (actual time=234.567..234.678 rows=20 loops=1)
--   ->  Index Scan Backward on idx_created
--       (cost=0.56..123456.78 rows=100020)
--       (actual time=0.123..234.456 rows=100020 loops=1)
-- Database scans 100,020 rows to return 20!
```

**When to Use:**
- Small datasets (< 10,000 rows)
- Admin panels with page numbers
- Users rarely go beyond page 10

### 5.2 Cursor-Based Pagination (Seek Method)

**Uses last seen ID/timestamp as cursor**

```sql
-- Initial request
SELECT id, title, created_at 
FROM posts 
ORDER BY created_at DESC, id DESC 
LIMIT 20;

-- Returns:
-- id=1000, created_at='2025-01-08 10:00:00'
-- id=999,  created_at='2025-01-08 09:59:00'
-- ...
-- id=981,  created_at='2025-01-08 09:40:00'  ← cursor

-- Next page (pass last cursor)
SELECT id, title, created_at 
FROM posts 
WHERE (created_at, id) < ('2025-01-08 09:40:00', 981)
ORDER BY created_at DESC, id DESC 
LIMIT 20;
```

**Why This Is Fast:**
```sql
-- Index on (created_at DESC, id DESC)
CREATE INDEX idx_cursor ON posts(created_at DESC, id DESC);

-- Query uses index seek (O(log n)) instead of scan (O(n))
EXPLAIN ANALYZE
SELECT * FROM posts 
WHERE (created_at, id) < ('2025-01-08 09:40:00', 981)
ORDER BY created_at DESC, id DESC 
LIMIT 20;

-- Index Scan on idx_cursor (cost=0.56..45.67 rows=20)
--   actual time=0.023..0.045 rows=20 loops=1
-- Constant time regardless of dataset size!
```

**Benefits:**
- ✅ Constant performance (O(log n))
- ✅ No duplicate/missing items
- ✅ Works with infinite scroll
- ✅ Scales to millions of rows

**Trade-offs:**
- ❌ Can't jump to arbitrary page
- ❌ No total page count
- ❌ More complex implementation

**Implementation (REST API):**
```json
// Request
GET /api/posts?limit=20&cursor=eyJpZCI6OTgxfQ

// Response
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6OTYxfQ",
    "has_more": true
  }
}
```

**Handling Ties (Same Timestamp):**
```sql
-- WRONG: Ambiguous ordering
SELECT * FROM posts 
WHERE created_at < '2025-01-08 10:00:00'
ORDER BY created_at DESC 
LIMIT 20;
-- Multiple posts with same created_at → inconsistent

-- CORRECT: Add unique secondary sort
SELECT * FROM posts 
WHERE (created_at, id) < ('2025-01-08 10:00:00', 1000)
ORDER BY created_at DESC, id DESC 
LIMIT 20;
```

**Comparison Table:**

| Aspect | OFFSET | Cursor-Based |
|--------|--------|--------------|
| **Performance** | O(n) | O(log n) |
| **Page 1** | Fast | Fast |
| **Page 1000** | Slow | Fast |
| **Consistency** | Inconsistent | Consistent |
| **Jump to page** | ✅ Yes | ❌ No |
| **Total count** | ✅ Easy | ❌ Hard |
| **Best for** | Admin panels | User-facing feeds |

---

## 6. Connection Pooling

### 6.1 HikariCP (Production Standard)

**Why Connection Pooling?**

```
Creating new connection: 100ms
Executing query: 1ms
Total: 101ms

With pool (reuse connection):
Get from pool: <1ms
Executing query: 1ms
Total: 2ms (50x faster!)
```

**HikariCP Configuration:**

```java
// Spring Boot (application.yml)
spring:
  datasource:
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 30000  # 30s
      idle-timeout: 600000       # 10min
      max-lifetime: 1800000      # 30min
      leak-detection-threshold: 60000  # 60s
```

**Java Configuration:**
```java
HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:postgresql://localhost:5432/mydb");
config.setUsername("user");
config.setPassword("pass");
config.setMaximumPoolSize(10);
config.setMinimumIdle(5);
config.setConnectionTimeout(30000);
config.setIdleTimeout(600000);
config.setMaxLifetime(1800000);
```

### 6.2 Pool Sizing Impact

**Formula: Pool Size = Tn × (Cm - 1) + 1**
- **Tn**: Number of threads
- **Cm**: Connections per thread

**Common Mistake: Too Large Pool**
```java
// BAD: 200 connections for 10 CPU cores
maximumPoolSize: 200

// Database has 10 CPU cores → context switching overhead
// Most connections idle → waste memory
```

**Optimal Sizing:**

**For OLTP (Web Apps):**

Pool Size = (Number of CPU cores × 2) + Effective Spindle Count
For 4-core server with SSD:
Pool Size = (4 × 2) + 1 = 9

**Real-World Example:**
Application Servers: 3
Threads per server: 100
Database: PostgreSQL (8 cores)
Pool size per app server: 10
Total connections: 3 × 10 = 30
Database can handle: 30 connections efficiently

**Testing Different Pool Sizes:**

| Pool Size | Throughput (req/s) | Avg Latency | P99 Latency |
|-----------|-------------------|-------------|-------------|
| 5 | 1000 | 50ms | 200ms |
| 10 | 2000 | 25ms | 100ms |
| 20 | 2100 | 30ms | 150ms |
| 50 | 1800 | 80ms | 500ms |

**Finding Sweet Spot:**
```bash
# Load test with different pool sizes
for pool_size in 5 10 15 20 30; do
  echo "Testing pool_size=$pool_size"
  # Update config
  # Run load test
  # Measure: throughput, latency, CPU, connections
done
```

**Monitoring Pool Health:**
```java
// HikariCP metrics
HikariPoolMXBean poolProxy = 
    ((HikariDataSource) dataSource).getHikariPoolMXBean();

int activeConnections = poolProxy.getActiveConnections();
int idleConnections = poolProxy.getIdleConnections();
int totalConnections = poolProxy.getTotalConnections();
int threadsAwaitingConnection = poolProxy.getThreadsAwaitingConnection();

// Alert if:
if (threadsAwaitingConnection > 0) {
    log.warn("Connection pool exhausted! {} threads waiting", 
             threadsAwaitingConnection);
}

if (activeConnections > totalConnections * 0.8) {
    log.warn("Pool usage at {}%", 
             activeConnections * 100 / totalConnections);
}
```

**Connection Leak Detection:**
```java
// Spring Boot
spring.datasource.hikari.leak-detection-threshold: 60000  # 60s

// Logs connection leaks:
// WARNING: Connection leak detection triggered for connection
// Stack trace shows where connection was acquired but not closed
```

**Common Pool Exhaustion Causes:**

**1. Long-Running Queries**
```java
// BAD: Holds connection for 30 seconds
public List<User> exportAllUsers() {
    return jdbcTemplate.query(
        "SELECT * FROM users",  // 10M rows
        new UserRowMapper()
    );
}

// GOOD: Stream results, release connection
public void exportAllUsers(OutputStream out) {
    jdbcTemplate.query(
        "SELECT * FROM users",
        rs -> {
            // Process row and write to stream
            // Connection released after each batch
        }
    );
}
```

**2. Transaction Spans HTTP Call**
```java
// BAD: Transaction holds connection during external API call
@Transactional
public void processPayment(Payment payment) {
    paymentRepository.save(payment);
    externalPaymentGateway.charge(payment);  // 5 seconds!
    emailService.sendReceipt(payment);       // 2 seconds!
}

// GOOD: Release connection before external calls
public void processPayment(Payment payment) {
    transactionTemplate.execute(status -> {
        paymentRepository.save(payment);
        return null;
    });
    
    // Connection released here
    externalPaymentGateway.charge(payment);
    emailService.sendReceipt(payment);
}
```

**3. Forgotten Connection Close**
```java
// BAD: Connection leak
public User getUser(long id) {
    Connection conn = dataSource.getConnection();
    // ... query logic
    return user;
    // LEAK: Connection never closed!
}

// GOOD: Always use try-with-resources
public User getUser(long id) {
    try (Connection conn = dataSource.getConnection();
         PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE id = ?")) {
        stmt.setLong(1, id);
        // ... query logic
        return user;
    } // Auto-closed
}
```

**Database-Side Limits:**
```sql
-- PostgreSQL: Check connection limit
SHOW max_connections;  -- Default: 100

-- See current connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes';
```

**Best Practices:**

✅ **DO:**
- Start with small pool (10-20)
- Load test to find optimal size
- Monitor active/idle ratio
- Set leak detection threshold
- Use connection timeout
- Set max connection lifetime (prevent stale connections)

❌ **DON'T:**
- Set pool size = thread count
- Make pool > database max connections
- Keep connections open during I/O
- Forget to close connections
- Ignore connection wait metrics

---

## 7. Query Optimization Checklist

### Quick Wins
```sql
-- 1. Add indexes for WHERE clauses
CREATE INDEX idx_user_status ON users(status);

-- 2. Add indexes for JOIN columns
CREATE INDEX idx_order_user ON orders(user_id);

-- 3. Add indexes for ORDER BY
CREATE INDEX idx_created_desc ON posts(created_at DESC);

-- 4. Use covering indexes
CREATE INDEX idx_covering ON users(id, email, status);

-- 5. Avoid SELECT *
SELECT id, email FROM users WHERE status = 'active';

-- 6. Use LIMIT
SELECT * FROM orders ORDER BY created_at DESC LIMIT 100;

-- 7. Analyze query plans
EXPLAIN ANALYZE SELECT ...;

-- 8. Update statistics
ANALYZE users;

-- 9. Use batch operations
INSERT INTO users VALUES (1, 'a'), (2, 'b'), (3, 'c');
-- Instead of 3 separate INSERTs

-- 10. Use appropriate data types
-- INT instead of VARCHAR for IDs
-- TIMESTAMP instead of VARCHAR for dates
```

### Red Flags

❌ **Seq Scan on large tables**
Seq Scan on orders (cost=0.00..123456.78 rows=1000000)
→ Add index

❌ **Missing indexes on JOIN columns**
Hash Join (cost=5000.00..50000.00 rows=100000)
Hash Cond: (o.user_id = u.id)
→ CREATE INDEX idx_user ON orders(user_id)

❌ **High buffer reads**
Buffers: shared hit=10 read=50000
→ Query needs data not in cache → disk I/O bottleneck

❌ **Estimate vs Actual mismatch**
rows=10 (estimated) vs actual rows=100000
→ Run ANALYZE to update statistics

---

## 8. Production Monitoring

### Key Metrics

**Database:**
```sql
-- PostgreSQL
SELECT 
  datname,
  numbackends as connections,
  xact_commit as commits,
  xact_rollback as rollbacks,
  blks_read as disk_reads,
  blks_hit as cache_hits,
  (blks_hit::float / (blks_hit + blks_read)) * 100 as cache_hit_ratio
FROM pg_stat_database
WHERE datname = 'mydb';

-- Cache hit ratio should be > 99%
```

**Slow Queries:**
```sql
-- PostgreSQL: Enable log
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries > 1s
SELECT pg_reload_conf();

-- Analyze logs
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

**Connection Pool (HikariCP):**
```java
// Expose via JMX or metrics endpoint
metrics.register("hikari.active", () -> pool.getActiveConnections());
metrics.register("hikari.idle", () -> pool.getIdleConnections());
metrics.register("hikari.waiting", () -> pool.getThreadsAwaitingConnection());
metrics.register("hikari.total", () -> pool.getTotalConnections());
```

**Alerts:**
- Connection pool > 80% utilized
- Slow query > 1 second
- Cache hit ratio < 95%
- Deadlocks detected
- Replication lag > 10 seconds

---

## 9. Common Pitfalls

### N+1 Query Problem
```java
// BAD: N+1 queries
List<User> users = userRepository.findAll();  // 1 query
for (User user : users) {
    List<Order> orders = orderRepository.findByUserId(user.getId());  // N queries
    user.setOrders(orders);
}
// Total: 1 + N queries

// GOOD: Single query with JOIN
@Query("SELECT u FROM User u LEFT JOIN FETCH u.orders")
List<User> findAllWithOrders();
// Total: 1 query
```

### Implicit Type Conversion
```sql
-- BAD: Index not used
CREATE INDEX idx_user_id ON orders(user_id);  -- user_id is BIGINT

SELECT * FROM orders WHERE user_id = '123';  -- String → implicit conversion
-- Index not used! Full table scan

-- GOOD: Correct type
SELECT * FROM orders WHERE user_id = 123;  -- Integer
-- Index used
```

### Unbounded Queries
```java
// BAD: No LIMIT
public List<Event> getEvents() {
    return jdbcTemplate.query(
        "SELECT * FROM events ORDER BY created_at DESC",
        new EventRowMapper()
    );
}
// Returns 10M rows → OOM

// GOOD: Always LIMIT
public List<Event> getRecentEvents() {
    return jdbcTemplate.query(
        "SELECT * FROM events ORDER BY created_at DESC LIMIT 100",
        new EventRowMapper()
    );
}
```

---

## 10. Quick Reference

### SQL Performance
```sql
-- Add index
CREATE INDEX idx_name ON table(column);

-- Analyze query
EXPLAIN ANALYZE SELECT ...;

-- Update stats
ANALYZE table;

-- Check indexes
\d table  -- PostgreSQL
SHOW INDEX FROM table;  -- MySQL

-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;
```

### Transaction Isolation
```sql
-- PostgreSQL
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

### Locking
```sql
-- Exclusive lock (write)
SELECT * FROM users WHERE id = 1 FOR UPDATE;

-- Shared lock (read)
SELECT * FROM users WHERE id = 1 FOR SHARE;

-- No wait
SELECT * FROM users WHERE id = 1 FOR UPDATE NOWAIT;

-- Skip locked rows
SELECT * FROM jobs WHERE status = 'pending' FOR UPDATE SKIP LOCKED LIMIT 1;
```

### Connection Pool (HikariCP)
```yaml
spring.datasource.hikari:
  maximum-pool-size: 10
  minimum-idle: 5
  connection-timeout: 30000
  idle-timeout: 600000
  max-lifetime: 1800000
  leak-detection-threshold: 60000
```

---

:::tip Key Takeaways
1. **Indexes speed up reads, slow down writes** - index strategically
2. **EXPLAIN ANALYZE is your best friend** - always check query plans
3. **Use cursor-based pagination** for large datasets
4. **Small connection pools** outperform large ones
5. **Monitor slow queries** and connection pool health in production
:::

:::warning Production Checklist
- [ ] Indexes on all WHERE/JOIN/ORDER BY columns
- [ ] EXPLAIN ANALYZE all critical queries
- [ ] Connection pool sized appropriately
- [ ] Slow query logging enabled
- [ ] Monitoring active connections
- [ ] Transaction isolation level understood
- [ ] Deadlock retry logic implemented
- [ ] No unbounded queries (always LIMIT)
:::
