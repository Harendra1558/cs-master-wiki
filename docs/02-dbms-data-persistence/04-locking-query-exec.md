---
title: "3. Locking & Query Execution"
sidebar_position: 4
description: Row vs Table Locks, Gap Locks, Optimistic/Pessimistic Locking, and Query Plans (EXPLAIN).
---

# Locking & Query Execution

:::info Interview Importance ⭐⭐⭐⭐⭐
Understanding locks helps you debug deadlocks and performance issues. Query execution (EXPLAIN) is essential for optimizing slow queries in production.
:::

---

## 1. Database Locking Fundamentals

### Why Do We Need Locks?

When multiple transactions access the same data simultaneously, we need locks to prevent conflicts:

```
Without Locks (Race Condition):
Time →

Transaction A: [Read balance=100]────────[Write 100-50=50]
Transaction B:        [Read balance=100]────────[Write 100-30=70]

Result: Balance = 70 (A's update is lost!)
Expected: Balance = 20 (100 - 50 - 30)
```

---

## 2. Types of Locks

### 2.1 Shared Lock (S) vs Exclusive Lock (X)

| Lock Type | Also Called | Purpose | Compatibility |
|-----------|-------------|---------|---------------|
| **Shared (S)** | Read Lock | Multiple readers | Compatible with other S locks |
| **Exclusive (X)** | Write Lock | One writer | Blocks all other locks |

**Lock Compatibility Matrix:**

|  | Shared (S) | Exclusive (X) |
|--|------------|---------------|
| **Shared (S)** | ✅ Compatible | ❌ Conflicts |
| **Exclusive (X)** | ❌ Conflicts | ❌ Conflicts |

```sql
-- Shared lock: Multiple readers OK
SELECT * FROM accounts WHERE id = 1;  -- S lock

-- Exclusive lock: Only one writer
UPDATE accounts SET balance = 500 WHERE id = 1;  -- X lock
```

### 2.2 Row Lock vs Table Lock

#### Table Lock

Locks the **entire table**. Simple but low concurrency.

```sql
-- MySQL: Explicit table lock
LOCK TABLES users WRITE;
-- No one else can read or write to users table
UPDATE users SET status = 'active';
UNLOCK TABLES;
```

**Use cases:**
- Bulk data loads
- Table maintenance
- Legacy databases (MyISAM)

#### Row Lock

Locks only **specific rows**. High concurrency.

```sql
-- InnoDB/PostgreSQL: Row-level locking
UPDATE accounts SET balance = 500 WHERE id = 1;
-- Only row id=1 is locked
-- Other rows can be updated concurrently
```

**Comparison:**

| Aspect | Table Lock | Row Lock |
|--------|------------|----------|
| **Concurrency** | Low | High |
| **Lock Overhead** | Low | Higher (track each row) |
| **Deadlock Risk** | Lower | Higher |
| **Best For** | Bulk operations | OLTP workloads |

### 2.3 Intent Locks

Intent locks are placed at **higher levels** (table) to signal intent to lock at lower levels (row).

```
Hierarchy:
Table → Page → Row

Intent Locks:
├── IS (Intent Shared)    → "I want to read some rows"
├── IX (Intent Exclusive) → "I want to update some rows"
└── SIX (Shared + IX)     → "I'm reading all, updating some"
```

**Why Intent Locks?**
Without them, to get a table lock, the DB would have to scan ALL row locks. Intent locks provide a quick check at the table level.

---

## 3. Pessimistic vs Optimistic Locking

### 3.1 Pessimistic Locking

**Philosophy:** "Conflicts will happen, so lock first."

```sql
-- SELECT ... FOR UPDATE acquires exclusive lock
BEGIN;
SELECT * FROM products WHERE id = 1 FOR UPDATE;  -- Lock acquired!
-- Other transactions trying to update this row will WAIT

-- Do some processing...
UPDATE products SET stock = stock - 1 WHERE id = 1;
COMMIT;  -- Lock released
```

