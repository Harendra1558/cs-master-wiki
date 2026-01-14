---
title: 4. Async Processing & Thread Pools
sidebar_position: 4
description: Master @Async annotation, thread pool configuration, context propagation, and production pitfalls.
keywords: [spring async, thread pool, executor, async processing, completablefuture, context loss]
---

# Async Processing & Thread Pools

:::warning Production Issue
Thread pool exhaustion is the **#1 cause of async failures in production**. Understanding pool sizing and context loss is critical for 2-4 YOE developers!
:::

---

## 1. What is @Async?

### Simple Explanation

`@Async` tells Spring to **run a method in a separate thread** so the caller doesn't have to wait. It's like delegating a task to a coworker while you continue with other work.

### Why Does Spring Need This?

| Use Case | Without @Async | With @Async |
|----------|----------------|-------------|
| Send email after order | User waits for email to send | User sees success immediately |
| Generate report | Request times out | Runs in background |
| Process analytics | Slows down API | Doesn't affect response time |
| Call multiple APIs | Sequential calls | Parallel calls |

---

## 2. How @Async Works Internally

### The Mechanism

```text
1. You annotate method with @Async
        ↓
2. Spring creates a PROXY for your class
        ↓
3. Proxy intercepts the method call
        ↓
4. Proxy wraps your method in a Runnable/Callable
        ↓
5. Proxy submits to TaskExecutor (thread pool)
        ↓
6. Returns immediately (void or CompletableFuture)
        ↓
7. Worker thread executes your method later
```

### What Spring Creates

```java
// Your code
@Service
public class EmailService {
    @Async
    public void sendEmail(String to, String subject) {
        // Slow email sending logic
    }
}

// What Spring generates (conceptually)
public class EmailService$$EnhancerBySpringCGLIB extends EmailService {
    
    private TaskExecutor executor;
    
    @Override
    public void sendEmail(String to, String subject) {
        // Wrap in Runnable and submit to thread pool
        executor.execute(() -> {
            super.sendEmail(to, subject);  // Your actual code
        });
        // Returns immediately - doesn't wait!
    }
}
```

### Visual Flow

```text
Main Thread                    Worker Thread (from pool)
─────────────                  ─────────────────────────
orderController.create()
    │
    ├─→ orderService.save()
    │
    ├─→ emailService.sendEmail() ─→ Submitted to pool ─→ Actually sends email
    │       (returns immediately)                              (5 seconds later)
    │
    └─→ return response to client
         (user sees instant response)
```

---

## 3. Enabling @Async

### Basic Setup (DON'T USE IN PRODUCTION!)

```java
@Configuration
@EnableAsync
public class AsyncConfig {
    // Uses SimpleAsyncTaskExecutor by default
    // Creates NEW THREAD for every task - DANGEROUS!
}
```

### Production Setup (ALWAYS USE THIS)

```java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {
    
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        
        // Core threads always running
        executor.setCorePoolSize(10);
        
        // Max threads when queue is full
        executor.setMaxPoolSize(50);
        
        // Queue size before creating new threads
        executor.setQueueCapacity(500);
        
        // Thread naming for debugging
        executor.setThreadNamePrefix("Async-");
        
        // What to do when pool and queue are full
        executor.setRejectedExecutionHandler(new CallerRunsPolicy());
        
        // Keep extra threads alive for 60 seconds
        executor.setKeepAliveSeconds(60);
        
        // Wait for tasks to complete on shutdown
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        
        executor.initialize();
        return executor;
    }
    
    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (ex, method, params) -> {
            log.error("Async error in {}.{}: {}", 
                method.getDeclaringClass().getSimpleName(),
                method.getName(),
                ex.getMessage(),
                ex);
            // Alert, metrics, etc.
        };
    }
}
```

---

## 4. Default Executor Pitfalls

### SimpleAsyncTaskExecutor (The Default Danger)

```java
// Without custom executor, Spring uses SimpleAsyncTaskExecutor
// IT CREATES A NEW THREAD FOR EVERY TASK!

// If you have 1000 concurrent users, you get 1000 threads
// Each thread = ~1MB stack memory
// Result: OutOfMemoryError!
```

```text
Memory Impact:
─────────────────────────────────────────────────────
SimpleAsyncTaskExecutor with 1000 tasks:
1000 threads × 1MB = 1GB just for stacks!

ThreadPoolTaskExecutor with maxPoolSize=50:
50 threads × 1MB = 50MB (fixed, predictable)
```

