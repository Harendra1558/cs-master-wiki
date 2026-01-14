---
title: "3. Java Memory Model & Concurrency"
sidebar_position: 4
description: Understanding Visibility, Atomicity, Volatile, CAS, AQS, and advanced concurrency.
---

# Java Memory Model (JMM) & Concurrency

:::info Interview Importance ⭐⭐⭐⭐⭐
Concurrency is the **most challenging** topic in Java interviews. Understanding JMM, volatile, synchronized, and lock-free programming separates good developers from great ones.
:::

## Why Concurrency is Hard?

**Simple Explanation:** When multiple threads access shared data, weird things happen because:
1. Each CPU core has its own **cache** (threads don't see each other's changes)
2. Compilers **reorder** instructions for optimization
3. Operations like `count++` are **not atomic** (multiple steps)

---

## 1. The Three Core Problems

### 1.1 Visibility Problem

**What is it?** Thread A writes a value, but Thread B still sees the old value.

**Why does it happen?** Modern CPUs have multiple levels of cache (L1, L2, L3). When Thread A updates a variable, it might only update its local cache, not main memory.

```java
// ❌ BROKEN CODE - Visibility problem
public class VisibilityProblem {
    private boolean running = true;  // NOT volatile!
    
    public void stop() {
        running = false;  // Thread 1 writes to its cache
    }
    
    public void run() {
        while (running) {  // Thread 2 reads from its cache
            // This might run FOREVER!
            // Thread 2 never sees Thread 1's update
        }
    }
}
```

**The Memory Hierarchy:**
```
┌─────────────────────────────────────────────────────────────────┐
│                          MAIN MEMORY (RAM)                       │
│                      running = false (actual value)              │
└─────────────────────────────────────────────────────────────────┘
                    ↑                         ↑
            (might not sync)           (reads stale value)
                    ↑                         ↑
┌─────────────────────────┐     ┌─────────────────────────────┐
│    CPU CORE 1           │     │        CPU CORE 2           │
│ ┌─────────────────────┐ │     │ ┌─────────────────────────┐ │
│ │ L1 Cache            │ │     │ │ L1 Cache                │ │
│ │ running = false ✓   │ │     │ │ running = true ✗ STALE! │ │
│ └─────────────────────┘ │     │ └─────────────────────────┘ │
│       Thread 1          │     │       Thread 2              │
│    (Writer Thread)      │     │    (Reader Thread)          │
└─────────────────────────┘     └─────────────────────────────┘
```

### 1.2 Atomicity Problem

**What is it?** Operations that look like one step are actually multiple steps, and another thread can interrupt in the middle.

**Classic Example: `count++`**

```java
// ❌ BROKEN CODE - Atomicity problem
public class AtomicityProblem {
    private int count = 0;
    
    public void increment() {
        count++;  // Looks atomic, but it's NOT!
    }
}
```

**What actually happens with `count++`:**
```
count++ is actually THREE operations:
1. READ:  Load count from memory into register
2. MODIFY: Add 1 to the register
3. WRITE:  Store register back to memory

RACE CONDITION:
┌─────────────────────────────────────────────────────────────┐
│ Time    │ Thread 1        │ Thread 2        │ count value  │
├─────────┼─────────────────┼─────────────────┼──────────────┤
│ T1      │ READ count (0)  │                 │ 0            │
│ T2      │                 │ READ count (0)  │ 0            │
│ T3      │ ADD 1 (now 1)   │                 │ 0            │
│ T4      │                 │ ADD 1 (now 1)   │ 0            │
│ T5      │ WRITE 1         │                 │ 1            │
│ T6      │                 │ WRITE 1         │ 1 ← WRONG!   │
└─────────────────────────────────────────────────────────────┘
Expected: 2    Actual: 1 (LOST UPDATE!)
```

### 1.3 Ordering Problem (Instruction Reordering)

**What is it?** Compilers and CPUs can reorder instructions for optimization, which can break concurrent code.

```java
// ❌ BROKEN CODE - Ordering problem
public class OrderingProblem {
    private int data = 0;
    private boolean ready = false;
    
    // Thread 1: Producer
    public void write() {
        data = 42;         // Step 1
        ready = true;      // Step 2
    }
    
    // Thread 2: Consumer  
    public void read() {
        while (!ready) { }  // Wait for ready
        System.out.println(data);  // MIGHT print 0!
    }
}
```

