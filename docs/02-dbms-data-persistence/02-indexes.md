---
title: 1. Deep Dive into Database Indexes
sidebar_position: 2
description: B-Trees, Composite Indexes, and the Write Penalty
---

# Deep Dive into Database Indexes

:::info production tip
Indexes are not free. A common production issue is "Over-Indexing", which kills write throughput (INSERT/UPDATE/DELETE).
:::

## 1. How B-Trees Work (The Backbone)
Most relational databases (MySQL, PostgreSQL) use **B-Trees** (or B+ Trees) for standard indexes.

*   **Structure:** It's a balanced tree kept sorted.
*   **Performance:** Lookup is `O(log N)`. For 1 million rows, it takes only ~20 steps to find a record.
*   **The Cost:** Every time you `INSERT` a row, the database must **rebalance the tree**, which takes CPU and I/O.

## 2. The Index Write Penalty
Imagine a table with 5 indexes. When you do **one** `INSERT`:
1.  The actual row is written to the Heap (Table data).
2.  **ALL 5 Indexes** must be updated.

**Math:**
*   1 Table Write
*   5 Index Writes (Random I/O)
*   = **6x I/O Cost** for a single insert!

**Rule of Thumb:**
*   **Read-Heavy Table:** Indexes are fine.
*   **Write-Heavy Table (Logs, Audit):** Keep indexes to a bare minimum.

---

## 3. Composite Indexes & The "Leftmost Prefix" Rule
A composite index is an index on multiple columns: `CREATE INDEX idx_name ON Users(state, city, lastname)`.

### How it's stored:
It is sorted first by `state`, then by `city` (inside that state), then by `lastname`.

### The Rule
The database can only use the index if you search from the **Left**.

| Query | Uses Index? | Why? |
|-------|-------------|------|
| `WHERE state='CA'` | ✅ Yes | Starts with Leftmost column. |
| `WHERE state='CA' AND city='SF'` | ✅ Yes | Uses first two columns. |
| `WHERE city='SF'` | ❌ **NO** | Skipped the first column (`state`). |
| `WHERE lastname='Smith'` | ❌ **NO** | Skipped first two columns. |
| `WHERE state='CA' AND lastname='Smith'` | ⚠️ Partial | Uses `state`, but scans all cities in CA to find Smith. |

---

## 4. Index-Only Scans (The Holy Grail)
Normally, the DB looks up the ID in the index, then goes to the main table ("Heap Fetch") to get other columns (like `email`).
But, if your index **contains** all the data the query needs, it skips the table lookup entirely!

**Scenario:**
Query: `SELECT email FROM Users WHERE id = 5;`
Index: `(id, email)`

**Result:**
The DB finds `id=5` in the index B-Tree. It sees `email` is right there next to it. It returns immediately. **0 Disk seeks to the main table.**

---

## 5. The generic `SELECT *` Anti-Pattern
Using `SELECT *` breaks Index-Only Scans.

*   **Query:** `SELECT * FROM Users WHERE lastname='Smith'`
*   **Index:** `(lastname)`
*   **Problem:** The index has `lastname`, but `SELECT *` asks for `age`, `address`, `phone`. The DB **must** go to the main table for every single `Smith` found.

**Fix:** Only select what you need. `SELECT id, lastname FROM Users...`
