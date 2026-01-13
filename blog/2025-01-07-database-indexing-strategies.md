---
slug: database-indexing-strategies
title: Database Indexing Strategies - When and How to Index
authors: [harendra]
tags: [database, postgresql, mysql, performance, indexing]
description: Learn when to create database indexes, composite index column ordering, and how to avoid common indexing pitfalls for optimal query performance.
keywords: [database indexing, composite index, postgresql performance, mysql optimization, query tuning]
---

# Database Indexing Strategies - When and How to Index

Indexes are one of the most powerful tools for optimizing database performance, yet they're often misunderstood and misused. In this guide, we'll explore when to create indexes, how to structure composite indexes, and common mistakes to avoid.

<!--truncate-->

## The Index Trade-off

Every index comes with a cost:

**Benefits:**
- ✅ Faster query performance (especially for large tables)
- ✅ Efficient filtering and sorting
- ✅ Index-only scans (covering indexes)

**Costs:**
- ❌ Slower write operations (INSERT, UPDATE, DELETE)
- ❌ Additional storage space
- ❌ Overhead for index maintenance

### Write Performance Impact

| Number of Indexes | INSERT Performance | Impact |
|-------------------|-------------------|--------|
| 0 | 100,000/sec | Baseline |
| 1 | 80,000/sec | -20% |
| 3 | 50,000/sec | -50% |
| 5 | 30,000/sec | -70% |

## Composite Index Column Ordering

**Order matters!** An index on `(A, B, C)` is different from `(C, B, A)`.

### The Left-Prefix Rule

```sql
CREATE INDEX idx_user_status_created 
ON orders(user_id, status, created_at);
```

This index can optimize queries that filter on:

✅ `user_id`  
✅ `user_id` + `status`  
✅ `user_id` + `status` + `created_at`

❌ `status` only  
❌ `created_at` only  
❌ `status` + `created_at`

### Column Ordering Strategy

```
1. Equality filters (=)         → Leftmost
2. Range filters (>, &lt;, BETWEEN) → Middle  
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

-- Optimal index
CREATE INDEX idx_optimal 
ON orders(user_id, status, created_at DESC);
```

## Index-Only Scans (Covering Indexes)

When all columns in a query exist in the index, the database can avoid reading the table entirely.

```sql
CREATE INDEX idx_user_email ON users(user_id, email);

-- Index-only scan (fast)
SELECT user_id, email FROM users WHERE user_id = 123;

-- Requires table access (slower)
SELECT user_id, email, full_name FROM users WHERE user_id = 123;
```

### PostgreSQL INCLUDE Clause

```sql
-- PostgreSQL 11+ covering index
CREATE INDEX idx_covering 
ON orders(status, user_id) 
INCLUDE (created_at, total_amount);
```

## When NOT to Index

### 1. Small Tables
Tables with &lt; 1000 rows rarely benefit from indexes. Full table scans are faster.

### 2. High-Cardinality Columns
Don't index columns with very few unique values:

```sql
-- ❌ BAD: Low selectivity
CREATE INDEX idx_status ON orders(status);
-- If 95% of orders are 'completed', index is ineffective

-- ✅ GOOD: High selectivity
CREATE INDEX idx_email ON users(email);
-- Email is unique or near-unique
```

### 3. Frequently Updated Columns
Avoid indexing columns that change often in high-write tables.

## SELECT * Anti-Pattern

**Never use SELECT * in production code!**

```sql
-- ❌ BAD: Fetches all columns (prevents index-only scan)
SELECT * FROM users WHERE id = 123;

-- ✅ GOOD: Explicit columns
SELECT id, email, username FROM users WHERE id = 123;
```

**Why?**
- Prevents index-only scans
- Wastes network bandwidth
- Increases memory usage
- Breaks when schema changes

## Analyzing Query Performance

### Using EXPLAIN

```sql
-- PostgreSQL
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM orders 
WHERE user_id = 123 
  AND created_at > '2025-01-01';

-- Look for:
-- 1. "Seq Scan" on large tables → Need index
-- 2. "Index Scan" → Good
-- 3. "Index Only Scan" → Excellent
```

### Key Metrics

```
Index Scan using idx_user_created on orders  
  (cost=0.56..123.45 rows=10 width=520) 
  (actual time=0.034..0.156 rows=10 loops=1)
  Buffers: shared hit=15 read=2
```

**Red flags:**
- ❌ `Seq Scan` on tables with millions of rows
- ❌ `Buffers: read >> hit` (disk I/O bottleneck)
- ❌ High cost values for simple queries

## Production Best Practices

### 1. Monitor Slow Queries

```sql
-- PostgreSQL: Enable slow query log
ALTER DATABASE mydb SET log_min_duration_statement = 1000; -- 1 second
```

### 2. Update Statistics Regularly

```sql
-- PostgreSQL
ANALYZE orders;

-- MySQL
ANALYZE TABLE orders;
```

### 3. Index Naming Convention

```sql
-- Format: idx_<table>_<columns>
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_users_email ON users(email);
```

### 4. Monitor Index Usage

```sql
-- PostgreSQL: Find unused indexes
SELECT 
    schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Common Mistakes

### 1. Over-Indexing
```sql
-- ❌ BAD: Too many indexes on high-write table
CREATE TABLE events (id, user_id, type, timestamp, ...);
CREATE INDEX idx1 ON events(user_id);
CREATE INDEX idx2 ON events(type);
CREATE INDEX idx3 ON events(timestamp);
CREATE INDEX idx4 ON events(user_id, type);
-- ... 10 more indexes

-- ✅ GOOD: One composite index covers most queries
CREATE INDEX idx_events ON events(user_id, type, timestamp);
```

### 2. Forgetting DESC for Descending Sorts

```sql
-- Query
SELECT * FROM posts ORDER BY created_at DESC LIMIT 10;

-- ❌ Suboptimal
CREATE INDEX idx_created ON posts(created_at);

-- ✅ Optimal
CREATE INDEX idx_created ON posts(created_at DESC);
```

## Conclusion

Effective indexing requires understanding:
- Query patterns in your application
- Read vs write workload
- Composite index column ordering
- Index maintenance costs

**Remember:** Indexes are not free. Add them strategically based on actual query patterns, not speculation.

Want to dive deeper? Check out my comprehensive [DBMS guide](/docs/category/2-dbms--data-persistence) in the CS Fundamentals Wiki.

---

**Questions about indexing?** Let's discuss in the comments!