**Why can it print 0?**
The CPU/compiler might reorder Thread 1's instructions:
```java
// Reordered by CPU (allowed because no data dependency)
ready = true;     // Step 2 moved before Step 1!
data = 42;        // Step 1
```

Now Thread 2 sees `ready=true` but `data` is still 0!

---

## 2. Solutions: volatile, synchronized, and More

### 2.1 The `volatile` Keyword

**What does it do?**
1. ✅ **Visibility**: Writes go directly to main memory; reads come from main memory
2. ✅ **Ordering**: Prevents reordering (creates memory barrier)
3. ❌ **NOT Atomicity**: `volatile count++` is still NOT atomic!

```java
// ✅ FIXED with volatile - for visibility/ordering
public class VolatileExample {
    private volatile boolean running = true;  // volatile!
    
    public void stop() {
        running = false;  // Write goes to main memory
    }
    
    public void run() {
        while (running) {  // Read comes from main memory
            // Now correctly sees the update!
        }
    }
}
```

### When to Use volatile?

| Use Case | volatile? | Why |
|----------|-----------|-----|
| Status flags | ✅ Yes | Simple read/write, only visibility needed |
| Counters | ❌ No | Need atomicity (use AtomicInteger) |
| Double-checked locking | ✅ Yes | Prevents reordering |
| Configuration reload | ✅ Yes | One writer, multiple readers |

### 2.2 The `synchronized` Keyword

**What does it do?**
1. ✅ **Visibility**: Flushes caches on exit
2. ✅ **Atomicity**: Only one thread can execute at a time
3. ✅ **Ordering**: Creates memory barriers

```java
// ✅ FIXED with synchronized - for atomicity
public class SynchronizedExample {
    private int count = 0;
    
    public synchronized void increment() {
        count++;  // Now atomic! Only one thread at a time
    }
    
    public synchronized int getCount() {
        return count;  // Also synchronized for visibility
    }
}
```

### synchronized Variations

```java
// 1. Synchronized method (locks 'this')
public synchronized void method1() { ... }

// 2. Synchronized static method (locks Class object)
public static synchronized void method2() { ... }

// 3. Synchronized block (locks specific object)
public void method3() {
    synchronized (lockObject) {
        // Critical section
    }
}

// 4. synchronized on class
public void method4() {
    synchronized (MyClass.class) {
        // Same as static synchronized method
    }
}
```

### Interview Question: volatile vs synchronized

| Aspect | volatile | synchronized |
|--------|----------|--------------|
| **Visibility** | ✅ Yes | ✅ Yes |
| **Atomicity** | ❌ No | ✅ Yes |
| **Ordering** | ✅ Yes | ✅ Yes |
| **Blocking** | ❌ No (non-blocking) | ✅ Yes (blocks) |
| **Performance** | 🚀 Faster | 🐢 Slower |
| **Use Case** | Flags, simple state | Critical sections |

---

## 3. Happens-Before Relationship

**What is it?** A guarantee that if action A "happens-before" action B, then A's effects are visible to B.

### Key Happens-Before Rules

```java
// Rule 1: Within same thread, program order is preserved
int x = 1;      // A
int y = x + 1;  // B  (A happens-before B)

// Rule 2: Unlock happens-before subsequent lock
synchronized (lock) {
    x = 1;  // A
}           // Unlock
// ... later ...
synchronized (lock) {  // Lock
    print(x);  // B  (A happens-before B)
}

// Rule 3: volatile write happens-before subsequent volatile read
volatile boolean flag;
x = 42;          // A
flag = true;     // B (volatile write)
// ... Thread 2 ...
if (flag) {      // C (volatile read)
    print(x);    // D - guaranteed to see 42!
}                // B happens-before C, which means A is visible at D

// Rule 4: Thread start happens-before any action in started thread
x = 1;                // A
thread.start();       // B
// In thread: 
// x is guaranteed to be 1 (A happens-before)

// Rule 5: Thread join happens-before after action in joining thread
// In thread:
x = 1;               // A
// After thread.join():
print(x);            // B - guaranteed to see 1
```

---

## 4. Double-Checked Locking (DCL)

**The Problem:** Creating singleton lazily with thread safety

### ❌ Broken Double-Checked Locking

```java
// ❌ BROKEN (without volatile)
public class Singleton {
    private static Singleton instance;  // NOT volatile!
    
    public static Singleton getInstance() {
        if (instance == null) {           // Check 1
            synchronized (Singleton.class) {
                if (instance == null) {   // Check 2
                    instance = new Singleton();  // PROBLEM!
                }
            }
        }
        return instance;
    }
}
```