**Variations:**

```sql
-- FOR UPDATE: Exclusive lock (block other writers AND readers with FOR UPDATE)
SELECT * FROM products WHERE id = 1 FOR UPDATE;

-- FOR SHARE / FOR UPDATE NOWAIT / FOR UPDATE SKIP LOCKED
SELECT * FROM products WHERE id = 1 FOR SHARE;  -- Allow other readers

-- NOWAIT: Fail immediately if locked
SELECT * FROM products WHERE id = 1 FOR UPDATE NOWAIT;
-- ERROR: could not obtain lock

-- SKIP LOCKED: Skip locked rows (great for job queues!)
SELECT * FROM jobs WHERE status = 'pending' 
FOR UPDATE SKIP LOCKED 
LIMIT 1;
```

**Use cases:**
- High contention (ticket booking, inventory)
- Critical financial operations
- When conflicts are common

### 3.2 Optimistic Locking

**Philosophy:** "Conflicts are rare, so check at write time."

No actual database lock is held! Instead, use a **version column**:

```sql
-- Table schema
CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    stock INT,
    version INT DEFAULT 1  -- Version column
);
```

**Implementation:**

```sql
-- Step 1: Read record (including version)
SELECT id, name, stock, version FROM products WHERE id = 1;
-- Returns: id=1, name='iPhone', stock=100, version=5

-- Step 2: Application processes...

-- Step 3: Update with version check
UPDATE products 
SET stock = 99, version = version + 1
WHERE id = 1 AND version = 5;  -- Version check!

-- If affected_rows = 0, someone else updated first!
-- Throw OptimisticLockException and retry
```

**JPA/Hibernate Implementation:**

```java
@Entity
public class Product {
    @Id
    private Long id;
    private String name;
    private Integer stock;
    
    @Version  // Hibernate handles version automatically
    private Integer version;
}

// Usage
@Transactional
public void updateStock(Long productId) {
    Product product = productRepository.findById(productId);
    product.setStock(product.getStock() - 1);
    productRepository.save(product);
    // If version mismatch: OptimisticLockException thrown
}
```

### Comparison: Pessimistic vs Optimistic

| Aspect | Pessimistic | Optimistic |
|--------|-------------|------------|
| **Lock Type** | Actual DB lock | No lock (version check) |
| **Best When** | High contention | Low contention |
| **Throughput** | Lower | Higher |
| **Deadlock Risk** | Higher | None |
| **Complexity** | Simpler | Retry logic needed |
| **Example Use** | Ticket booking | User profile updates |

---

## 4. Deadlocks

### What is a Deadlock?

Two or more transactions waiting for each other, creating a cycle.

```
Deadlock Scenario:

Transaction A:                Transaction B:
├── Lock Row 1 ✓              ├── Lock Row 2 ✓
├── Try to lock Row 2...      ├── Try to lock Row 1...
│   (waiting for B)           │   (waiting for A)
└── STUCK!                    └── STUCK!

Both wait forever!
```

### How Databases Handle Deadlocks

Most databases have **deadlock detection**:

1. **Detection:** Monitor wait-for graph for cycles
2. **Victim Selection:** Choose one transaction to abort
3. **Rollback:** Rollback victim, release its locks
4. **Retry:** Application should retry the failed transaction

```
PostgreSQL error:
ERROR: deadlock detected
DETAIL: Process 1234 waits for ShareLock on transaction 5678;
        blocked by process 5678.
        Process 5678 waits for ShareLock on transaction 1234;
        blocked by process 1234.
HINT: See server log for query details.
```

### Deadlock Prevention Strategies

**Strategy 1: Lock in Consistent Order**

