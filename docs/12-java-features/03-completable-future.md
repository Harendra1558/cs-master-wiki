---
title: 3. CompletableFuture
sidebar_position: 3
description: Master asynchronous programming with CompletableFuture for backend interviews.
keywords: [completablefuture, async, java, concurrent, future, thenApply, thenCompose]
---

# CompletableFuture

:::info Interview Essential
CompletableFuture is Java's primary tool for **asynchronous programming**. Questions on chaining, combining, and exception handling are common in senior backend interviews.
:::

## 1. Why CompletableFuture?

### The Problem with Future

```java
// Old Future API (Java 5) - Limited and blocking
ExecutorService executor = Executors.newFixedThreadPool(10);

Future<String> future = executor.submit(() -> {
    Thread.sleep(1000);
    return "Result";
});

// ❌ Must block to get result
String result = future.get();  // Blocks thread!

// ❌ Can't chain operations
// ❌ Can't combine multiple futures easily
// ❌ No exception callback
```

### CompletableFuture Solution

```java
// ✅ Non-blocking, chainable, composable
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    return fetchDataFromAPI();
})
.thenApply(data -> processData(data))        // Chain transformation
.thenApply(processed -> formatResult(processed))
.exceptionally(ex -> "Default on error");     // Handle exceptions

// Non-blocking consumption
future.thenAccept(result -> System.out.println(result));
```

---

## 2. Creating CompletableFutures

### Starting Async Tasks

```java
// supplyAsync - Returns a value
CompletableFuture<String> cf1 = CompletableFuture.supplyAsync(() -> {
    // Runs in ForkJoinPool.commonPool()
    return "Hello";
});

// runAsync - No return value
CompletableFuture<Void> cf2 = CompletableFuture.runAsync(() -> {
    System.out.println("Side effect");
});

// With custom executor (recommended for I/O)
ExecutorService ioExecutor = Executors.newFixedThreadPool(20);

CompletableFuture<String> cf3 = CompletableFuture.supplyAsync(() -> {
    return callExternalAPI();
}, ioExecutor);

// Pre-completed future
CompletableFuture<String> completed = CompletableFuture.completedFuture("Already done");

// Manually completed future
CompletableFuture<String> manual = new CompletableFuture<>();
// Later...
manual.complete("Done!");
// Or on failure:
manual.completeExceptionally(new RuntimeException("Failed"));
```

### Why Use Custom Executor?

```text
┌─────────────────────────────────────────────────────────────────────┐
│              EXECUTOR CHOICE MATTERS                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ForkJoinPool.commonPool() (default):                               │
│  ├── Size = CPU cores - 1                                           │
│  ├── Good for CPU-bound tasks                                       │
│  ├── Shared across application                                      │
│  └── ⚠️ BAD for I/O (blocking uses up limited threads)              │
│                                                                      │
│  Custom thread pool:                                                 │
│  ├── Control size based on workload                                 │
│  ├── For I/O: larger pool (20-50+ threads)                          │
│  ├── For CPU: ~CPU cores                                            │
│  └── Isolation from other operations                                │
│                                                                      │
│  Virtual Threads (Java 21+):                                         │
│  ├── Perfect for I/O-bound async                                    │
│  ├── Millions of concurrent tasks                                   │
│  └── See Java 21 chapter                                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Chaining Operations

### thenApply - Transform Result

```java
// Synchronous transformation (runs in same or calling thread)
CompletableFuture<Integer> lengthFuture = CompletableFuture
    .supplyAsync(() -> "Hello World")
    .thenApply(s -> s.toUpperCase())    // "HELLO WORLD"
    .thenApply(s -> s.length());         // 11

// Async transformation (runs in executor)
CompletableFuture<Integer> asyncLength = CompletableFuture
    .supplyAsync(() -> "Hello World")
    .thenApplyAsync(s -> s.toUpperCase())
    .thenApplyAsync(s -> s.length(), customExecutor);
```

### thenCompose - Flatten Nested Futures

```java
// ❌ thenApply creates nested CompletableFuture
CompletableFuture<CompletableFuture<Order>> nested = 
    getUserAsync(userId)
    .thenApply(user -> getOrderAsync(user));  // Returns CF<CF<Order>>

// ✅ thenCompose flattens (like flatMap)
CompletableFuture<Order> flat = 
    getUserAsync(userId)
    .thenCompose(user -> getOrderAsync(user));  // Returns CF<Order>

