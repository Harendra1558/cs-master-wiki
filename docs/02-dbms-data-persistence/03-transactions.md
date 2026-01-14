---
title: "2. Transactions, ACID & Isolation Levels"
sidebar_position: 3
description: ACID properties, Isolation Levels, MVCC, and Write-Ahead Logging
---

# Transactions, ACID & Isolation Levels

:::info Interview Importance ⭐⭐⭐⭐⭐
Understanding transactions and isolation levels is **critical** for building reliable applications. This is asked in almost every backend interview.
:::

## What is a Transaction?

**Simple Answer:** A transaction is a **group of operations** that either ALL succeed or ALL fail together. It's "all or nothing."

**Example:** Bank Transfer
```sql
BEGIN TRANSACTION;
    UPDATE accounts SET balance = balance - 500 WHERE id = 1;  -- Debit
    UPDATE accounts SET balance = balance + 500 WHERE id = 2;  -- Credit
COMMIT;
```

If the server crashes after the debit but before the credit, the entire transaction is rolled back. No money disappears!

---

## 1. ACID Properties

Every reliable database transaction follows **ACID**:

### 1.1 Atomicity (All or Nothing)

**Simple Explanation:** Either all operations in a transaction complete, or none of them do.

```
Scenario: Transfer $500 from Account A to B

Success Case:
┌─────────────────┐
│ Debit A: -500   │ ──→ Both happen
│ Credit B: +500  │ ──→ 
└─────────────────┘

Failure Case (server crash after debit):
┌─────────────────┐
│ Debit A: -500   │ ──→ ROLLBACK!
│ Credit B: ???   │ ──→ (never executed)
└─────────────────┘
Result: A still has original balance
```

**How it's implemented:** Write-Ahead Logging (WAL)

### 1.2 Consistency (Valid State to Valid State)

**Simple Explanation:** The database moves from one valid state to another. All constraints (foreign keys, unique, check) are maintained.

```sql
-- Constraint: balance >= 0
UPDATE accounts SET balance = balance - 1000 WHERE id = 1;
-- If balance is 500, this violates constraint
-- Transaction is ABORTED, not committed
```

### 1.3 Isolation (Transactions Don't Interfere)

**Simple Explanation:** Even though transactions run concurrently, each sees the database as if it's the only one running (to varying degrees based on isolation level).

```
Time →

Transaction A:  [Read X]----[Read X]----[Commit]
Transaction B:       [Write X]----[Commit]
                          ↑
                    What does A see?
                    Depends on ISOLATION LEVEL!
```

### 1.4 Durability (Permanent Once Committed)

**Simple Explanation:** Once you see "COMMIT successful", the data is guaranteed to survive even if the server explodes 1 millisecond later.

**How it's implemented:** 
- Write to disk (WAL) before acknowledging commit
- Synchronous writes to durable storage

### ACID Summary Table

| Property | Guarantee | Implementation |
|----------|-----------|----------------|
| **Atomicity** | All or nothing | WAL + Undo Log |
| **Consistency** | Valid state transitions | Constraints, Triggers |
| **Isolation** | No interference | Locking, MVCC |
| **Durability** | Survives crashes | WAL + fsync |

---

## 2. Isolation Levels

:::warning Critical Concept
Isolation levels trade **correctness for performance**. Higher isolation = safer but slower.
:::

### The Problems Isolation Solves

Before diving into levels, understand the **problems**:

#### Problem 1: Dirty Read

Reading data that hasn't been committed yet.

```
Time →

Transaction A: [BEGIN]──[UPDATE X=100]──────────[ROLLBACK]
Transaction B:          [READ X]──(sees 100!)──[uses wrong data!]
                              ↑
                        Dirty Read!
                        X was never actually 100
```

#### Problem 2: Non-Repeatable Read

Same query returns different results within a transaction.

```
Time →

Transaction A: [BEGIN]──[Read X=100]───────────────[Read X=200]──[Commit]
Transaction B:                    [UPDATE X=200]──[Commit]
                                                        ↑
                                                Non-Repeatable!
                                                Same query, different result
```

#### Problem 3: Phantom Read

New rows appear/disappear between queries.

```
Time →

Transaction A: [BEGIN]──[SELECT count(*)=10]─────────[SELECT count(*)=11]
Transaction B:                          [INSERT new row]──[Commit]
                                                              ↑
                                                        Phantom Row!
```