### How to Detect

```java
@Component
public class AsyncDebugger implements ApplicationRunner {
    
    @Autowired
    private AsyncTaskExecutor executor;
    
    @Override
    public void run(ApplicationArguments args) {
        log.info("Async executor type: {}", executor.getClass().getName());
        
        if (executor instanceof SimpleAsyncTaskExecutor) {
            log.error("⚠️ DANGER: Using SimpleAsyncTaskExecutor!");
        }
    }
}
```

---

## 5. Thread Pool Configuration

### The Sizing Formula

```text
For I/O-bound tasks (HTTP calls, DB queries - most common):
────────────────────────────────────────────────────────
Recommended threads = Available CPUs × 10 to 20
Queue = 100 to 1000 (based on expected burst)

For CPU-bound tasks (calculations, parsing):
────────────────────────────────────────────────────────
Recommended threads = Available CPUs + 1
Queue = small (10-50)
```

### Practical Configuration

```java
@Configuration
@EnableAsync
public class AsyncConfig {
    
    @Bean("ioExecutor")  // For HTTP calls, DB, file I/O
    public TaskExecutor ioExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        int cores = Runtime.getRuntime().availableProcessors();
        
        executor.setCorePoolSize(cores * 2);     // 16 for 8-core
        executor.setMaxPoolSize(cores * 20);     // 160 for 8-core
        executor.setQueueCapacity(1000);
        executor.setThreadNamePrefix("IO-");
        executor.setRejectedExecutionHandler(new CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
    
    @Bean("cpuExecutor")  // For calculations
    public TaskExecutor cpuExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        int cores = Runtime.getRuntime().availableProcessors();
        
        executor.setCorePoolSize(cores);
        executor.setMaxPoolSize(cores + 1);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("CPU-");
        executor.setRejectedExecutionHandler(new CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
```

### Using Specific Executors

```java
@Service
public class AnalyticsService {
    
    @Async("ioExecutor")  // Use I/O executor for HTTP calls
    public CompletableFuture<Report> fetchExternalReport(String id) {
        return CompletableFuture.completedFuture(
            httpClient.get("/reports/" + id, Report.class)
        );
    }
    
    @Async("cpuExecutor")  // Use CPU executor for calculations
    public CompletableFuture<Statistics> calculateStatistics(Data data) {
        return CompletableFuture.completedFuture(
            statisticsCalculator.compute(data)
        );
    }
}
```

---

## 6. Thread Pool Exhaustion

### What Happens

```text
Scenario: Pool size = 10, each task takes 5 seconds
─────────────────────────────────────────────────────
Second 0: Tasks 1-10 arrive → All 10 threads busy
Second 0: Tasks 11-20 arrive → Queue (waiting)
Second 0-5: More tasks arrive → Queue filling up
Second 5: Queue full → RejectedExecutionException!
          OR: CallerRunsPolicy → caller thread blocks!
```

### Symptoms in Production

- Response times spike suddenly
- Some requests timeout while others are fast
- Logs show `RejectedExecutionException`
- Thread dumps show all async threads blocked on same resource

### Detection

```java
@Scheduled(fixedRate = 30000)
public void monitorThreadPool() {
    ThreadPoolTaskExecutor executor = (ThreadPoolTaskExecutor) asyncExecutor;
    ThreadPoolExecutor pool = executor.getThreadPoolExecutor();
    
    int active = pool.getActiveCount();
    int poolSize = pool.getPoolSize();
    int queueSize = pool.getQueue().size();
    int maxPool = pool.getMaximumPoolSize();
    
    // Alert if over 80% utilized
    if ((double) active / maxPool > 0.8) {
        log.warn("Thread pool at {}% capacity! Active: {}, Queue: {}",
            (active * 100) / maxPool, active, queueSize);
    }
    
    // Alert if queue building up
    if (queueSize > 100) {
        log.warn("Async queue backing up: {} tasks waiting", queueSize);
    }
}
```

### Solutions

```java
// 1. Use CallerRunsPolicy - caller thread handles overflow
executor.setRejectedExecutionHandler(new CallerRunsPolicy());

// 2. Add timeouts to external calls
@Async
public void callSlowService() {
    webClient.get()
        .uri("/slow-endpoint")
        .retrieve()
        .bodyToMono(String.class)
        .timeout(Duration.ofSeconds(5))  // Don't hold thread forever!
        .block();
}

// 3. Use circuit breaker
@Async
@CircuitBreaker(name = "externalService", fallbackMethod = "fallback")
public CompletableFuture<Result> callExternal() { ... }

// 4. Separate pools for different services (bulkhead pattern)
@Async("paymentExecutor")  public void processPayment() { ... }
@Async("emailExecutor")    public void sendEmail() { ... }
```