// Real-world example: Sequential async calls
public CompletableFuture<OrderDetails> getOrderDetails(Long orderId) {
    return getOrderAsync(orderId)
        .thenCompose(order -> getUserAsync(order.getUserId())
            .thenCompose(user -> getPaymentAsync(order.getPaymentId())
                .thenApply(payment -> new OrderDetails(order, user, payment))
            )
        );
}
```

### thenAccept / thenRun - Consume Without Returning

```java
// thenAccept - Consume the result
CompletableFuture<Void> processed = fetchData()
    .thenAccept(data -> {
        log.info("Received: {}", data);
        saveToCache(data);
    });

// thenRun - Just run something (ignores result)
CompletableFuture<Void> completed = fetchData()
    .thenRun(() -> log.info("Fetch complete"));
```

---

## 4. Combining Multiple Futures

### thenCombine - Combine Two Independent Futures

```java
CompletableFuture<User> userFuture = fetchUserAsync(userId);
CompletableFuture<List<Order>> ordersFuture = fetchOrdersAsync(userId);

// Run in parallel, combine when both complete
CompletableFuture<UserDashboard> dashboardFuture = userFuture
    .thenCombine(ordersFuture, (user, orders) -> {
        return new UserDashboard(user, orders);
    });

// thenAcceptBoth - consume both, no return
userFuture.thenAcceptBoth(ordersFuture, (user, orders) -> {
    sendEmail(user, orders);
});

// runAfterBoth - run when both complete
userFuture.runAfterBoth(ordersFuture, () -> {
    log.info("Both fetched");
});
```

### allOf - Wait for All Futures

```java
List<Long> userIds = List.of(1L, 2L, 3L, 4L, 5L);

// Create futures for all users
List<CompletableFuture<User>> futures = userIds.stream()
    .map(id -> fetchUserAsync(id))
    .collect(Collectors.toList());

// Wait for all to complete
CompletableFuture<Void> allFutures = CompletableFuture.allOf(
    futures.toArray(new CompletableFuture[0])
);

// Get all results
CompletableFuture<List<User>> allUsers = allFutures.thenApply(v -> 
    futures.stream()
        .map(CompletableFuture::join)  // Safe - already complete
        .collect(Collectors.toList())
);

// Or with a helper method
public <T> CompletableFuture<List<T>> allOf(List<CompletableFuture<T>> futures) {
    return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
        .thenApply(v -> futures.stream()
            .map(CompletableFuture::join)
            .collect(Collectors.toList()));
}
```

### anyOf - First to Complete

```java
CompletableFuture<String> primary = callPrimaryService();
CompletableFuture<String> fallback = callFallbackService();

// Use first response (racing pattern)
CompletableFuture<Object> first = CompletableFuture.anyOf(primary, fallback);

first.thenAccept(result -> {
    System.out.println("First result: " + result);
});
```

---

## 5. Exception Handling

### exceptionally - Recovery

```java
CompletableFuture<String> result = fetchData()
    .exceptionally(ex -> {
        log.error("Failed to fetch: {}", ex.getMessage());
        return "Default Value";  // Recovery value
    });

// Chained exception handling
CompletableFuture<Data> data = fetchFromPrimary()
    .exceptionally(ex -> {
        log.warn("Primary failed, trying fallback");
        return null;
    })
    .thenCompose(primary -> primary != null 
        ? CompletableFuture.completedFuture(primary)
        : fetchFromFallback());
```

### handle - Transform Both Success and Failure

```java
CompletableFuture<Result> result = fetchData()
    .handle((data, ex) -> {
        if (ex != null) {
            log.error("Error: {}", ex.getMessage());
            return Result.error(ex.getMessage());
        }
        return Result.success(data);
    });

// Can also rethrow
CompletableFuture<String> validated = fetchData()
    .handle((data, ex) -> {
        if (ex != null) {
            throw new CompletionException(new ServiceException("Fetch failed", ex));
        }
        if (data == null) {
            throw new CompletionException(new ValidationException("Empty data"));
        }
        return data;
    });
```

### whenComplete - Side Effects (No Transform)

```java
CompletableFuture<String> result = fetchData()
    .whenComplete((data, ex) -> {
        if (ex != null) {
            log.error("Operation failed", ex);
            metrics.increment("fetch.failure");
        } else {
            log.info("Success: {}", data);
            metrics.increment("fetch.success");
        }
    });
