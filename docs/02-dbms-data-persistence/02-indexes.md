---
title: 1. Deep Dive into Database Indexes
sidebar_position: 2
description: B-Trees, B+ Trees, Composite Indexes, Covering Indexes, and the Write Penalty
---

# Deep Dive into Database Indexes

:::info Interview Importance ⭐⭐⭐⭐⭐
Indexes are the **#1 topic** in database interviews. Understanding how they work internally helps you optimize queries and avoid common pitfalls.
:::

## What is an Index?

**Simple Answer:** An index is like the **index at the back of a book**. Instead of reading every page to find "JVM", you look up "JVM" in the index, get page number 42, and jump directly there.

**Interview Answer:** An index is a data structure (usually B-Tree or B+ Tree) that stores a sorted subset of table columns along with pointers to the actual rows, enabling O(log N) lookups instead of O(N) full table scans.

---

## 1. How B-Trees and B+ Trees Work

### 1.1 B-Tree Basics

**B-Tree** is a self-balancing tree data structure that keeps data sorted and allows searches, insertions, and deletions in **O(log N)** time.

```
                        B-Tree Structure
                    ┌─────────────────────┐
                    │    [30, 60, 90]     │  ← Root Node
                    └─────────────────────┘
                   /         |           \
        ┌─────────┐    ┌─────────┐    ┌──────────┐
        │[10, 20] │    │[40, 50] │    │[70, 80]  │  ← Intermediate
        └─────────┘    └─────────┘    └──────────┘
        /    |   \      /    \          /    \
     [5]  [15]  [25]  [35]  [45,55]  [65]  [75,85,95]  ← Leaf Nodes
                                                       (Data/Pointers)
```

**Key Properties:**
- All leaves are at the **same level** (balanced)
- Nodes can have multiple keys (not just 2 like binary tree)
- Disk-friendly: designed to minimize disk I/O

### 1.2 B+ Tree (Used by Most Databases)

**B+ Tree** is a variation where:
- **All data** is stored only in **leaf nodes**
- Leaf nodes are **linked together** (like a linked list)
- Internal nodes only store keys for navigation

```
                    B+ Tree Structure
              ┌─────────────────────────────┐
              │      [30]    [60]    [90]   │  ← Internal (keys only)
              └─────────────────────────────┘
                /          |           \
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ 10 20 30 │───→│ 40 50 60 │───→│ 70 80 90 │  ← Leaf Nodes (linked)
    │ ↓  ↓  ↓  │    │ ↓  ↓  ↓  │    │ ↓  ↓  ↓  │     contain actual data
    │Row Row Row│    │Row Row Row│    │Row Row Row│     or row pointers
    └──────────┘    └──────────┘    └──────────┘
```

**Why B+ Tree is Better for Databases:**

| Feature | B-Tree | B+ Tree |
|---------|--------|---------|
| Data Location | All nodes | Only leaf nodes |
| Leaf Linking | No | Yes (sequential access) |
| Range Queries | Slower | Faster (follow links) |
| Space in Internal Nodes | Less keys (data takes space) | More keys (no data) |

### Interview Question: Why Do Databases Use B+ Trees?

**Answer:**
1. **Disk I/O optimization:** Wider nodes mean fewer disk reads
2. **Range queries:** Linked leaves enable fast `BETWEEN`, `ORDER BY`
3. **Consistent performance:** Always O(log N) regardless of data distribution
4. **Sequential access:** Leaf links allow efficient full scans

---

## 2. The Index Write Penalty

:::danger Critical Trade-off
Indexes speed up reads but **slow down writes**. Every INSERT/UPDATE/DELETE must modify ALL indexes on the table.
:::

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    INSERT INTO Users (...)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌────────────────────────────────────────────────────────────┐
    │                    1. Write to Table                        │
    │                    (Heap/Clustered)                         │
    └────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
    ┌─────────┐         ┌─────────┐         ┌─────────┐
    │ Index 1 │         │ Index 2 │         │ Index 3 │
    │(email)  │         │(created)│         │(status) │
    └─────────┘         └─────────┘         └─────────┘
    
    Total I/O = 1 (table) + 3 (indexes) = 4 write operations!
```

### The Math

| Table Indexes | INSERT Cost (I/O Operations) |
|---------------|------------------------------|
| 0 indexes | 1 (table only) |
| 3 indexes | 4 (1 table + 3 indexes) |
| 5 indexes | 6 (1 table + 5 indexes) |
| 10 indexes | 11 (1 table + 10 indexes) |

### Guidelines

| Table Type | Recommendation |
|------------|----------------|
| **Read-Heavy** (Product catalog) | More indexes OK |
| **Write-Heavy** (Logs, Events, Audit) | Minimal indexes (1-2 max) |
| **Mixed** (User profiles) | Balance - only essential indexes |

```sql
-- ❌ Over-indexed table (bad for writes)
CREATE INDEX idx1 ON orders(customer_id);
CREATE INDEX idx2 ON orders(product_id);
CREATE INDEX idx3 ON orders(order_date);
CREATE INDEX idx4 ON orders(status);
CREATE INDEX idx5 ON orders(total_amount);
CREATE INDEX idx6 ON orders(shipping_address);
-- 6 indexes = 7x write cost!

