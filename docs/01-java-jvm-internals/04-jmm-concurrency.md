---
title: "3. Java Memory Model & Concurrency"
sidebar_position: 4
description: Understanding Visibility, Atomicity, Volatile, and CAS.
---

# Java Memory Model (JMM) & Concurrency

The JMM defines how threads interact through memory. It revolves around three key concepts: **Atomicity, Visibility, and Ordering**.

## 1. The Core Problems

### 1.1 Visibility
If Thread A updates a value, when does Thread B see it?
*   **Issue:** Threads cache variables in **CPU Registers/L1 Cache**. Thread A might update the cache, but Thread B reads from its own stale cache.

### 1.2 Atomicity
Are operations indivisible?
*   **Issue:** `count++` is NOT atomic. It is reference-read-modify-write.
    1. Read `count` (0)
    2. Add 1
    3. Write `count` (1)
*   **Race Condition:** If two threads do this simultaneously, both might write `1` instead of `2`.

---

## 2. Keywords & Solutions

### 2.1 `volatile` (Visibility Only)
The `volatile` keyword guarantees that:
1.  Reads/Writes go directly to **Main Memory** (RAM), bypassing caches.
2.  **Happens-Before:** A write to a volatile variable _happens-before_ any subsequent read of that same variable.

**✅ Use Case:** Status flags.
```java
volatile boolean running = true;

public void stop() {
    running = false; // Immediately visible to other threads
}
```
**❌ Invalid Use Case:** Counters (`volatile` does NOT fix atomicity).

### 2.2 `synchronized` (Visibility + Atomicity)
Ensures only one thread can execute a block of code at a time. It also flushes CPU caches (Visibility).

```java
public synchronized void increment() {
    count++; // Safe!
}
```

---

## 3. Advanced Concurrency (CAS & AQS)

### 3.1 CAS (Compare-And-Swap)
Optimistic locking supported by hardware (CPU instruction `cmpxchg`).
Logic: *"I think the value is X. If it is X, change it to Y. If not, tell me I failed."*

**Example: `AtomicInteger`**
```java
AtomicInteger atomicCount = new AtomicInteger(0);
// Internally uses Unsafe.compareAndSwapInt
atomicCount.incrementAndGet(); 
```
*   **Pros:** strict performance (no OS context switching/blocking).
*   **Cons:** High CPU usage under high contention (spin loops).

### 3.2 AQS (AbstractQueuedSynchronizer)
The framework behind `ReentrantLock`, `CountDownLatch`, and `Semaphore`.
It uses:
1.  An `int` state (e.g., 0 = free, 1 = locked).
2.  A FIFO queue of waiting threads.
3.  `LockSupport.park()` to suspend threads (better than busy spinning).

**ReentrantLock vs synchronized:**
| Feature | synchronized | ReentrantLock |
|---------|--------------|---------------|
| **Type** | Implicit (Language keyword) | Explicit (Object) |
| **Fairness** | No (Random) | Optional (Can be fair) |
| **Interruptible** | No (Must wait forever) | Yes (`lockInterruptibly()`) |
| **Timeout** | No | Yes (`tryLock(time)`) |

```java
Lock lock = new ReentrantLock();
try {
    if (lock.tryLock(100, TimeUnit.MILLISECONDS)) {
        // Critical section
    }
} finally {
    lock.unlock(); // MUST be in finally block!
}
```