**Why is it broken?**
`instance = new Singleton()` is actually 3 steps:
1. Allocate memory
2. Call constructor (initialize fields)
3. Assign reference to `instance`

CPU can reorder steps 2 and 3:
1. Allocate memory
2. Assign reference to `instance`  ← Another thread sees non-null instance!
3. Call constructor (not done yet!)

Thread 2 might see a **partially constructed object**!

### ✅ Fixed Double-Checked Locking

```java
// ✅ CORRECT (with volatile)
public class Singleton {
    private static volatile Singleton instance;  // volatile prevents reordering!
    
    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) {
                    instance = new Singleton();  // Now safe!
                }
            }
        }
        return instance;
    }
}
```

### ✅ Better Alternative: Initialization-on-demand Holder

```java
// ✅ BEST: No synchronization needed!
public class Singleton {
    private Singleton() {}
    
    private static class Holder {
        static final Singleton INSTANCE = new Singleton();
    }
    
    public static Singleton getInstance() {
        return Holder.INSTANCE;  // Class loading is thread-safe!
    }
}
```

---

## 5. Atomic Classes (Lock-Free Programming)

:::tip Key Concept
Atomic classes use **CAS (Compare-And-Swap)** operations which are implemented at the hardware level, making them faster than synchronized blocks.
:::

### 5.1 What is CAS (Compare-And-Swap)?

**Simple Explanation:** 
"I think the value is X. If it really is X, change it to Y. If not, tell me it failed."

**The CAS Algorithm:**
```java
// Pseudo-code for CAS
boolean compareAndSwap(expectedValue, newValue) {
    if (currentValue == expectedValue) {
        currentValue = newValue;
        return true;   // Success!
    } else {
        return false;  // Failed, try again
    }
}
```

This entire operation is **atomic at the CPU level** (single instruction: `cmpxchg`).

### 5.2 AtomicInteger Example

```java
import java.util.concurrent.atomic.AtomicInteger;

public class AtomicExample {
    private AtomicInteger count = new AtomicInteger(0);
    
    public void increment() {
        count.incrementAndGet();  // Thread-safe!
        // Internally: while(!CAS(current, current+1)) retry;
    }
    
    public int get() {
        return count.get();
    }
}
```

### AtomicInteger Methods

```java
AtomicInteger counter = new AtomicInteger(0);

// Basic operations
counter.get();                   // Read value
counter.set(10);                 // Write value
counter.incrementAndGet();       // ++counter (returns new value)
counter.getAndIncrement();       // counter++ (returns old value)
counter.decrementAndGet();       // --counter
counter.addAndGet(5);            // counter += 5
counter.getAndAdd(5);            // old = counter; counter += 5; return old

// CAS operations
counter.compareAndSet(10, 20);   // If value==10, set to 20
counter.updateAndGet(x -> x * 2); // Apply function atomically

// Get and update
counter.getAndUpdate(x -> x * 2); // Returns old value
```

### 5.3 Other Atomic Classes

```java
// Reference atomics
AtomicReference<User> userRef = new AtomicReference<>();
userRef.compareAndSet(oldUser, newUser);

// Array atomics
AtomicIntegerArray array = new AtomicIntegerArray(10);
array.incrementAndGet(5);  // Increment index 5 atomically

// Field updaters (for existing classes)
AtomicIntegerFieldUpdater<MyClass> updater = 
    AtomicIntegerFieldUpdater.newUpdater(MyClass.class, "count");
updater.incrementAndGet(myObject);

// LongAdder (better for high contention)
LongAdder adder = new LongAdder();
adder.increment();  // No return value, but faster!
long total = adder.sum();
```

### When to Use Which?

| Class | Use Case | Contention |
|-------|----------|------------|
| AtomicInteger | General counters | Low-Medium |
| AtomicLong | Large counters | Low-Medium |
| LongAdder | Very high contention counters | High |
| AtomicReference | Atomic object reference | Any |
| AtomicStampedReference | Solving ABA problem | When ABA matters |

---

## 6. AQS (AbstractQueuedSynchronizer)

:::info Advanced Topic
AQS is the **foundation** for most Java concurrency utilities. Understanding it helps you understand ReentrantLock, Semaphore, CountDownLatch, etc.
:::

### What is AQS?

