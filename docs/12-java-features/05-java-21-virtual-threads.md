---
title: 5. Java 21 & Virtual Threads
sidebar_position: 5
description: Master Java 21 features - Virtual Threads (Project Loom), Sequenced Collections, and Pattern Matching.
keywords: [java 21, virtual threads, project loom, sequenced collections, pattern matching]
---

# Java 21 & Virtual Threads

:::info Cutting Edge
Java 21 is the latest LTS. **Virtual Threads** are a game-changer for backend development, enabling millions of concurrent tasks. This is increasingly asked in senior interviews.
:::

## 1. Virtual Threads (Project Loom)

### The Problem: Thread-per-Request Model

```text
┌─────────────────────────────────────────────────────────────────────┐
│              TRADITIONAL THREADING MODEL                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Platform Thread = OS Thread                                        │
│  ├── Heavy: ~1MB stack size each                                    │
│  ├── Limited: ~thousands per machine                                │
│  ├── Expensive: Context switching overhead                          │
│  └── Problem: Most time spent WAITING (I/O)                         │
│                                                                      │
│  Thread-per-Request:                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│  │Thread 1 │  │Thread 2 │  │Thread 3 │  │Thread N │               │
│  │   ████  │  │   ██   │  │   ████  │  │   ██   │               │
│  │   ████  │  │   ██   │  │   ████  │  │   ██   │               │
│  │   ░░░░  │  │   ░░░░░│  │   ░░░░  │  │   ░░░░░│   ← BLOCKED   │
│  │   ░░░░  │  │   ░░░░░│  │   ░░░░  │  │   ░░░░░│     waiting   │
│  │   ████  │  │   ██   │  │   ████  │  │   ██   │     for I/O   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘               │
│                                                                      │
│  ████ = Actual work                                                  │
│  ░░░░ = Blocked (waiting for DB, HTTP, etc.)                        │
│                                                                      │
│  Result: 200 threads, but only 20 doing actual work!               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### The Solution: Virtual Threads

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    VIRTUAL THREADS                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Virtual Thread = Lightweight, JVM-managed                          │
│  ├── Cheap: ~few KB each (vs 1MB)                                   │
│  ├── Scalable: Millions per machine                                 │
│  ├── Automatic: JVM unmounts during I/O                             │
│  └── Benefit: Same code, massive concurrency                        │
│                                                                      │
│  How it works:                                                       │
│                                                                      │
│  ┌──── Carrier Thread (OS Thread) ────┐                             │
│  │  ┌─────┐  ┌─────┐  ┌─────┐        │                             │
│  │  │ VT1 │  │ VT2 │  │ VT3 │  ...   │  ← Virtual threads          │
│  │  └─────┘  └─────┘  └─────┘        │    mounted on carrier       │
│  └────────────────────────────────────┘                             │
│                                                                      │
│  When VT1 blocks on I/O:                                            │
│  1. VT1 is UNMOUNTED (stack saved to heap)                          │
│  2. Carrier thread picks up VT4                                     │
│  3. When I/O completes, VT1 is mounted again                        │
│                                                                      │
│  Carrier threads stay busy = massive throughput!                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Creating Virtual Threads

```java
// Method 1: Thread.startVirtualThread
Thread vt1 = Thread.startVirtualThread(() -> {
    System.out.println("Running in virtual thread: " + Thread.currentThread());
});

// Method 2: Thread.ofVirtual()
Thread vt2 = Thread.ofVirtual()
    .name("my-virtual-thread")
    .start(() -> {
        System.out.println("Named virtual thread");
    });

// Method 3: Virtual Thread Factory
ThreadFactory factory = Thread.ofVirtual()
    .name("worker-", 0)  // worker-0, worker-1, ...
    .factory();

Thread vt3 = factory.newThread(() -> doWork());
vt3.start();

