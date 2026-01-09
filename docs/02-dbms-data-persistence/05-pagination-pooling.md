---
title: "5. Pagination & Connection Pooling"
sidebar_position: 5
description: Offset vs Cursor Pagination and HikariCP Tunging.
---

# Optimization Patterns: Pagination & Pooling

## 1. Pagination Strategies

### 1.1 Offset Pagination (The Default)
Typical SQL: `LIMIT 10 OFFSET 1000`.

*   **How it works:** Sorting the data, skipping the first 1000 rows, returning the next 10.
*   **The Problem:** To skip 1,000,000 rows, the DB usually has to fetch and discard 1,000,000 rows. Performance degrades linearly (`O(N)`).
*   **Verdict:** Good for small pages/data. Bad for infinite scroll or large datasets.

### 1.2 Cursor-Based (Keyset) Pagination
Instead of "Page 5", you say "Give me 10 rows *after* ID 500".

```sql
-- Usage
SELECT * FROM Users 
WHERE id > 1005 -- The 'Cursor'
ORDER BY id ASC 
LIMIT 10;
```

*   **Performance:** `O(1)` or `O(log N)`. It jumps directly to `ID 1005` using the Index.
*   **Limitations:** Hard to jump to "Page 50" specifically. You must traverse sequentially. Ideal for "Load More" / Infinite Scroll.

---

## 2. Connection Pooling (HikariCP)

Creating a DB connection is expensive (TCP Handshake + Auth + SSL). A **Connection Pool** keeps a set of open connections ready to use.

### 2.1 Why HikariCP?
It is the default in Spring Boot 2.0+. It is extremely lightweight and fast (optimized byte-code).

### 2.2 Sizing the Pool
**Myth:** "More connections = Faster."
**Reality:** CPU Cores are limited. If you have 4 Cores, running 1000 connections is slower than running 10 connections because of **Context Switching**.

**Formula (PostgreSQL Team Recommendation):**
```text
Pool Size = (Total Cores * 2) + Effective Spindle Count
```

For a generic cloud server (4 vCPU), a pool size of **10-20** is usually optimal.

### 2.3 Pool Exhaustion
Error: `ConnectionTimeoutException`.
**Causes:**
1.  **Leak:** Connections not closed (try-with-resources missing).
2.  **Slow Queries:** Applications holding connections for too long while waiting for a slow SQL query.
3.  **Long Transactions:** Doing HTTP calls *inside* a DB transaction keeps the connection borrowed during the network request.