AQS is a framework for building **locks and synchronizers**. It provides:
1. **State management** (an `int` representing lock state)
2. **Thread queue** (FIFO queue for waiting threads)
3. **Blocking/unblocking** mechanisms

### How AQS Works

```
┌──────────────────────────────────────────────────────────────────┐
│                    AQS STRUCTURE                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌─────────────────────────────────────────────────────────────┐│
│   │                  STATE (int)                                ││
│   │   0 = unlocked    1 = locked    >1 = reentrant count       ││
│   └─────────────────────────────────────────────────────────────┘│
│                                                                   │
│   ┌─────────────────────────────────────────────────────────────┐│
│   │              WAIT QUEUE (FIFO)                              ││
│   │                                                             ││
│   │   HEAD ──→ Thread 1 ──→ Thread 2 ──→ Thread 3 ──→ TAIL    ││
│   │           (waiting)    (waiting)    (waiting)              ││
│   │                                                             ││
│   │   Threads park() here until signaled                       ││
│   └─────────────────────────────────────────────────────────────┘│
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### AQS-Based Synchronizers

| Synchronizer | State Meaning | Use Case |
|--------------|---------------|----------|
| ReentrantLock | 0=unlocked, 1+=locked+reentrant | Mutual exclusion |
| Semaphore | Available permits | Rate limiting, resource pools |
| CountDownLatch | Count remaining | Wait for N events |
| ReentrantReadWriteLock | Complex (readers+writer) | Read-heavy workloads |
| CyclicBarrier | Parties waiting | Parallel computation phases |

---

## 7. ReentrantLock vs synchronized

### ReentrantLock Example

```java
import java.util.concurrent.locks.ReentrantLock;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.TimeUnit;

public class LockExample {
    private final Lock lock = new ReentrantLock();
    private int count = 0;
    
    public void increment() {
        lock.lock();  // Acquire lock
        try {
            count++;
        } finally {
            lock.unlock();  // MUST be in finally!
        }
    }
    
    // With timeout
    public boolean tryIncrement() throws InterruptedException {
        if (lock.tryLock(1, TimeUnit.SECONDS)) {  // Wait up to 1 sec
            try {
                count++;
                return true;
            } finally {
                lock.unlock();
            }
        }
        return false;  // Couldn't acquire lock
    }
    
    // Interruptible
    public void incrementInterruptible() throws InterruptedException {
        lock.lockInterruptibly();  // Can be interrupted while waiting!
        try {
            count++;
        } finally {
            lock.unlock();
        }
    }
}
```

### Feature Comparison

| Feature | synchronized | ReentrantLock |
|---------|--------------|---------------|
| **Syntax** | Keyword (simple) | Object (verbose) |
| **Fairness** | No (random) | Yes (optional) |
| **Timeout** | No | Yes (`tryLock(timeout)`) |
| **Interruptible** | No | Yes (`lockInterruptibly()`) |
| **Multiple Conditions** | No (one wait set) | Yes (`newCondition()`) |
| **Non-block attempt** | No | Yes (`tryLock()`) |
| **Performance** | Similar | Similar |
| **Auto-unlock** | Yes (on exit) | No (manual in finally) |

### When to Use Which?

```java
// Use synchronized when:
// - Simple critical section
// - No need for advanced features
synchronized (lock) {
    simpleOperation();
}

// Use ReentrantLock when:
// - Need timeout or interruptibility
// - Need fairness
// - Need multiple conditions
// - Need tryLock() for non-blocking attempt
Lock lock = new ReentrantLock(true);  // fair=true
if (lock.tryLock(100, TimeUnit.MILLISECONDS)) {
    try {
        complexOperation();
    } finally {
        lock.unlock();
    }
}
```

---

## 8. Semaphore

**Purpose:** Controls access to a limited number of resources (permits).

### Example: Connection Pool

```java
import java.util.concurrent.Semaphore;

public class ConnectionPool {
    private final Semaphore semaphore;
    private final Connection[] connections;
    
    public ConnectionPool(int poolSize) {
        this.semaphore = new Semaphore(poolSize);
        this.connections = new Connection[poolSize];
        // Initialize connections...
    }
    
    public Connection acquire() throws InterruptedException {
        semaphore.acquire();  // Block if no permits available
        return getNextAvailable();
    }
    
    public void release(Connection conn) {
        releaseConnection(conn);
        semaphore.release();  // Return permit
    }
}

