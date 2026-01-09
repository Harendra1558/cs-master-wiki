---
title: "2. Transactions & Concurrency"
sidebar_position: 3
description: ACID, Isolation Levels, and MVCC Mechanism
---

# Transactions, ACID, and Concurrency Control

## 1. ACID Properties
Every reliable database transaction follows ACID:

*   **Atomicity:** All or nothing. If the power cuts out halfway through a transfer, nothing happens.
*   **Consistency:** The DB is always in a valid state (Foreign keys valid, constraints met).
*   **Isolation:** Transactions shouldn't mess with each other (see below).
*   **Durability:** Once you see "COMMIT Success", the data is on the disk. Even if the server melts 1ms later.

---

## 2. Isolation Levels (The Danger Zone)
Trade-off: **Performance vs. Correctness**.

| Level | Dirty Read? | Non-Repeatable Read? | Phantom Read? | Usage |
|-------|-------------|----------------------|---------------|-------|
| **Read Uncommitted** | ✅ Yes | ✅ Yes | ✅ Yes | **Never** use this. |
| **Read Committed** | ❌ No | ✅ Yes | ✅ Yes | **Default** in generic databases (Postgres, Oracle). |
| **Repeatable Read** | ❌ No | ❌ No | ✅ Yes | **Default** in MySQL. |
| **Serializable** | ❌ No | ❌ No | ❌ No | Slowest. strict order. |

### The Problems Explained
1.  **Dirty Read:** You read data that hasn't been committed yet. The other transaction rolls back, and you are holding "phantom" money.
2.  **Non-Repeatable Read:** You read `Balance=$100`. Someone else commits a change. You read `Balance` again within the same transaction, and now it's `$200`.
3.  **Phantom Read:** You `SELECT count(*) FROM Users` and get 10. Someone inserts a user. You run it again and get 11.

---

## 3. How Databases handle this: MVCC
**Multi-Version Concurrency Control (MVCC)** is how modern DBs (Postgres, MySQL InnoDB) implement isolation without locking everything.

**The Concept:**
When you update a row, the DB doesn't overwrite it immediately.
1.  It creates a **new version** of the row with a higher timestamp/version ID.
2.  Users reading concurrently still see the **old version**.
3.  The old version is only deleted (Vacuumed/Purged) when no active transactions need it anymore.

**Benefit:**
**Readers don't block Writers.** **Writers don't block Readers.**
You can run a heavy "Daily Report" (`SELECT`) while users are buying things (`INSERT`), and neither blocks the other.

---

## 4. Deadlocks
A deadlock happens when two transactions wait for each other.

*   **Tx A:** Locks Row 1. Wants Row 2.
*   **Tx B:** Locks Row 2. Wants Row 1.
*   **Result:** Both wait forever (until Timeout).

**Prevention:**
Always access resources in the **same order**.
*   *Bad:* Tx A (1 -> 2), Tx B (2 -> 1)
*   *Good:* Tx A (1 -> 2), Tx B (1 -> 2) [Tx B waits harmlessly]