---

## 7. Context Loss (CRITICAL!)

### The Problem

```java
@RestController
public class OrderController {
    
    @PostMapping("/orders")
    public ResponseEntity<?> createOrder(@RequestBody Order order) {
        String username = SecurityContextHolder.getContext()
            .getAuthentication().getName();  // "john_doe"
        
        emailService.sendOrderConfirmation(order);  // Async
        
        return ResponseEntity.ok().build();
    }
}

@Service
public class EmailService {
    
    @Async
    public void sendOrderConfirmation(Order order) {
        // ❌ SecurityContext is NULL here!
        String username = SecurityContextHolder.getContext()
            .getAuthentication().getName();  // NullPointerException!
            
        // ❌ MDC (logging context) is empty!
        String traceId = MDC.get("traceId");  // null
        
        // ❌ Transaction is separate!
        // Any JPA lazy loading will fail
    }
}
```

### Why This Happens

```text
Context is THREAD-LOCAL:
─────────────────────────────────────────────────────
Main Thread (Request Thread)     Async Thread
─────────────────────────────    ─────────────
SecurityContext: john_doe        SecurityContext: null
MDC: {traceId: abc123}           MDC: {}
Transaction: TX-1                 Transaction: none

Each thread has its own ThreadLocal storage!
```

### Solution 1: Propagate SecurityContext

```java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {
    
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(500);
        executor.initialize();
        
        // Wrap executor to propagate security context
        return new DelegatingSecurityContextAsyncTaskExecutor(executor);
    }
}
```

### Solution 2: Propagate MDC

```java
public class MdcTaskDecorator implements TaskDecorator {
    
    @Override
    public Runnable decorate(Runnable runnable) {
        // Capture MDC from calling thread
        Map<String, String> contextMap = MDC.getCopyOfContextMap();
        
        return () -> {
            try {
                // Set MDC in worker thread
                if (contextMap != null) {
                    MDC.setContextMap(contextMap);
                }
                runnable.run();
            } finally {
                MDC.clear();
            }
        };
    }
}

@Bean
public TaskExecutor asyncExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(10);
    executor.setMaxPoolSize(50);
    executor.setTaskDecorator(new MdcTaskDecorator());  // Add decorator
    executor.initialize();
    return executor;
}
```

### Solution 3: Pass Context Explicitly

```java
@Service
public class EmailService {
    
    @Async
    public void sendOrderConfirmation(Order order, String username, String traceId) {
        // Explicitly passed - always available
        MDC.put("traceId", traceId);
        log.info("Sending email to {} for user {}", order.getEmail(), username);
    }
}

// Caller
@PostMapping("/orders")
public ResponseEntity<?> createOrder(@RequestBody Order order) {
    String username = SecurityContextHolder.getContext()
        .getAuthentication().getName();
    String traceId = MDC.get("traceId");
    
    emailService.sendOrderConfirmation(order, username, traceId);
    return ResponseEntity.ok().build();
}
```

---

## 8. When NOT to Use @Async

### ❌ Don't Use @Async When:

```java
// 1. You need the result immediately
@Async
public String getImportantData() {  // Caller can't wait!
    return repository.findData();
}
// Caller would need to block on Future anyway!

// 2. Inside a transaction that needs the data
@Transactional
public void processOrder(Order order) {
    asyncService.updateInventory(order);  // ❌ May not complete before TX commit!
}

// 3. For very quick operations
@Async
public void logSomething(String message) {  // Overhead > benefit
    logger.info(message);  // Logging is already fast!
}

// 4. When order matters
@Async
public void step1() { }
@Async
public void step2() { }  // ❌ May run before step1!
```

### ✅ Good Use Cases:

```java
// 1. Fire-and-forget notifications
@Async
public void sendWelcomeEmail(User user) {
    // User doesn't need to wait for email to send
}

// 2. Parallel independent operations
@Async
public CompletableFuture<Price> getPriceFromVendorA() { }

@Async
public CompletableFuture<Price> getPriceFromVendorB() { }

// Combine results:
CompletableFuture.allOf(priceA, priceB).join();

// 3. Background processing
@Async
public void generateLargeReport(Long userId) {
    // Takes 5 minutes - user notified when done
}

// 4. Non-critical logging/analytics
@Async
public void trackEvent(AnalyticsEvent event) {
    // Can fail without affecting user experience
}
```