// Usage
ConnectionPool pool = new ConnectionPool(10);
Connection conn = pool.acquire();  // Blocks if all 10 in use
try {
    // Use connection
} finally {
    pool.release(conn);  // Return to pool
}
```

### Semaphore Methods

```java
Semaphore sem = new Semaphore(10);  // 10 permits

sem.acquire();           // Block until permit available
sem.acquire(3);          // Acquire 3 permits
sem.tryAcquire();        // Non-blocking, returns boolean
sem.tryAcquire(1, TimeUnit.SECONDS);  // With timeout

sem.release();           // Release 1 permit
sem.release(3);          // Release 3 permits

sem.availablePermits();  // How many permits left?
```

---

## 9. ForkJoinPool and Parallel Streams

### 9.1 ForkJoinPool

**Purpose:** Efficiently parallelize divide-and-conquer algorithms.

**Key Concept: Work Stealing**
- Each thread has its own deque (double-ended queue)
- Idle threads "steal" work from busy threads' deques
- Very efficient for unbalanced workloads

```java
import java.util.concurrent.RecursiveTask;
import java.util.concurrent.ForkJoinPool;

public class ParallelSum extends RecursiveTask<Long> {
    private static final int THRESHOLD = 10000;
    private final long[] array;
    private final int start, end;
    
    public ParallelSum(long[] array, int start, int end) {
        this.array = array;
        this.start = start;
        this.end = end;
    }
    
    @Override
    protected Long compute() {
        int length = end - start;
        
        // Base case: small enough, compute directly
        if (length <= THRESHOLD) {
            long sum = 0;
            for (int i = start; i < end; i++) {
                sum += array[i];
            }
            return sum;
        }
        
        // Split into two tasks
        int middle = start + length / 2;
        ParallelSum left = new ParallelSum(array, start, middle);
        ParallelSum right = new ParallelSum(array, middle, end);
        
        left.fork();  // Run left asynchronously
        long rightResult = right.compute();  // Compute right in this thread
        long leftResult = left.join();  // Wait for left
        
        return leftResult + rightResult;
    }
}

// Usage
long[] array = new long[10_000_000];
ForkJoinPool pool = ForkJoinPool.commonPool();
long sum = pool.invoke(new ParallelSum(array, 0, array.length));
```

### 9.2 Parallel Streams

**Simple parallel processing using Stream API:**

```java
import java.util.stream.LongStream;

// Sequential sum
long sum1 = LongStream.rangeClosed(1, 10_000_000)
    .reduce(0, Long::sum);

// Parallel sum (uses ForkJoinPool.commonPool())
long sum2 = LongStream.rangeClosed(1, 10_000_000)
    .parallel()  // Magic word!
    .reduce(0, Long::sum);

// Parallel collection processing
List<User> users = loadUsers();
List<String> names = users.parallelStream()
    .filter(u -> u.getAge() > 18)
    .map(User::getName)
    .collect(Collectors.toList());
```

### When to Use Parallel Streams?

| Scenario | Parallel? | Why |
|----------|-----------|-----|
| Small collection (less than 10K elements) | ❌ No | Overhead outweighs benefit |
| CPU-bound operations | ✅ Yes | Utilizes multiple cores |
| I/O-bound operations | ❌ No | Blocks ForkJoinPool threads |
| Order matters | ⚠️ Careful | Use `forEachOrdered()` |
| Stateful operations | ❌ No | Can cause race conditions |

```java
// ❌ DON'T: I/O in parallel stream
users.parallelStream()
    .forEach(u -> saveToDatabase(u));  // Blocks threads!

// ✅ DO: CPU-intensive work
numbers.parallelStream()
    .map(n -> expensiveComputation(n))
    .collect(Collectors.toList());
```

---

## 10. Common Concurrency Bugs

### 10.1 Race Condition

```java
// ❌ Bug: Check-then-act race condition
public void withdraw(int amount) {
    if (balance >= amount) {    // Check
        // Another thread might withdraw here!
        balance -= amount;      // Act
    }
}

// ✅ Fix: Make it atomic
public synchronized void withdraw(int amount) {
    if (balance >= amount) {
        balance -= amount;
    }
}
```

### 10.2 Deadlock

```java
// ❌ Bug: Deadlock
// Thread 1: locks A, then tries to lock B
// Thread 2: locks B, then tries to lock A
public void method1() {
    synchronized (lockA) {
        synchronized (lockB) { ... }
    }
}