// Method 4: ExecutorService (recommended for production)
try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
    
    // Submit 100,000 tasks - each gets its own virtual thread!
    List<Future<String>> futures = new ArrayList<>();
    for (int i = 0; i < 100_000; i++) {
        int taskId = i;
        futures.add(executor.submit(() -> processTask(taskId)));
    }
    
    // Collect results
    for (Future<String> future : futures) {
        System.out.println(future.get());
    }
    
}  // Auto-shutdown
```

### Virtual vs Platform Threads

```java
// Check thread type
Thread.currentThread().isVirtual();

// Platform thread (traditional)
Thread platformThread = Thread.ofPlatform()
    .name("platform-thread")
    .start(() -> doWork());

// Comparison
public static void main(String[] args) throws Exception {
    
    // Test with platform threads
    long platformTime = timeThreads(
        Executors.newFixedThreadPool(200),  // Limited to 200
        10_000
    );
    System.out.println("Platform threads: " + platformTime + "ms");
    
    // Test with virtual threads
    long virtualTime = timeThreads(
        Executors.newVirtualThreadPerTaskExecutor(),  // Unlimited!
        10_000
    );
    System.out.println("Virtual threads: " + virtualTime + "ms");
}

static long timeThreads(ExecutorService executor, int tasks) throws Exception {
    long start = System.currentTimeMillis();
    
    try (executor) {
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < tasks; i++) {
            futures.add(executor.submit(() -> {
                Thread.sleep(100);  // Simulate I/O
                return "done";
            }));
        }
        for (Future<?> f : futures) f.get();
    }
    
    return System.currentTimeMillis() - start;
}

// Results (10,000 tasks, 100ms each):
// Platform (200 threads): ~5000ms (limited parallelism)
// Virtual threads: ~200ms (10,000 concurrent!)
```

---

## 2. Best Practices for Virtual Threads

### DO: Use for I/O-Bound Work

```java
// ✅ Perfect for: HTTP calls, database queries, file I/O
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    
    List<CompletableFuture<User>> futures = userIds.stream()
        .map(id -> CompletableFuture.supplyAsync(() -> {
            return userRepository.findById(id);  // DB call
        }, executor))
        .toList();
    
    List<User> users = futures.stream()
        .map(CompletableFuture::join)
        .toList();
}

// ✅ HTTP client example
HttpClient client = HttpClient.newBuilder()
    .executor(Executors.newVirtualThreadPerTaskExecutor())
    .build();

// Each request gets a virtual thread
List<CompletableFuture<HttpResponse<String>>> responses = urls.stream()
    .map(url -> client.sendAsync(
        HttpRequest.newBuilder().uri(URI.create(url)).build(),
        HttpResponse.BodyHandlers.ofString()
    ))
    .toList();
```

### DON'T: Use for CPU-Bound Work

```java
// ❌ NOT a good fit: CPU-intensive computation
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    // Virtual threads don't help here - CPU is the bottleneck
    executor.submit(() -> computePi(1_000_000_000));
}

// ✅ Use platform threads for CPU work
try (var executor = Executors.newFixedThreadPool(Runtime.getRuntime().availableProcessors())) {
    executor.submit(() -> computePi(1_000_000_000));
}
```

### Avoid Pinning

```java
// Virtual threads can be "pinned" to carrier threads:

// ❌ synchronized blocks pin virtual threads
synchronized (lock) {
    // Virtual thread CANNOT be unmounted here
    Thread.sleep(1000);  // Blocks the carrier thread!
}

// ✅ Use ReentrantLock instead
private final ReentrantLock lock = new ReentrantLock();

lock.lock();
try {
    Thread.sleep(1000);  // Can be unmounted
} finally {
    lock.unlock();
}

// ⚠️ Native methods also cause pinning
// -Djdk.tracePinnedThreads=full to diagnose
```

### Thread Locals with Virtual Threads

```java
// ⚠️ Thread locals work, but be careful with millions of threads
private static final ThreadLocal<User> currentUser = new ThreadLocal<>();

// Problem: With 1 million virtual threads, that's 1 million ThreadLocal values!

// Solution: Use ScopedValue (Java 21 preview)
private static final ScopedValue<User> CURRENT_USER = ScopedValue.newInstance();