```java
// ❌ Bad: Inconsistent order causes deadlock
void transferA(Account from, Account to) {
    lock(from);  // Lock A first
    lock(to);    // Then lock B
}

void transferB(Account from, Account to) {
    lock(from);  // Lock B first (if called with swapped args)
    lock(to);    // Deadlock!
}

// ✅ Good: Always lock in same order (by ID)
void transfer(Account acc1, Account acc2) {
    Account first = acc1.id < acc2.id ? acc1 : acc2;
    Account second = acc1.id < acc2.id ? acc2 : acc1;
    lock(first);
    lock(second);
}
```

**Strategy 2: Use Lock Timeout**

```sql
-- PostgreSQL
SET lock_timeout = '5s';

-- MySQL
SET innodb_lock_wait_timeout = 5;
```

**Strategy 3: Keep Transactions Short**

Shorter transactions = less time holding locks = lower deadlock chance.

**Strategy 4: Use Optimistic Locking**

No locks = no deadlocks!

---

## 5. Gap Locks and Next-Key Locks (InnoDB)

### The Phantom Problem

```sql
-- Transaction A
BEGIN;
SELECT * FROM users WHERE age BETWEEN 20 AND 30 FOR UPDATE;
-- Returns: Alice(22), Bob(25)

-- Transaction B
INSERT INTO users VALUES (3, 'Charlie', 23);  -- Phantom!

-- Transaction A (re-query)
SELECT * FROM users WHERE age BETWEEN 20 AND 30 FOR UPDATE;
-- Returns: Alice(22), Charlie(23), Bob(25)  -- Different result!
```

### Gap Lock

Locks the **gap between index values**, preventing inserts.

```
Index values:     10      20      30      40
                   │       │       │       │
Gap Lock:          │  GAP  │  GAP  │  GAP  │
                   │───────│───────│───────│
                   Locked! Locked! Locked!
```

### Next-Key Lock

Combination of **row lock + gap lock before it**.

```sql
SELECT * FROM users WHERE age = 25 FOR UPDATE;

-- Locks:
-- 1. Row with age=25 (row lock)
-- 2. Gap before 25 (gap lock) - prevents inserts in this gap
```

### How Gap Locks Prevent Phantoms

```sql
-- Transaction A
SELECT * FROM users WHERE age BETWEEN 20 AND 30 FOR UPDATE;
-- Locks: [20, 25, 30] rows + gaps between them

-- Transaction B
INSERT INTO users VALUES (3, 'Charlie', 23);  
-- BLOCKED! Gap is locked!

-- Transaction A (re-query)
SELECT * FROM users WHERE age BETWEEN 20 AND 30 FOR UPDATE;
-- Same result - no phantoms!
```

---

## 6. Query Execution & The Optimizer

### How a Query Runs

```
┌─────────────────────────────────────────────────────────────────┐
│                        Query Execution                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SQL Query                                                       │
│      ↓                                                          │
│  Parser (Syntax check)                                          │
│      ↓                                                          │
│  Optimizer (Find best plan)  ← Uses table statistics           │
│      ↓                                                          │
│  Executor (Run the plan)                                        │
│      ↓                                                          │
│  Results                                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Cost-Based Optimizer

The optimizer estimates **cost** (CPU + I/O) of different plans and picks the cheapest.

```sql
-- Query
SELECT * FROM users WHERE email = 'john@example.com';

-- Possible plans:
-- Plan A: Full Table Scan       → Cost: 1000 (read all rows)
-- Plan B: Use email index       → Cost: 10 (B-tree lookup)

-- Optimizer picks: Plan B (lowest cost)
```

---

## 7. Reading EXPLAIN Output

### Basic EXPLAIN

```sql
EXPLAIN SELECT * FROM users WHERE email = 'john@example.com';
```

**PostgreSQL Output:**

```
                              QUERY PLAN
----------------------------------------------------------------------
 Index Scan using idx_users_email on users  (cost=0.29..8.31 rows=1 width=100)
   Index Cond: (email = 'john@example.com'::text)