public void method2() {
    synchronized (lockB) {
        synchronized (lockA) { ... }  // DEADLOCK!
    }
}

// ✅ Fix: Always lock in same order
public void method1() {
    synchronized (lockA) {
        synchronized (lockB) { ... }
    }
}

public void method2() {
    synchronized (lockA) {  // Same order as method1
        synchronized (lockB) { ... }
    }
}
```

### 10.3 Livelock

**What is it?** Threads keep changing state in response to each other, but none makes progress.

```java
// Example: Two people in a hallway
// Both step left to avoid, then both step right, forever...
```

---

## 11. Top Interview Questions

### Q1: What's the difference between `volatile` and `synchronized`?

**Answer:**
- `volatile`: Provides **visibility** only. Ensures reads/writes go to main memory. Does NOT provide atomicity.
- `synchronized`: Provides **visibility + atomicity + ordering**. Blocks other threads.

Use `volatile` for simple flags; use `synchronized` for compound operations.

### Q2: Why is `count++` not thread-safe even with volatile?

**Answer:** Because `count++` is three operations:
1. Read current value
2. Add 1
3. Write new value

`volatile` only ensures each individual read/write is visible, but doesn't prevent another thread from reading between steps 1 and 3.

### Q3: What is a happens-before relationship?

**Answer:** It's a guarantee that if action A "happens-before" action B, then all memory effects of A are visible to B. JMM defines several happens-before rules:
- Unlock happens-before subsequent lock
- Volatile write happens-before subsequent volatile read
- Thread.start() happens-before any action in the new thread
- Thread.join() returns happens-before any action after it

### Q4: Explain CAS and its problems.

**Answer:** 
**CAS (Compare-And-Swap):** "If value equals expected, update to new value, atomically."

**Problems:**
1. **ABA Problem:** Value changes A→B→A. CAS thinks nothing changed.
   - Fix: Use `AtomicStampedReference` (adds version stamp)
2. **Spin overhead:** Under high contention, threads keep retrying.
   - Fix: Use `LongAdder` for high-contention counters
3. **Can only update ONE variable atomically**
   - Fix: Combine into single object, use `AtomicReference`

### Q5: What is the ABA problem?

**Answer:**
1. Thread 1 reads value A, gets interrupted
2. Thread 2 changes A → B → A
3. Thread 1 wakes up, sees A, thinks nothing changed!
4. CAS succeeds, but the world has changed around it!

```java
// Example: Linked list pop operation
// Thread 1: pop() reads head=A
// Thread 2: pop() removes A, pop() removes B, push(A) 
// Thread 1: CAS(A, B) succeeds, but B was already removed!
```

**Fix:** Use `AtomicStampedReference` with a version counter.

### Q6: When would you use ReentrantLock over synchronized?

**Answer:**
1. **Timeout:** Need to wait for lock only for limited time
2. **Interruptibility:** Need to cancel waiting for lock
3. **Fairness:** Need FIFO ordering of waiting threads
4. **Multiple conditions:** Need separate wait/notify queues
5. **Try-lock:** Need non-blocking lock attempt

---

## Quick Reference Card

```
┌──────────────────────────────────────────────────────────────────┐
│                  CONCURRENCY CHEAT SHEET                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ PROBLEMS:                                                        │
│ ├── Visibility   → Use volatile or synchronized                 │
│ ├── Atomicity    → Use synchronized or AtomicXxx                │
│ └── Ordering     → Use volatile or synchronized                 │
│                                                                  │
│ SOLUTIONS:                                                       │
│ ├── volatile     → Visibility only, for flags                   │
│ ├── synchronized → Visibility + Atomicity, mutual exclusion     │
│ ├── AtomicInteger→ Lock-free counter using CAS                  │
│ ├── ReentrantLock→ Advanced locking (timeout, fairness)         │
│ └── Semaphore    → Limited resource access (permits)            │
│                                                                  │
│ RULES OF THUMB:                                                  │
│ ├── count++      → ❌ Not safe → Use AtomicInteger              │
│ ├── flag = true  → ✅ Safe with volatile                        │
│ ├── if-then-act  → ❌ Not safe → Use synchronized               │
│ └── object.x=y   → ❌ Not safe → Use synchronized               │
│                                                                  │
│ DEADLOCK PREVENTION:                                             │
│ ├── Lock in consistent order                                    │
│ ├── Use tryLock with timeout                                    │
│ └── Avoid nested locks when possible                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```