ScopedValue.runWhere(CURRENT_USER, authenticatedUser, () -> {
    // User is available within this scope
    processRequest();
});

private void processRequest() {
    User user = CURRENT_USER.get();  // Access scoped value
    // ...
}
```

---

## 3. Structured Concurrency (Preview)

```java
// Structured Concurrency - tasks have clear parent-child relationship
// Shutdown is automatic when scope closes

import java.util.concurrent.StructuredTaskScope;

public UserDetails fetchUserDetails(Long userId) throws Exception {
    
    try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
        
        // Fork subtasks - each runs in virtual thread
        Subtask<User> userTask = scope.fork(() -> userService.getById(userId));
        Subtask<List<Order>> ordersTask = scope.fork(() -> orderService.getByUserId(userId));
        Subtask<Balance> balanceTask = scope.fork(() -> paymentService.getBalance(userId));
        
        // Wait for all to complete (or first failure)
        scope.join();
        
        // Throw if any failed
        scope.throwIfFailed();
        
        // All succeeded - get results
        return new UserDetails(
            userTask.get(),
            ordersTask.get(),
            balanceTask.get()
        );
    }
    // If any task fails, others are cancelled automatically
}

// ShutdownOnSuccess - return first successful result
public String fetchFromAnySource() throws Exception {
    
    try (var scope = new StructuredTaskScope.ShutdownOnSuccess<String>()) {
        
        scope.fork(() -> fetchFromPrimary());
        scope.fork(() -> fetchFromSecondary());
        scope.fork(() -> fetchFromTertiary());
        
        scope.join();
        
        // Returns first successful result
        return scope.result();
    }
}
```

---

## 4. Sequenced Collections (Java 21)

### The Problem

```java
// Before Java 21: No common interface for "first/last" access
List<String> list = new ArrayList<>();
list.get(0);                    // First
list.get(list.size() - 1);      // Last

LinkedHashSet<String> set = new LinkedHashSet<>();
set.iterator().next();          // First
// Last? No easy way!

LinkedHashMap<String, Integer> map = new LinkedHashMap<>();
map.entrySet().iterator().next();  // First entry
// Last entry? Stream and reduce??
```

### The Solution: SequencedCollection

```java
// New interface hierarchy:
// SequencedCollection extends Collection
// SequencedSet extends SequencedCollection, Set
// SequencedMap (separate, for maps)

// SequencedCollection methods
SequencedCollection<String> seq = new ArrayList<>();
seq.addFirst("a");
seq.addLast("z");
String first = seq.getFirst();
String last = seq.getLast();
String removedFirst = seq.removeFirst();
String removedLast = seq.removeLast();
SequencedCollection<String> reversed = seq.reversed();

// Works with LinkedHashSet too
SequencedSet<String> seqSet = new LinkedHashSet<>();
seqSet.addFirst("first");
seqSet.getLast();
seqSet.reversed().forEach(System.out::println);

// SequencedMap
SequencedMap<String, Integer> seqMap = new LinkedHashMap<>();
seqMap.putFirst("a", 1);
seqMap.putLast("z", 26);
Map.Entry<String, Integer> firstEntry = seqMap.firstEntry();
Map.Entry<String, Integer> lastEntry = seqMap.lastEntry();
Map.Entry<String, Integer> polledFirst = seqMap.pollFirstEntry();
SequencedMap<String, Integer> reversedMap = seqMap.reversed();

// New method in Collections
List<String> reversedList = list.reversed();  // View, not copy
```

---

## 5. Enhanced Pattern Matching

### Pattern Matching for switch (Finalized in Java 21)

```java
// Type patterns
Object obj = "Hello";
String result = switch (obj) {
    case Integer i -> "Integer: " + i;
    case Long l -> "Long: " + l;
    case String s -> "String: " + s;
    case null -> "null!";
    default -> "Unknown type";
};