```

**MySQL Output:**

```
+----+-------------+-------+------+---------------+------+---------+------+------+-------------+
| id | select_type | table | type | possible_keys | key  | key_len | ref  | rows | Extra       |
+----+-------------+-------+------+---------------+------+---------+------+------+-------------+
|  1 | SIMPLE      | users | ref  | idx_email     | idx  | 102     | const|    1 | Using index |
+----+-------------+-------+------+---------------+------+---------+------+------+-------------+
```

### Key Terms to Watch

| Term (PostgreSQL) | Term (MySQL) | Meaning | Good/Bad |
|-------------------|--------------|---------|----------|
| Seq Scan | ALL | Full table scan | ❌ Bad (usually) |
| Index Scan | ref, range | Uses index | ✅ Good |
| Index Only Scan | Using index | Data from index only | ✅ Excellent |
| Bitmap Scan | index_merge | Multiple indexes combined | ⚠️ OK |
| Sort | Using filesort | Sorting without index | ⚠️ Warning |
| Hash Join | - | Join using hash table | ✅ Good for large tables |
| Nested Loop | - | Join using nested iteration | ⚠️ Depends on size |

### EXPLAIN ANALYZE (Actual Execution)

Shows **actual time** and rows, not just estimates.

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE age > 25;
```

**Output:**

```
 Seq Scan on users  (cost=0.00..1.05 rows=3 width=100) 
                    (actual time=0.012..0.015 rows=5 loops=1)
   Filter: (age > 25)
   Rows Removed by Filter: 2
 Planning Time: 0.080 ms
 Execution Time: 0.035 ms
```

**Key fields:**
- `actual time=0.012..0.015` - Start time..End time (ms)
- `rows=5` - Actual rows returned
- `loops=1` - Number of times this step ran

### Common Query Problems

#### Problem 1: Sequential Scan on Large Table

```sql
EXPLAIN SELECT * FROM orders WHERE status = 'pending';

-- Output: Seq Scan on orders (cost=0.00..15000.00 rows=1000 ...)
-- Fix: CREATE INDEX idx_orders_status ON orders(status);
```

#### Problem 2: Index Not Used

```sql
-- Function on column prevents index use
EXPLAIN SELECT * FROM users WHERE UPPER(email) = 'JOHN@EXAMPLE.COM';
-- Seq Scan! Index on email not used because of UPPER()

-- Fix: Functional index
CREATE INDEX idx_users_email_upper ON users(UPPER(email));
```

#### Problem 3: Inefficient Join

```sql
EXPLAIN ANALYZE 
SELECT * FROM orders o 
JOIN products p ON o.product_id = p.id 
WHERE o.order_date > '2024-01-01';

-- Look for:
-- Nested Loop with high row counts → May need index
-- Hash Join with huge hash table → May need more memory
```

### Statistics and ANALYZE

The optimizer needs **up-to-date statistics** to make good decisions.

```sql
-- PostgreSQL: Update statistics
ANALYZE users;

-- MySQL: Update statistics
ANALYZE TABLE users;

-- Check statistics (PostgreSQL)
SELECT relname, reltuples, relpages 
FROM pg_class 
WHERE relname = 'users';
```

**Common Issue: Stale Statistics**

```
Symptom: Query was fast yesterday, slow today
Cause: Table grew from 1000 to 1,000,000 rows
       But statistics still say 1000 rows
       Optimizer makes wrong decisions
       
Fix: ANALYZE table;
```

---

## 8. Query Optimization Tips

### 8.1 Avoid SELECT *

```sql
-- ❌ Bad
SELECT * FROM users WHERE id = 1;

-- ✅ Good
SELECT id, name, email FROM users WHERE id = 1;
```

### 8.2 Use Indexes Properly

```sql
-- ❌ Bad: Function on column
WHERE YEAR(created_at) = 2024

-- ✅ Good: Range on column
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'
```

### 8.3 Avoid N+1 Queries