---

## 9. CompletableFuture Patterns

### Returning Results

```java
@Service
public class PriceService {
    
    @Async
    public CompletableFuture<Price> getPrice(String productId) {
        Price price = externalService.fetchPrice(productId);
        return CompletableFuture.completedFuture(price);
    }
}

// Using the result
@RestController
public class PriceController {
    
    @GetMapping("/price/{id}")
    public CompletableFuture<ResponseEntity<Price>> getPrice(@PathVariable String id) {
        return priceService.getPrice(id)
            .thenApply(ResponseEntity::ok)
            .exceptionally(ex -> ResponseEntity.internalServerError().build());
    }
}
```

### Parallel Execution

```java
@Service
public class DashboardService {
    
    @Autowired private OrderService orderService;
    @Autowired private UserService userService;
    @Autowired private AnalyticsService analyticsService;
    
    public Dashboard buildDashboard(Long userId) {
        // Start all async operations
        CompletableFuture<List<Order>> ordersFuture = 
            orderService.getRecentOrders(userId);
        CompletableFuture<UserStats> statsFuture = 
            userService.getStats(userId);
        CompletableFuture<Recommendations> recsFuture = 
            analyticsService.getRecommendations(userId);
        
        // Wait for all (parallel execution)
        CompletableFuture.allOf(ordersFuture, statsFuture, recsFuture).join();
        
        // Build result
        return Dashboard.builder()
            .orders(ordersFuture.join())
            .stats(statsFuture.join())
            .recommendations(recsFuture.join())
            .build();
    }
}
```

### Timeout Handling

```java
CompletableFuture<Result> future = asyncService.slowOperation();

try {
    Result result = future.get(5, TimeUnit.SECONDS);
} catch (TimeoutException e) {
    future.cancel(true);  // Attempt to interrupt
    return fallbackResult;
}

// Or with Java 9+:
Result result = future
    .orTimeout(5, TimeUnit.SECONDS)
    .exceptionally(ex -> fallbackResult)
    .join();
```

---

## 10. Code Examples

### Complete Production Setup

```java
@Configuration
@EnableAsync
@Slf4j
public class AsyncConfig implements AsyncConfigurer {
    
    @Value("${async.pool.core-size:10}")
    private int corePoolSize;
    
    @Value("${async.pool.max-size:50}")
    private int maxPoolSize;
    
    @Value("${async.pool.queue-capacity:500}")
    private int queueCapacity;
    
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix("Async-");
        executor.setRejectedExecutionHandler((r, e) -> {
            log.error("Task rejected! Pool exhausted. Queue size: {}", 
                e.getQueue().size());
            throw new RejectedExecutionException("Async pool exhausted");
        });
        executor.setTaskDecorator(new ContextPropagatingDecorator());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.initialize();
        return executor;
    }
    
    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (ex, method, params) -> {
            log.error("Uncaught async exception in {}: {}", 
                method.getName(), ex.getMessage(), ex);
            // Send alert, increment metric, etc.
        };
    }
}

// Combined context propagation decorator
public class ContextPropagatingDecorator implements TaskDecorator {
    
    @Override
    public Runnable decorate(Runnable runnable) {
        // Capture current context
        Map<String, String> mdcContext = MDC.getCopyOfContextMap();
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        
        return () -> {
            try {
                // Restore context in worker thread
                if (mdcContext != null) {
                    MDC.setContextMap(mdcContext);
                }
                if (auth != null) {
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
                
                runnable.run();
                
            } finally {
                MDC.clear();
                SecurityContextHolder.clearContext();
            }
        };
    }
}
```

---

## 11. Common Interview Questions

### Q1: Why shouldn't you use SimpleAsyncTaskExecutor in production?

**Answer:**
> "SimpleAsyncTaskExecutor creates a new thread for every task, without any pooling. Threads are expensive - each uses about 1MB of stack memory. In production with many async calls, this leads to OutOfMemoryError. Always configure a ThreadPoolTaskExecutor with bounded pool and queue sizes."

### Q2: What happens when all threads in the pool are busy?