// Guarded patterns (when clause)
String describe(Object obj) {
    return switch (obj) {
        case String s when s.isEmpty() -> "Empty string";
        case String s when s.length() > 100 -> "Long string";
        case String s -> "String: " + s;
        case Integer i when i < 0 -> "Negative number";
        case Integer i when i == 0 -> "Zero";
        case Integer i -> "Positive number";
        case null -> "Null value";
        default -> "Something else";
    };
}

// Combining with sealed classes
sealed interface Animal permits Dog, Cat, Bird {}
record Dog(String name) implements Animal {}
record Cat(String name) implements Animal {}
record Bird(String name) implements Animal {}

String sound(Animal animal) {
    return switch (animal) {
        case Dog d -> d.name() + " says woof!";
        case Cat c -> c.name() + " says meow!";
        case Bird b -> b.name() + " says tweet!";
        // No default needed - exhaustive
    };
}
```

### Record Patterns

```java
record Point(int x, int y) {}
record Circle(Point center, int radius) {}
record Rectangle(Point topLeft, Point bottomRight) {}

// Nested record patterns - destructure deeply
String describe(Object shape) {
    return switch (shape) {
        case Circle(Point(var x, var y), var r) -> 
            "Circle at (%d,%d) radius %d".formatted(x, y, r);
        
        case Rectangle(Point(var x1, var y1), Point(var x2, var y2)) ->
            "Rectangle from (%d,%d) to (%d,%d)".formatted(x1, y1, x2, y2);
        
        default -> "Unknown shape";
    };
}

// In if statements
if (shape instanceof Circle(Point(var x, var y), var r)) {
    System.out.println("Circle center: " + x + ", " + y);
}

// With collections
record Order(String id, List<Item> items) {}
record Item(String sku, int quantity) {}

// Doesn't destructure collections, but can pattern match outer record
if (order instanceof Order(var id, var items) && !items.isEmpty()) {
    Item first = items.getFirst();
}
```

---

## 6. Other Java 21 Features

### String Templates (Preview)

```java
// String templates - safer than concatenation (Preview feature)
// Enable with: --enable-preview

String name = "John";
int age = 30;

// STR template processor
String message = STR."Hello, \{name}! You are \{age} years old.";
// "Hello, John! You are 30 years old."

// Expressions allowed
String calc = STR."2 + 2 = \{2 + 2}";

// Method calls
String upper = STR."Name: \{name.toUpperCase()}";

// Multi-line
String json = STR."""
    {
        "name": "\{name}",
        "age": \{age}
    }
    """;

// FMT processor for formatting
String formatted = FMT."Pi to 4 places: %.4f\{Math.PI}";
// "Pi to 4 places: 3.1416"
```

### Unnamed Patterns and Variables (Preview)

```java
// Unnamed variable _ (underscore)
// For when you don't need a variable

// Catch exceptions without naming
try {
    // ...
} catch (Exception _) {
    log.error("An error occurred");
}

// Loop variable not needed
for (int _ = 0; _ < 10; _++) {
    doSomething();
}

// Lambda parameter not used
map.forEach((k, _) -> System.out.println(k));

// Record pattern - ignore some components
if (point instanceof Point(var x, _)) {
    System.out.println("X coordinate: " + x);
}

// Switch - ignore value
switch (obj) {
    case String _ -> handleString();
    case Integer _ -> handleInteger();
    default -> handleOther();
}
```

---

## 7. Interview Questions

### Q1: What are Virtual Threads and when should you use them?

```text
Answer:
"Virtual threads are lightweight threads managed by the JVM, 
not the OS. They're part of Project Loom in Java 21.

KEY CHARACTERISTICS:
- Very lightweight (~few KB vs ~1MB for platform threads)
- Can have millions concurrently
- JVM automatically unmounts them during blocking I/O
- Carrier threads (platform threads) stay busy

WHEN TO USE:
✅ I/O-bound applications (web servers, microservices)
✅ High-concurrency scenarios (100k+ concurrent tasks)
✅ When threads spend most time waiting (DB, HTTP, file I/O)