### Isolation Levels Comparison

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Performance |
|-------|------------|---------------------|--------------|-------------|
| **Read Uncommitted** | ✅ Possible | ✅ Possible | ✅ Possible | 🚀 Fastest |
| **Read Committed** | ❌ Prevented | ✅ Possible | ✅ Possible | Fast |
| **Repeatable Read** | ❌ Prevented | ❌ Prevented | ✅ Possible | Medium |
| **Serializable** | ❌ Prevented | ❌ Prevented | ❌ Prevented | 🐢 Slowest |

### 2.1 Read Uncommitted

**What happens:** Transaction can read uncommitted changes from other transactions.

```sql
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
```

**Use cases:** Almost never! Only for rough analytics where accuracy doesn't matter.

### 2.2 Read Committed (Default in PostgreSQL, Oracle)

**What happens:** 
- Only reads committed data
- Each query sees a new snapshot of committed data

```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Transaction A
BEGIN;
SELECT balance FROM accounts WHERE id = 1;  -- Returns 1000

-- Transaction B commits: UPDATE accounts SET balance = 500 WHERE id = 1;

SELECT balance FROM accounts WHERE id = 1;  -- Returns 500 (changed!)
COMMIT;
```

**Use cases:** General OLTP workloads, most applications.

### 2.3 Repeatable Read (Default in MySQL InnoDB)

**What happens:**
- First query creates a snapshot
- All subsequent reads see the SAME snapshot
- No non-repeatable reads within transaction

```sql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- Transaction A
BEGIN;
SELECT balance FROM accounts WHERE id = 1;  -- Returns 1000

-- Transaction B commits: UPDATE accounts SET balance = 500 WHERE id = 1;

SELECT balance FROM accounts WHERE id = 1;  -- Still returns 1000!
COMMIT;
```

**Use cases:** Financial applications, reporting, any scenario where consistency within transaction matters.

### 2.4 Serializable

**What happens:**
- Transactions behave as if they ran one after another (serially)
- Prevents all anomalies including phantoms
- May cause more transaction failures/retries

```sql
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

**Use cases:** Critical financial transactions, inventory management with exact counts.

### Interview Question: Which Isolation Level Should I Use?

**Answer:**
1. **Most applications:** Read Committed (good balance)
2. **Need consistent reads within transaction:** Repeatable Read
3. **Absolute correctness required:** Serializable (prepare for retries)
4. **Read Uncommitted:** Avoid (rarely justified)

---

## 3. MVCC (Multi-Version Concurrency Control)

:::tip Key Insight
MVCC enables **readers to not block writers** and **writers to not block readers**. This is how modern databases achieve high concurrency.
:::

### How MVCC Works

Instead of locks, the database keeps **multiple versions** of each row.

```
Traditional Locking (Old Way):
┌─────────────────────────────────────────────────┐
│ Reader A wants to read Row 1                    │
│ Writer B wants to update Row 1                  │
│ Result: One must WAIT for the other!            │
└─────────────────────────────────────────────────┘

MVCC (Modern Way):
┌─────────────────────────────────────────────────┐
│ Row 1 Version 1: {balance: 1000, created: t1}   │
│ Row 1 Version 2: {balance: 500, created: t2}    │
│                                                  │
│ Reader A (started at t1): Sees Version 1        │
│ Writer B (updating now): Creates Version 2      │
│                                                  │
│ Result: Both proceed without blocking!          │
└─────────────────────────────────────────────────┘
```

### MVCC Example

```
Time: t1  t2  t3  t4  t5  t6
         │   │   │   │   │
Tx A: [BEGIN]───[Read Row 1]───────────[Read Row 1]───[Commit]
                    │                       │
                    │                    Still sees $1000!
                    │
Tx B:          [BEGIN]─[UPDATE Row 1 = $500]─[COMMIT]
                              │
                        Creates new version
                        
Row 1 Versions:
├── Version 1: balance=$1000, valid t1-t4
└── Version 2: balance=$500,  valid t4-∞