-- ✅ Better: Composite index covering common queries
CREATE INDEX idx_orders_main ON orders(customer_id, order_date, status);
-- 1 index handles multiple query patterns
```

---

## 3. Composite Indexes & Leftmost Prefix Rule

### What is a Composite Index?

A composite index is an index on **multiple columns**:

```sql
CREATE INDEX idx_location ON Users(country, state, city);
```

### How It's Stored

The index is sorted by columns **in order**: first by `country`, then by `state` (within each country), then by `city` (within each state).

```
Composite Index Storage (sorted):
┌─────────────────────────────────────────────┐
│ country    │ state      │ city              │
├─────────────────────────────────────────────┤
│ India      │ Karnataka  │ Bangalore         │
│ India      │ Karnataka  │ Mysore            │
│ India      │ Maharashtra│ Mumbai            │
│ India      │ Maharashtra│ Pune              │
│ USA        │ California │ Los Angeles       │
│ USA        │ California │ San Francisco     │
│ USA        │ New York   │ Buffalo           │
│ USA        │ New York   │ New York City     │
└─────────────────────────────────────────────┘
```

### The Leftmost Prefix Rule

:::warning Key Concept
The database can only use a composite index if your query starts from the **leftmost column** and proceeds in order.
:::

**Index:** `(country, state, city)`

| Query | Uses Index? | Explanation |
|-------|-------------|-------------|
| `WHERE country = 'India'` | ✅ Yes | Leftmost column |
| `WHERE country = 'India' AND state = 'Karnataka'` | ✅ Yes | First two columns |
| `WHERE country = 'India' AND state = 'Karnataka' AND city = 'Bangalore'` | ✅ Yes | All three columns |
| `WHERE state = 'Karnataka'` | ❌ **NO** | Skipped `country` |
| `WHERE city = 'Bangalore'` | ❌ **NO** | Skipped `country` and `state` |
| `WHERE country = 'India' AND city = 'Bangalore'` | ⚠️ Partial | Uses `country`, but scans all states |

### Why Does This Rule Exist?

Think of it like a phone book sorted by (LastName, FirstName):
- You can quickly find all "Smiths" ✅
- You can quickly find "John Smith" ✅
- You **cannot** quickly find all "Johns" (they're scattered across different last names) ❌

### Column Order Matters!

Choose order based on:
1. **Selectivity** (most selective first for equality)
2. **Query patterns** (columns used in WHERE first)
3. **Range conditions** last (they stop index usage for subsequent columns)

```sql
-- Query pattern: WHERE status = 'active' AND created_at > '2024-01-01'

-- ❌ Bad order: Range column first
CREATE INDEX idx_bad ON orders(created_at, status);
-- Can use created_at range, but status part is useless

-- ✅ Good order: Equality first, range last
CREATE INDEX idx_good ON orders(status, created_at);
-- Uses status equality, then created_at range efficiently
```

---

## 4. Covering Indexes (Index-Only Scans)

### The Problem: Heap Lookups

Normally, finding a row takes TWO steps:
1. **Index Lookup:** Find the row pointer in the index
2. **Heap Fetch:** Go to the table to get other columns

```
Normal Query Execution:
                                        
Query: SELECT name, email FROM Users WHERE id = 5

Step 1: Index on 'id'              Step 2: Heap (Table)
┌─────────────────┐                ┌─────────────────────────┐
│ id │ Row Pointer│  ─────────────→│ id │ name │ email │ age │
│  5 │  0x1234    │                │  5 │ John │ j@x.c │ 25  │
└─────────────────┘                └─────────────────────────┘
        ↑                                      ↑
   Index Lookup                           Heap Fetch
   (Fast - O(log N))                     (Random I/O!)
```

### The Solution: Covering Index

If the index **contains all columns** needed by the query, skip the heap!

```sql
-- Create covering index
CREATE INDEX idx_users_covering ON Users(id, name, email);

-- Query
SELECT name, email FROM Users WHERE id = 5;
```

```
Index-Only Scan (No Heap Fetch!):
                                        
Query: SELECT name, email FROM Users WHERE id = 5

Covering Index (id, name, email)
┌────────────────────────────────┐
│ id │ name │ email              │  ← All data is HERE!
│  5 │ John │ john@example.com   │
└────────────────────────────────┘
        ↑
   One Index Lookup = Done!
   No Heap Fetch needed!