// Original exception still propagates!
```

### Exception Propagation

```text
┌─────────────────────────────────────────────────────────────────────┐
│            EXCEPTION PROPAGATION IN CHAINS                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  supplyAsync(() -> "data")                                          │
│       │                                                              │
│       ▼                                                              │
│  .thenApply(d -> process(d))    ◄── If exception here               │
│       │                              ↓                               │
│       ▼                          Skipped!                            │
│  .thenApply(d -> format(d))     ◄── Also skipped                    │
│       │                              ↓                               │
│       ▼                          Executed!                           │
│  .exceptionally(ex -> default)  ◄── Exception caught here           │
│       │                                                              │
│       ▼                                                              │
│  .thenApply(d -> finalize(d))   ◄── Continues with default          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Timeouts & Cancellation

### Timeouts (Java 9+)

```java
// Timeout with default value
CompletableFuture<String> result = fetchData()
    .completeOnTimeout("Default", 5, TimeUnit.SECONDS);

// Timeout with exception
CompletableFuture<String> result = fetchData()
    .orTimeout(5, TimeUnit.SECONDS)
    .exceptionally(ex -> {
        if (ex.getCause() instanceof TimeoutException) {
            return "Timeout fallback";
        }
        throw new CompletionException(ex);
    });

// Java 8 workaround
public <T> CompletableFuture<T> withTimeout(CompletableFuture<T> future, 
                                             long timeout, TimeUnit unit) {
    CompletableFuture<T> timeoutFuture = new CompletableFuture<>();
    
    ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
    scheduler.schedule(() -> {
        timeoutFuture.completeExceptionally(new TimeoutException());
    }, timeout, unit);
    
    return future.applyToEither(timeoutFuture, Function.identity());
}
```

### Cancellation

```java
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    // Long-running operation
    return heavyComputation();
});

// Cancel (may not interrupt running task)
boolean cancelled = future.cancel(true);

// Check if cancelled
if (future.isCancelled()) {
    log.info("Task was cancelled");
}

// Cancelled futures throw CancellationException on get/join
try {
    future.join();
} catch (CancellationException e) {
    // Handle cancellation
}
```

---

## 7. Real-World Patterns

### Parallel API Calls

```java
@Service
public class DashboardService {
    
    public CompletableFuture<Dashboard> getDashboard(Long userId) {
        CompletableFuture<User> userFuture = userService.getAsync(userId);
        CompletableFuture<List<Order>> ordersFuture = orderService.getByUserAsync(userId);
        CompletableFuture<List<Notification>> notifsFuture = notificationService.getAsync(userId);
        CompletableFuture<Balance> balanceFuture = paymentService.getBalanceAsync(userId);
        
        return CompletableFuture.allOf(userFuture, ordersFuture, notifsFuture, balanceFuture)
            .thenApply(v -> Dashboard.builder()
                .user(userFuture.join())
                .orders(ordersFuture.join())
                .notifications(notifsFuture.join())
                .balance(balanceFuture.join())
                .build()
            )
            .orTimeout(10, TimeUnit.SECONDS)
            .exceptionally(ex -> Dashboard.error("Failed to load dashboard"));
    }
}
```

### Retry Pattern

```java
public <T> CompletableFuture<T> withRetry(Supplier<CompletableFuture<T>> operation,
                                           int maxRetries,
                                           Duration delay) {
    return operation.get()
        .handle((result, ex) -> {
            if (ex == null) {
                return CompletableFuture.completedFuture(result);
            }
            if (maxRetries <= 0) {
                return CompletableFuture.<T>failedFuture(ex);
            }
            
            log.warn("Retry {} remaining, error: {}", maxRetries, ex.getMessage());
            
            return CompletableFuture
                .delayedExecutor(delay.toMillis(), TimeUnit.MILLISECONDS)
                .execute(() -> {});  // Wait
            
            return withRetry(operation, maxRetries - 1, delay);
        })
        .thenCompose(Function.identity());
}

// Usage
CompletableFuture<String> result = withRetry(
    () -> externalService.callAsync(),
    3,
    Duration.ofSeconds(1)
);
```

### Circuit Breaker Pattern

