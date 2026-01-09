---
title: "4. Locking & Query Execution"
sidebar_position: 4
description: Row vs Table Locks, Gap Locks, and Reading Query Plans (EXPLAIN).
---

# Locking & Query Execution

## 1. Locking Mechanisms

Database locks control access to the same piece of data at the same time.

### 1.1 Row vs. Table Locks
*   **Table Lock:** Old approach (MyISAM). Locks the *entire* table for a write. No one else can write anything to the table.
    *   *Impact:* Low concurrency. Good for bulk loads.
*   **Row Lock:** Modern approach (InnoDB, Postgres). Locks only the specific rows being modified (`ID=5`).
    *   *Impact:* High concurrency. Thread A updates Row 5, Thread B updates Row 6 simultaneously.

### 1.2 Gap Locks (Phantom Read Prevention)
Used in `REPEATABLE READ` isolation to prevent "Phantoms".
*   **Scenario:** `SELECT * FROM Users WHERE age BETWEEN 10 AND 20 FOR UPDATE`.
*   **The Lock:** It locks the existing rows (12, 15, 18).
*   **The GAP:** It *also* locks the "empty space" between them.
*   **Result:** Another transaction trying to `INSERT` a User with age 14 will block! This ensures that if you run the SELECT again, you get the same rows.

### 1.3 Optimistic vs. Pessimistic Locking

| Type | Mechanics | Use Case |
|------|-----------|----------|
| **Pessimistic** | "Lock it first." Use `SELECT ... FOR UPDATE`. The DB physically holds a lock. | High contention systems (Banking, Ticket Booking). |
| **Optimistic** | "Check version later." Add a `version` column. | Low contention (User profiles, Comments). |

**Optimistic Implementation (JPA/Hibernate):**
```sql
-- 1. Read
SELECT id, name, version FROM Product WHERE id=1; -- Returns version=5

-- 2. Update (Application Logic)

-- 3. Write
UPDATE Product SET name='New', version=6 
WHERE id=1 AND version=5; 
-- If rows updated = 0, it means someone else changed it. Throw Exception.
```

---

## 2. Query Execution & The Optimizer

### 2.1 Cost-Based Optimizer (CBO)
The DB doesn't just run your query. It calculates the "cost" (CPU + IO) of different ways to run it and picks the cheapest.
*   *Plan A:* Scan entire table (Cost: 500)
*   *Plan B:* Use Index X (Cost: 20)
*   *Decision:* Pick Plan B.

**Pitfall:** If table statistics are old (e.g., DB thinks table is empty but it has 1M rows), it makes bad choices. **Solution:** Run `ANALYZE TABLE`.

### 2.2 Understanding `EXPLAIN`

The `EXPLAIN` command shows the execution plan.

```sql
EXPLAIN SELECT * FROM Users WHERE email = 'test@test.com';
```

**Key Terms to Watch:**
*   **Seq Scan / ALL:** Full Table Scan. ❌ BAD (usually).
*   **Index Scan / Ref:** Uses the index B-Tree. ✅ GOOD.
*   **Range:** Scans a range (e.g., `> 100`). ✅ OK.
*   **Filesort:** Sorting without an index. ⚠️ WARNING.

### 2.3 `EXPLAIN ANALYZE`
Standard `EXPLAIN` is a guess. `EXPLAIN ANALYZE` **actually runs** the query and reports real timing.
*   *Usage:* Debugging why a query is slow in production vs fast in local.