Tx A sees Version 1 (snapshot from t1)
New transactions after t4 see Version 2
```

### MVCC in Different Databases

| Database | MVCC Implementation |
|----------|---------------------|
| **PostgreSQL** | Stores multiple versions in table, VACUUM cleans old versions |
| **MySQL InnoDB** | Stores versions in UNDO tablespace |
| **Oracle** | Uses UNDO segments |

### MVCC Cleanup

Old versions must be cleaned up:

```sql
-- PostgreSQL: VACUUM
VACUUM ANALYZE users;

-- Or autovacuum runs automatically

-- Check bloat
SELECT pg_size_pretty(pg_table_size('users'));
```

---

## 4. Write-Ahead Logging (WAL)

### What is WAL?

**Simple Explanation:** Before changing data, write the change to a **log file first**. If crash happens, replay the log to recover.

```
Normal Write (Dangerous):
1. Update data in memory
2. Write to disk (later, maybe)
3. ❌ CRASH! Data lost!

Write-Ahead Logging (Safe):
1. Write change to WAL log (durable)
2. Acknowledge to user "COMMIT OK"
3. Later, write to actual data files
4. ✅ CRASH? Replay WAL to recover!
```

### How WAL Provides ACID

| Property | How WAL Helps |
|----------|---------------|
| **Atomicity** | WAL contains all changes; replay all or none |
| **Durability** | WAL is synced to disk before commit returns |

### WAL in Practice

```
Transaction: UPDATE accounts SET balance = 500 WHERE id = 1

Step 1: Write to WAL
┌─────────────────────────────────────────────────────────────┐
│ WAL Record: {txn: 12345, table: accounts, id: 1,            │
│              old: 1000, new: 500, timestamp: t1}            │
└─────────────────────────────────────────────────────────────┘
     ↓ fsync to disk

Step 2: Return "COMMIT OK" to application

Step 3: Later, update actual data page (checkpoint)
```

### WAL Configuration (PostgreSQL)

```sql
-- View WAL location
SHOW data_directory;
-- WAL files in pg_wal subdirectory

-- Configuration
synchronous_commit = on     -- Wait for WAL sync (safe, slower)
synchronous_commit = off    -- Don't wait (risky, faster)
```

---

## 5. Transaction Best Practices

### 5.1 Keep Transactions Short

```sql
-- ❌ Bad: Long transaction
BEGIN;
SELECT * FROM orders WHERE status = 'pending';
-- Application processes for 30 seconds...
UPDATE orders SET status = 'processed' WHERE id = 123;
COMMIT;
-- Held locks for 30 seconds!

-- ✅ Good: Short transaction
-- Do processing in application first
BEGIN;
UPDATE orders SET status = 'processed' WHERE id = 123;
COMMIT;
-- Lock held for milliseconds
```

### 5.2 Don't Do I/O Inside Transactions

```java
// ❌ Bad: HTTP call inside transaction
@Transactional
public void processOrder(Order order) {
    orderRepository.save(order);
    
    // HTTP call to payment gateway - 2 seconds!
    paymentService.charge(order.getAmount());
    
    order.setStatus("PAID");
    orderRepository.save(order);
}
// Transaction open for 2+ seconds!

// ✅ Good: I/O outside transaction
public void processOrder(Order order) {
    // HTTP call outside transaction
    PaymentResult result = paymentService.charge(order.getAmount());
    
    if (result.isSuccess()) {
        orderService.markAsPaid(order.getId());  // Short txn
    }
}
```

### 5.3 Handle Deadlocks with Retries

```java
// ✅ Retry on deadlock
@Retryable(value = DeadlockLoserDataAccessException.class, maxAttempts = 3)
@Transactional
public void transferMoney(Long fromId, Long toId, BigDecimal amount) {
    // Lock in consistent order to prevent deadlock
    Account from = accountRepository.findByIdForUpdate(Math.min(fromId, toId));
    Account to = accountRepository.findByIdForUpdate(Math.max(fromId, toId));
    // ... transfer logic
}
```

### 5.4 Use Appropriate Isolation Level

```java
// ✅ Read-only report: lower isolation OK
@Transactional(readOnly = true, isolation = Isolation.READ_COMMITTED)
public Report generateReport() {
    // ...
}

// ✅ Critical financial operation: higher isolation
@Transactional(isolation = Isolation.SERIALIZABLE)
public void processPayment(Payment payment) {
    // ...
}
```

---

## 6. Savepoints

Savepoints allow you to rollback part of a transaction.

```sql
BEGIN;
INSERT INTO orders VALUES (1, 'Order 1');