```java
public class AsyncCircuitBreaker {
    private final AtomicInteger failures = new AtomicInteger(0);
    private volatile Instant openedAt = null;
    private final int threshold = 5;
    private final Duration resetTimeout = Duration.ofSeconds(30);
    
    public <T> CompletableFuture<T> execute(Supplier<CompletableFuture<T>> operation,
                                             Supplier<T> fallback) {
        if (isOpen()) {
            log.warn("Circuit breaker is OPEN, using fallback");
            return CompletableFuture.completedFuture(fallback.get());
        }
        
        return operation.get()
            .handle((result, ex) -> {
                if (ex != null) {
                    recordFailure();
                    return fallback.get();
                }
                recordSuccess();
                return result;
            });
    }
    
    private boolean isOpen() {
        if (openedAt == null) return false;
        if (Instant.now().isAfter(openedAt.plus(resetTimeout))) {
            openedAt = null;  // Half-open
            return false;
        }
        return true;
    }
    
    private void recordFailure() {
        if (failures.incrementAndGet() >= threshold) {
            openedAt = Instant.now();
            log.error("Circuit breaker OPENED");
        }
    }
    
    private void recordSuccess() {
        failures.set(0);
    }
}
```

---

## 8. Interview Questions

### Q1: What's the difference between thenApply and thenCompose?

```text
Answer:
"Both transform the result, but:

thenApply: Synchronous transformation
- Input: T, Output: R
- Returns: CompletableFuture<R>
- For simple transformations

thenCompose: Async transformation (like flatMap)
- Input: T, Output: CompletableFuture<R>  
- Returns: CompletableFuture<R> (flattened)
- For chaining async operations

Example:
cf.thenApply(s -> s.toUpperCase())  // CF<String>
cf.thenApply(s -> fetchAsync(s))    // CF<CF<String>> ❌
cf.thenCompose(s -> fetchAsync(s))  // CF<String> ✅"
```

### Q2: How do you handle exceptions in CompletableFuture?

```text
Answer:
"Three methods:

1. exceptionally(Function<Throwable, T>)
   - Recover with default value
   - Only called on exception
   - Can't access success case

2. handle(BiFunction<T, Throwable, U>)
   - Called for both success and failure
   - Can transform result
   - Can change type

3. whenComplete(BiConsumer<T, Throwable>)
   - Side effects only (logging, metrics)
   - Can't transform result
   - Exception still propagates

Best practice: Use handle when you need to 
transform both cases, exceptionally for simple 
recovery, whenComplete for logging."
```

### Q3: Why shouldn't you use the common ForkJoinPool for I/O?

```text
Answer:
"ForkJoinPool.commonPool() has a fixed size 
of (CPU cores - 1). Problems with I/O:

1. I/O operations block threads
2. With 8 cores, only 7 concurrent I/O ops
3. If all threads blocked on I/O, app is stuck
4. Other async operations can't proceed

Solution:
- Use custom ExecutorService for I/O
- Size based on expected I/O concurrency (20-100)
- Or use Virtual Threads (Java 21+) - designed for I/O

Example:
ExecutorService ioExecutor = Executors.newFixedThreadPool(50);
CompletableFuture.supplyAsync(() -> httpClient.call(), ioExecutor);"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│              COMPLETABLEFUTURE CHEAT SHEET                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ CREATING:                                                             │
│   supplyAsync(() -> value)         Start async task with result     │
│   runAsync(() -> sideEffect)       Start async task, no result      │
│   completedFuture(value)           Already completed                │
│                                                                       │
│ TRANSFORMING:                                                         │
│   thenApply(T -> R)               Transform result (sync)           │
│   thenApplyAsync(T -> R)          Transform result (async)          │
│   thenCompose(T -> CF<R>)         Chain async calls (flatMap)       │
│                                                                       │
│ CONSUMING:                                                            │
│   thenAccept(T -> void)           Consume result                    │
│   thenRun(() -> void)             Run after complete                │
│                                                                       │
│ COMBINING:                                                            │
│   thenCombine(CF<U>, (T,U) -> R)  Combine two futures               │
│   allOf(CF<?>...)                  Wait for all                      │
│   anyOf(CF<?>...)                  First to complete                 │
│                                                                       │
│ EXCEPTION HANDLING:                                                   │
│   exceptionally(Throwable -> T)   Recover on error                  │
│   handle((T, ex) -> R)            Transform success/failure         │
│   whenComplete((T, ex) -> void)   Side effects on complete          │
│                                                                       │
│ TIMEOUTS (Java 9+):                                                   │
│   orTimeout(duration)              Exception on timeout             │
│   completeOnTimeout(default, dur)  Default on timeout               │
│                                                                       │
│ GETTING RESULT:                                                       │
│   join()                           Blocking (throws unchecked)      │
│   get()                            Blocking (throws checked)        │
│   getNow(default)                  Non-blocking                     │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Next:** [4. Java 9-17 Features →](./java-9-17-features)