```

### PostgreSQL: INCLUDE Clause

PostgreSQL 11+ has `INCLUDE` to add columns without affecting sort order:

```sql
-- Index is sorted by id (for lookups)
-- name and email are stored but not in sort order
CREATE INDEX idx_covering ON Users(id) INCLUDE (name, email);
```

### Interview Question: When to Use Covering Indexes?

**Answer:**
- ✅ Hot queries that run frequently
- ✅ Queries selecting few columns
- ❌ Avoid for wide columns (TEXT, BLOB)
- ❌ Consider write penalty (larger index = more maintenance)

---

## 5. The SELECT * Anti-Pattern

:::danger Performance Killer
`SELECT *` prevents index-only scans and transfers unnecessary data over the network.
:::

### Why SELECT * is Bad

```sql
-- Table has: id, name, email, bio (TEXT), avatar (BLOB)
-- Index on: (email)

-- ❌ Bad Query
SELECT * FROM Users WHERE email = 'test@example.com';

-- What happens:
-- 1. Find email in index ✓
-- 2. Go to heap to fetch id, name, bio, avatar ✗ (expensive!)
-- 3. Transfer 500KB avatar over network ✗

-- ✅ Good Query
SELECT id, name FROM Users WHERE email = 'test@example.com';

-- Better yet, with covering index:
CREATE INDEX idx_users_email ON Users(email) INCLUDE (id, name);
-- Now: Index-only scan, no heap fetch, minimal data transfer
```

### Problems with SELECT *

| Issue | Explanation |
|-------|-------------|
| **No Index-Only Scan** | Forces heap lookup even if index has needed columns |
| **Network Overhead** | Transfers large columns (TEXT, BLOB) unnecessarily |
| **Cache Pollution** | Large columns evict useful data from buffer pool |
| **Schema Changes** | Adding a column silently changes query results |
| **Security Risk** | May expose sensitive columns (password_hash, etc.) |

---

## 6. Types of Indexes

### 6.1 B-Tree Index (Default)

```sql
CREATE INDEX idx_btree ON users(email);  -- B-Tree is default
```

**Good for:**
- Equality: `WHERE email = 'x'`
- Range: `WHERE age > 25`
- Sorting: `ORDER BY created_at`
- Prefix: `WHERE name LIKE 'John%'`

**Bad for:**
- Suffix: `WHERE name LIKE '%john'` (full scan)

### 6.2 Hash Index

```sql
-- PostgreSQL
CREATE INDEX idx_hash ON users USING HASH (email);
```

**Good for:**
- Equality ONLY: `WHERE email = 'x'`
- Slightly faster than B-Tree for equality

**Bad for:**
- Range queries (useless)
- Sorting (useless)
- Not crash-safe in older PostgreSQL versions

### 6.3 GIN Index (Generalized Inverted Index)

```sql
-- For array or JSONB columns
CREATE INDEX idx_gin ON products USING GIN (tags);
```

**Good for:**
- Array contains: `WHERE tags @> ARRAY['electronics']`
- JSONB queries: `WHERE data @> '{"status": "active"}'`
- Full-text search

### 6.4 GiST Index (Generalized Search Tree)

```sql
-- For geometric/spatial data
CREATE INDEX idx_gist ON locations USING GIST (coordinates);
```

**Good for:**
- Geospatial queries
- Range types
- Full-text search (alternative to GIN)

### 6.5 Full-Text Index

```sql
-- MySQL
CREATE FULLTEXT INDEX idx_ft ON articles(title, content);

-- PostgreSQL (using GIN)
CREATE INDEX idx_ft ON articles USING GIN (to_tsvector('english', content));
```

**Good for:**
- Text search: `WHERE MATCH(content) AGAINST ('database performance')`
- Natural language queries

### Index Type Summary

| Index Type | Equality | Range | Sort | Use Case |
|------------|----------|-------|------|----------|
| B-Tree | ✅ | ✅ | ✅ | General purpose (default) |
| Hash | ✅ | ❌ | ❌ | Equality-only lookups |
| GIN | ✅ | ❌ | ❌ | Arrays, JSONB, Full-text |
| GiST | ✅ | ✅ | ❌ | Geospatial, ranges |
| BRIN | ❌ | ✅ | ❌ | Very large, naturally ordered tables |

---

## 7. Clustered vs Non-Clustered Indexes

### Clustered Index (Primary Index)

The **table data itself** is stored in index order. Only ONE clustered index per table.

```
Clustered Index (Table IS the index):
┌────────────────────────────────────────────┐
│ Primary Key (id) determines physical order │
├────────────────────────────────────────────┤
│ id=1 │ data... │
│ id=2 │ data... │
│ id=3 │ data... │  ← Data stored in PK order
│ id=4 │ data... │
└────────────────────────────────────────────┘
```

**In MySQL InnoDB:** Primary key creates clustered index automatically.

### Non-Clustered Index (Secondary Index)

Separate structure pointing to the actual rows.

```
Secondary Index:          Table (Heap):
┌─────────────┐           ┌────────────────┐
│email │ ptr  │───────────→ id=3, name=John│
│aaa@  │ 0x10 │           │               │
│bbb@  │ 0x20 │───────────→ id=1, name=Jane│
│ccc@  │ 0x30 │           │               │
└─────────────┘           └────────────────┘
```

### InnoDB Secondary Index (Points to PK, not row)

```
Secondary Index (email):     Primary Index (id):     Row Data:
┌──────────────────┐        ┌──────────────────┐    ┌─────────┐
│ email  │ PK (id) │───────→│ id │ Row Pointer │───→│ Row Data│
│ aaa@   │    5    │        │  5 │     ...     │    │   ...   │
└──────────────────┘        └──────────────────┘    └─────────┘