SAVEPOINT my_savepoint;

INSERT INTO orders VALUES (2, 'Order 2');  -- Oops, bad data

ROLLBACK TO SAVEPOINT my_savepoint;  -- Undo Order 2 only

INSERT INTO orders VALUES (3, 'Order 3');  -- Good data

COMMIT;  -- Order 1 and Order 3 are saved
```

---

## 7. Distributed Transactions (2PC)

When transactions span multiple databases:

### Two-Phase Commit (2PC)

```
                    Coordinator
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
    Database A       Database B       Database C
    
Phase 1 - Prepare:
    Coordinator: "Can you commit?"
    All DBs: "Yes, prepared!"

Phase 2 - Commit:
    Coordinator: "Commit!"
    All DBs: "Done!"
```

**Problems with 2PC:**
- Blocking if coordinator crashes
- Performance overhead
- Not suitable for microservices

**Modern alternatives:**
- Saga pattern (compensating transactions)
- Eventual consistency

---

## 8. Top Interview Questions

### Q1: Explain ACID properties with an example.

**Answer:** Using bank transfer ($500 from A to B):
- **Atomicity:** If crash after debit, both debit AND credit are undone
- **Consistency:** Total money in system stays same (constraints enforced)
- **Isolation:** Other transactions see either before-transfer OR after-transfer, never partial
- **Durability:** Once committed, transfer survives server crash

### Q2: What is the difference between Read Committed and Repeatable Read?

**Answer:**
- **Read Committed:** Each query sees latest committed data. Same query may return different results within transaction (non-repeatable reads allowed).
- **Repeatable Read:** Transaction sees snapshot from its start. Same query always returns same result within transaction.

### Q3: What is MVCC and why is it important?

**Answer:** MVCC (Multi-Version Concurrency Control) keeps multiple versions of each row. Benefits:
1. Readers don't block writers
2. Writers don't block readers
3. Higher concurrency than locking
4. Time-travel queries possible

Implemented in PostgreSQL, MySQL InnoDB, Oracle.

### Q4: What is a phantom read?

**Answer:** When a transaction runs the same query twice and gets different rows (not values, but actual row count). Example:
1. Transaction A: `SELECT count(*) FROM users WHERE age > 20` → 100
2. Transaction B: Inserts new user with age 25, commits
3. Transaction A: Same query → 101

Phantom reads are prevented only at SERIALIZABLE isolation.

### Q5: How does a database ensure durability?

**Answer:** Through Write-Ahead Logging (WAL):
1. Before any data change, write to WAL log
2. Sync WAL to disk (fsync)
3. Return "COMMIT OK" to application
4. Later, apply changes to actual data files

On crash recovery, replay WAL to restore committed transactions.

---

## Quick Reference Card

```
┌──────────────────────────────────────────────────────────────────┐
│                 TRANSACTION CHEAT SHEET                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ACID:                                                            │
│ ├── Atomicity   → All or nothing                                │
│ ├── Consistency → Valid state to valid state                    │
│ ├── Isolation   → Transactions don't interfere                  │
│ └── Durability  → Committed = permanent                         │
│                                                                  │
│ ISOLATION LEVELS (Low → High):                                   │
│ ├── Read Uncommitted → Dirty reads possible (avoid!)            │
│ ├── Read Committed   → Each query sees latest commit (default)  │
│ ├── Repeatable Read  → Snapshot at transaction start            │
│ └── Serializable     → Full isolation (slowest)                 │
│                                                                  │
│ PROBLEMS:                                                        │
│ ├── Dirty Read         → Reading uncommitted data               │
│ ├── Non-Repeatable Read→ Same query, different values           │
│ └── Phantom Read       → Same query, different rows             │
│                                                                  │
│ MVCC BENEFITS:                                                   │
│ ├── Readers don't block writers                                 │
│ └── Writers don't block readers                                 │
│                                                                  │
│ BEST PRACTICES:                                                  │
│ ├── Keep transactions SHORT                                     │
│ ├── No I/O (HTTP, files) inside transactions                    │
│ ├── Use appropriate isolation level                             │
│ └── Handle deadlocks with retries                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```