```java
// ❌ Bad: N+1 queries
List<Order> orders = orderRepo.findAll();  // 1 query
for (Order o : orders) {
    User u = userRepo.findById(o.getUserId());  // N queries!
}

// ✅ Good: JOIN or batch fetch
List<Order> orders = orderRepo.findAllWithUsers();  // 1 query with JOIN
```

### 8.4 Pagination: Use Keyset Instead of OFFSET

```sql
-- ❌ Bad: OFFSET scans rows
SELECT * FROM logs ORDER BY id LIMIT 10 OFFSET 1000000;
-- Must scan 1,000,000 rows to skip them!

-- ✅ Good: Keyset pagination
SELECT * FROM logs WHERE id > 1000000 ORDER BY id LIMIT 10;
-- Jumps directly to id > 1000000 using index
```

---

## 9. Top Interview Questions

### Q1: What is the difference between shared and exclusive locks?

**Answer:**
- **Shared Lock (S):** For reading. Multiple transactions can hold shared locks on the same row simultaneously.
- **Exclusive Lock (X):** For writing. Only one transaction can hold it. Blocks all other locks.

### Q2: How do you prevent deadlocks?

**Answer:**
1. **Lock in consistent order** (always lock A before B)
2. **Keep transactions short** (reduce lock holding time)
3. **Use lock timeouts** (fail fast instead of waiting forever)
4. **Use optimistic locking** (no actual locks)
5. **Access resources in the same order** across all transactions

### Q3: What is the difference between pessimistic and optimistic locking?

**Answer:**
- **Pessimistic:** Acquire actual DB locks upfront (`SELECT FOR UPDATE`). Use when conflicts are common.
- **Optimistic:** No locks. Use version column and check at update time. Use when conflicts are rare.

### Q4: How do you read an EXPLAIN plan?

**Answer:**
1. Look for scan type: `Seq Scan` = bad (usually), `Index Scan` = good
2. Check `rows` estimate vs actual (run EXPLAIN ANALYZE)
3. Look for `Sort` or `filesort` without index
4. Check if expected indexes are being used
5. Compare estimated cost between plans

### Q5: What is a gap lock?

**Answer:** A lock on the "gap" between index values. Used in InnoDB to prevent phantom reads. When you run `SELECT ... WHERE x BETWEEN 10 AND 20 FOR UPDATE`, it locks not just existing rows but also the gaps between them, preventing other transactions from inserting values like 15.

---

## Quick Reference Card

```
┌──────────────────────────────────────────────────────────────────┐
│                 LOCKING CHEAT SHEET                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ LOCK TYPES:                                                      │
│ ├── Shared (S)     → Read lock, multiple OK                     │
│ ├── Exclusive (X)  → Write lock, only one                       │
│ ├── Row Lock       → Lock specific rows (InnoDB, Postgres)      │
│ └── Table Lock     → Lock entire table (MyISAM, maintenance)    │
│                                                                  │
│ PESSIMISTIC vs OPTIMISTIC:                                       │
│ ├── Pessimistic: SELECT ... FOR UPDATE (high contention)        │
│ └── Optimistic:  Version column (low contention)                │
│                                                                  │
│ DEADLOCK PREVENTION:                                             │
│ ├── Lock in consistent order                                    │
│ ├── Keep transactions short                                     │
│ └── Use lock timeout                                            │
│                                                                  │
│ EXPLAIN KEYWORDS:                                                │
│ ├── Seq Scan / ALL        → Full scan (usually bad)             │
│ ├── Index Scan / ref      → Using index (good)                  │
│ ├── Index Only Scan       → Everything from index (excellent)   │
│ └── Sort / filesort       → Sorting without index (warning)     │
│                                                                  │
│ QUERY OPTIMIZATION:                                              │
│ ├── Avoid SELECT *                                              │
│ ├── No functions on indexed columns                             │
│ ├── Use keyset pagination (not OFFSET)                          │
│ └── Run ANALYZE to update statistics                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```