Two lookups for secondary index!
```

---

## 8. Index Maintenance Best Practices

### Analyze Table Statistics

```sql
-- PostgreSQL
ANALYZE users;

-- MySQL
ANALYZE TABLE users;

-- Why? Optimizer uses statistics to choose best plan
-- Stale stats = bad query plans
```

### Reindex Bloated Indexes

```sql
-- PostgreSQL: Concurrent reindex (no locks)
REINDEX INDEX CONCURRENTLY idx_users_email;

-- Check bloat
SELECT pg_size_pretty(pg_relation_size('idx_users_email'));
```

### Monitor Unused Indexes

```sql
-- PostgreSQL: Find unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexname NOT LIKE '%pkey%';
-- idx_scan = 0 means index is never used!
```

---

## 9. Top Interview Questions

### Q1: What is the difference between B-Tree and B+ Tree?

**Answer:**
- **B-Tree:** Data stored in all nodes (internal + leaf)
- **B+ Tree:** Data only in leaf nodes, leaves are linked

B+ Tree is used in databases because:
1. More keys fit in internal nodes (faster traversal)
2. Linked leaves make range queries fast
3. Better for disk-based storage

### Q2: What is the leftmost prefix rule?

**Answer:** A composite index on (A, B, C) can be used for:
- WHERE A = ...
- WHERE A = ... AND B = ...
- WHERE A = ... AND B = ... AND C = ...

But NOT for:
- WHERE B = ... (skips A)
- WHERE C = ... (skips A and B)

### Q3: What is a covering index?

**Answer:** An index that contains ALL columns needed by a query, allowing the database to satisfy the query entirely from the index without accessing the table (index-only scan). This eliminates expensive heap lookups.

### Q4: When should you NOT add an index?

**Answer:**
1. **Write-heavy tables** (logs, events) - write penalty
2. **Small tables** (few hundred rows) - full scan is fast enough
3. **Low selectivity columns** (boolean, status with 2-3 values)
4. **Columns rarely used in WHERE/JOIN/ORDER BY**

### Q5: How do you identify missing indexes?

**Answer:**
1. **EXPLAIN ANALYZE** slow queries - look for Seq Scan
2. **pg_stat_user_tables** - high seq_scan count vs idx_scan
3. **Slow query log** - find patterns
4. **MySQL:** `sys.statements_with_full_table_scans`

---

## Quick Reference Card

```
┌──────────────────────────────────────────────────────────────────┐
│                    INDEX CHEAT SHEET                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ INDEX TYPES:                                                     │
│ ├── B-Tree (default)    → Equality, Range, Sort                 │
│ ├── Hash                → Equality only (rare use)              │
│ ├── GIN                 → Arrays, JSONB, Full-text              │
│ └── GiST                → Geospatial, Range types               │
│                                                                  │
│ COMPOSITE INDEX RULES:                                           │
│ ├── Index on (A, B, C) works for:                               │
│ │   ✅ WHERE A                                                  │
│ │   ✅ WHERE A AND B                                            │
│ │   ✅ WHERE A AND B AND C                                      │
│ │   ❌ WHERE B or C alone                                       │
│ └── Put equality columns first, range columns last              │
│                                                                  │
│ COVERING INDEX:                                                  │
│ ├── Include all columns query needs                             │
│ └── Enables index-only scan (no heap fetch)                     │
│                                                                  │
│ WRITE PENALTY:                                                   │
│ └── Every index = +1 write operation per INSERT/UPDATE/DELETE   │
│                                                                  │
│ ANTI-PATTERNS:                                                   │
│ ├── SELECT * (breaks index-only scans)                          │
│ ├── Over-indexing write-heavy tables                            │
│ └── LIKE '%pattern' (can't use B-Tree index)                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```