**Answer:**
> "New tasks go into the queue. If the queue is also full, the RejectedExecutionHandler decides:
> - `AbortPolicy` (default): Throws RejectedExecutionException
> - `CallerRunsPolicy`: The calling thread runs the task itself (provides backpressure)
> - `DiscardPolicy`: Silently drops the task
> - `DiscardOldestPolicy`: Drops the oldest queued task"

### Q3: How do you handle exceptions in @Async methods?

**Answer:**
> "For void methods, implement `AsyncUncaughtExceptionHandler` in your async config. For methods returning `CompletableFuture`, the exception is captured in the future - use `.exceptionally()` or `.handle()` to process it. The key is that exceptions in async methods don't propagate to the caller since it has already moved on."

### Q4: Why does SecurityContext become null in @Async methods?

**Answer:**
> "SecurityContext is stored in ThreadLocal, which is specific to each thread. When an async method runs in a worker thread, that thread has its own empty ThreadLocal. The solution is to use `DelegatingSecurityContextAsyncTaskExecutor` which copies the security context to the worker thread before execution."

---

## 12. Traps & Pitfalls

### Trap 1: Self-Invocation (Same as @Transactional!)

```java
@Service
public class MyService {
    
    public void doWork() {
        this.processAsync();  // ❌ NOT ASYNC - bypasses proxy!
    }
    
    @Async
    public void processAsync() {
        // Runs synchronously when called from same class
    }
}

// Solution: Inject self
@Autowired private MyService self;
public void doWork() {
    self.processAsync();  // ✅ Goes through proxy
}
```

### Trap 2: Exception Swallowing

```java
@Async
public void sendNotification(User user) {
    emailService.send(user.getEmail());  // Throws!
    // Exception is logged and... forgotten
    // Caller never knows it failed
}

// Solution: Use CompletableFuture for critical operations
@Async
public CompletableFuture<Void> sendNotification(User user) {
    try {
        emailService.send(user.getEmail());
        return CompletableFuture.completedFuture(null);
    } catch (Exception e) {
        return CompletableFuture.failedFuture(e);
    }
}
```

### Trap 3: Lazy Loading After Async

```java
@Async
public void processOrder(Order order) {
    // ❌ Order was loaded in different session!
    List<Item> items = order.getItems();  // LazyInitializationException!
}

// Solution: Fetch everything before async call
public void createOrder(Long orderId) {
    Order order = orderRepo.findByIdWithItems(orderId);  // Eager fetch
    asyncService.processOrder(order);
}
```

---

## 13. How to Explain in Interview

> **Short answer (30 seconds):**
> "@Async makes methods run in a separate thread so the caller doesn't wait. Spring uses a proxy to capture the method call and submit it to a thread pool. Key pitfalls are: always configure a custom ThreadPoolTaskExecutor (default is dangerous), context like SecurityContext doesn't propagate automatically, and self-invocation bypasses the proxy just like @Transactional."

> **Real-world analogy:**
> "It's like delegating tasks at work. When you @Async a method, you're handing the task to a coworker (thread pool). You can continue with other work while they handle it. But your coworker doesn't automatically know your context - if you need them to log into a system as you, you need to give them your credentials (security context propagation)."

---

## 14. Quick Reference

```text
EXECUTOR CONFIGURATION
──────────────────────────────────────────────────────
corePoolSize: Always-running threads (10-20)
maxPoolSize: Max during peak (50-100)
queueCapacity: Buffer before spawning more (100-1000)
threadNamePrefix: For debugging ("Async-")
rejectedExecutionHandler: CallerRunsPolicy recommended

SIZING GUIDELINES
──────────────────────────────────────────────────────
I/O-bound: cores × 10-20
CPU-bound: cores + 1
Queue: Based on expected burst

CONTEXT PROPAGATION
──────────────────────────────────────────────────────
SecurityContext → DelegatingSecurityContextAsyncTaskExecutor
MDC → Custom TaskDecorator
Explicit → Pass as method parameters

EXCEPTION HANDLING
──────────────────────────────────────────────────────
void methods → AsyncUncaughtExceptionHandler
CompletableFuture → .exceptionally() or .handle()

DON'T USE @ASYNC FOR
──────────────────────────────────────────────────────
- Operations that need immediate results
- Inside transactions needing the data
- Very quick operations (overhead > benefit)
- When ordering matters
```

---

**Next:** [Bean Scope & Concurrency →](./05-bean-scope-concurrency)