WHEN NOT TO USE:
❌ CPU-bound computation (use platform threads)
❌ When synchronized blocks are unavoidable
❌ Heavy ThreadLocal usage

USAGE:
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    // Each task gets its own virtual thread
    executor.submit(() -> callDatabase());
}"
```

### Q2: What is thread pinning and how do you avoid it?

```text
Answer:
"Pinning occurs when a virtual thread cannot be unmounted 
from its carrier thread. This defeats the purpose of virtual threads.

CAUSES:
1. synchronized blocks/methods
2. Native method calls (JNI)

PROBLEM:
When pinned, the virtual thread blocks the carrier thread,
reducing the effective parallelism.

SOLUTION:
1. Use ReentrantLock instead of synchronized:
   
   // ❌ Pins virtual thread
   synchronized (lock) { ... }
   
   // ✅ Allows unmounting
   lock.lock();
   try { ... } finally { lock.unlock(); }

2. Diagnose with: -Djdk.tracePinnedThreads=full

3. Refactor code to minimize synchronized blocks"
```

### Q3: Explain Structured Concurrency

```text
Answer:
"Structured Concurrency treats concurrent tasks as a unit,
with clear start and end boundaries.

TRADITIONAL PROBLEMS:
- Tasks outlive their parent
- Leaked threads on exceptions
- Difficult cancellation

STRUCTURED CONCURRENCY:
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    var task1 = scope.fork(() -> fetchUser());
    var task2 = scope.fork(() -> fetchOrders());
    
    scope.join();           // Wait for all
    scope.throwIfFailed();  // Propagate errors
    
    return new Result(task1.get(), task2.get());
}

BENEFITS:
1. Automatic cleanup - scope closes, tasks complete
2. Error propagation - failure cancels siblings
3. Clear parent-child relationship
4. Thread dumps show logical hierarchy

It's like try-with-resources for concurrency."
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│                 JAVA 21 FEATURES CHEAT SHEET                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ VIRTUAL THREADS:                                                      │
│   Thread.startVirtualThread(() -> ...)    Quick start               │
│   Thread.ofVirtual().start(() -> ...)     Builder pattern           │
│   Executors.newVirtualThreadPerTaskExecutor()  Recommended          │
│   Thread.currentThread().isVirtual()      Check thread type         │
│                                                                       │
│ VIRTUAL THREAD RULES:                                                 │
│   ✅ I/O-bound work (HTTP, DB, files)                                │
│   ❌ CPU-bound work (use platform threads)                           │
│   ❌ synchronized (use ReentrantLock)                                 │
│   ❌ Heavy ThreadLocal (consider ScopedValue)                        │
│                                                                       │
│ SEQUENCED COLLECTIONS:                                                │
│   seq.getFirst() / seq.getLast()          Access ends               │
│   seq.addFirst(e) / seq.addLast(e)        Add at ends               │
│   seq.removeFirst() / seq.removeLast()    Remove from ends          │
│   seq.reversed()                          Reversed view             │
│                                                                       │
│ PATTERN MATCHING:                                                     │
│   case Type t -> ...                      Type pattern              │
│   case Type t when condition -> ...       Guarded pattern           │
│   case Record(var a, var b) -> ...        Record pattern            │
│   case null -> ...                        Null handling             │
│                                                                       │
│ STRUCTURED CONCURRENCY (Preview):                                     │
│   StructuredTaskScope.ShutdownOnFailure   Cancel on first failure   │
│   StructuredTaskScope.ShutdownOnSuccess   Return first success      │
│   scope.fork(() -> task)                  Start subtask             │
│   scope.join()                            Wait for all              │
│                                                                       │
│ STRING TEMPLATES (Preview):                                           │
│   STR."Hello \{name}!"                    String interpolation      │
│   FMT."Value: %.2f\{number}"              Formatted                 │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Back:** [4. Java 9-17 Features ←](./java-9-17-features)

**Next Section:** [13. Low Level Design (LLD) →](../13-lld/01-intro.md)
