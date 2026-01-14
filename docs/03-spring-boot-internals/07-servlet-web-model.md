---
title: 7. Servlet & Web Model
sidebar_position: 7
description: Understand Spring MVC request flow, thread-per-request model, and blocking vs non-blocking.
keywords: [spring mvc, servlet, tomcat, thread per request, webflux, blocking io]
---

# Servlet & Web Model

:::info Interview Context
Understanding the servlet model explains **why Spring MVC uses a thread pool**, **why slow requests block other users**, and **why WebFlux was created**. Essential for 2-4 YOE discussions about performance.
:::

---

## 1. What is the Servlet Model?

### Simple Explanation

A **servlet** is a Java class that handles HTTP requests. The **servlet container** (like Tomcat) manages servlets, creating threads, and routing requests.

**Real-world analogy:** 
- Servlet container = Restaurant
- Threads = Waiters
- Your Controller = Chef
- Request = Customer order

```text
┌──────────────────────────────────────────────────────┐
│                   TOMCAT (Servlet Container)         │
│  ┌────────────────────────────────────────────────┐  │
│  │              THREAD POOL                        │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │  │
│  │  │ T1  │ │ T2  │ │ T3  │ │ T4  │ │...  │       │  │
│  │  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └─────┘       │  │
│  └─────┼───────┼───────┼───────┼──────────────────┘  │
│        │       │       │       │                     │
│        ▼       ▼       ▼       ▼                     │
│  ┌─────────────────────────────────────────────────┐ │
│  │            DispatcherServlet (Spring MVC)       │ │
│  └─────────────────────────────────────────────────┘ │
│                         │                            │
│                         ▼                            │
│  ┌─────────────────────────────────────────────────┐ │
│  │               Your Controllers                   │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

---

## 2. Thread-Per-Request Model

### What is it?

**One thread handles one request from start to finish.** The thread is occupied for the entire duration of the request, including:
- Reading the request body
- Processing business logic
- Calling database
- Calling external APIs
- Writing the response

### How It Works

```java
@RestController
public class OrderController {
    
    @PostMapping("/orders")
    public Order createOrder(@RequestBody Order order) {
        // Thread is BLOCKED for entire method execution
        
        Order saved = orderRepository.save(order);  // Thread waits for DB
        
        emailService.sendConfirmation(order);       // Thread waits for email
        
        return saved;  // Thread released after response sent
    }
}
```

### Visual Timeline

```text
Request 1 arrives ────┐
                      │  Thread-1 assigned
                      ▼
              ┌───────────────┐
Thread-1:     │ Parse request │
              └───────┬───────┘
                      │
              ┌───────▼───────┐
              │ Call database │ ← Thread WAITING (blocked I/O)
              │ (500ms)       │
              └───────┬───────┘
                      │
              ┌───────▼───────┐
              │ Call email    │ ← Thread WAITING (blocked I/O)
              │ (200ms)       │
              └───────┬───────┘
                      │
              ┌───────▼───────┐
              │ Send response │
              └───────┬───────┘
                      │
                      ▼
              Thread-1 returns to pool
              
Total: Thread occupied for 700ms (mostly waiting!)
```

---

## 3. Servlet Container Basics (Tomcat)

### Default Configuration

```yaml
# application.yml
server:
  tomcat:
    threads:
      max: 200          # Maximum worker threads
      min-spare: 10     # Minimum idle threads
    max-connections: 8192
    accept-count: 100   # Queue when all threads busy
    connection-timeout: 20000  # 20 seconds
```

### What These Mean

| Property | Default | Meaning |
|----------|---------|---------|
| `max-threads` | 200 | Max concurrent requests |
| `min-spare` | 10 | Threads kept ready |
| `max-connections` | 8192 | TCP connections allowed |
| `accept-count` | 100 | Queue size when threads exhausted |
| `connection-timeout` | 20s | Time to wait for client data |

### Thread Pool Behavior

```text
Request Load Over Time:
─────────────────────────────────────────────────────────
Requests:  10   50   200  300  500  200  50   10
           │    │    │    │    │    │    │    │
Threads:   10 → 50 → 200→ 200→ 200→ 200→ 50 → 10
                          │    │
                       Max reached!
                       Requests queue (accept-count)
                       After queue full → 503 errors
```

---

## 4. Spring MVC Request Flow

### Complete Flow

```text
1. HTTP Request arrives at Tomcat
   ↓
2. Tomcat assigns a thread from pool
   ↓
3. Thread calls DispatcherServlet.doDispatch()
   ↓
4. HandlerMapping finds controller method
   ↓
5. HandlerAdapter invokes controller
   ↓
6. Controller method executes
   ↓
7. ViewResolver (if needed) resolves view
   ↓
8. Response written
   ↓
9. Thread returns to pool
```

### Code Flow

```java
// 1. Request: POST /api/users

// 2. DispatcherServlet receives request (on thread from pool)

// 3. HandlerMapping finds:
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    // 4. HandlerAdapter calls this method
    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody UserDTO dto) {
        
        // 5. Your code runs (still on Tomcat thread)
        User user = userService.create(dto);
        
        // 6. Return value converted by HttpMessageConverter
        return ResponseEntity.ok(user);
    }
}
```

### Under the Hood

```java
// Simplified DispatcherServlet.doDispatch()
protected void doDispatch(HttpServletRequest request, 
                          HttpServletResponse response) {
    
    // Find handler (controller + method)
    HandlerExecutionChain handler = getHandler(request);
    
    // Get adapter for this handler type
    HandlerAdapter adapter = getHandlerAdapter(handler.getHandler());
    
    // Execute interceptors (preHandle)
    if (!chain.applyPreHandle(request, response)) {
        return;
    }
    
    // Execute controller method
    ModelAndView mv = adapter.handle(request, response, handler.getHandler());
    
    // Execute interceptors (postHandle)
    chain.applyPostHandle(request, response, mv);
    
    // Render view or write JSON
    render(mv, request, response);
}
```

---

## 5. Blocking vs Non-Blocking Requests

### Blocking I/O (Traditional Spring MVC)

```java
@GetMapping("/users/{id}")
public User getUser(@PathVariable Long id) {
    
    // Thread WAITS here until DB responds
    User user = userRepository.findById(id).orElseThrow();
    
    // Thread WAITS here until external API responds
    UserProfile profile = externalApi.getProfile(user.getExternalId());
    
    user.setProfile(profile);
    return user;
}
```

**Timeline:**

```text
Thread: ─────────[DB WAIT]──────────[API WAIT]─────►
        │                                          │
        0ms                                     800ms
        
        Thread occupied for 800ms
        Most of that time is WAITING
```

### Why This Is a Problem

```text
Scenario: 200 max threads, each request takes 1 second (mostly I/O wait)
─────────────────────────────────────────────────────────────────────

Time 0s:   Request 1-200 arrive → 200 threads busy
Time 0.1s: Request 201-300 arrive → QUEUED (accept-count)
Time 0.5s: Request 301+ arrive → 503 Service Unavailable!

Even though CPUs are 95% idle (just waiting for I/O)!
```

### Non-Blocking I/O (WebFlux)

```java
@GetMapping("/users/{id}")
public Mono<User> getUser(@PathVariable Long id) {
    
    return userRepository.findById(id)              // Returns immediately
        .flatMap(user -> 
            externalApi.getProfile(user.getExternalId())  // Returns immediately
                .map(profile -> {
                    user.setProfile(profile);
                    return user;
                })
        );
}
```

**Timeline:**

```text
Thread: ─[Register DB callback]─[Return]
                                    │
                                    ▼
                              Thread FREE!
                              
Later (when DB responds):
Netty event loop: ─[Process DB result]─[Register API callback]─[Return]

Later (when API responds):
Netty event loop: ─[Process API result]─[Write response]─[Done]

Thread never blocks! Can handle thousands of concurrent requests.
```

---

## 6. Why Traditional Spring MVC Blocks Threads

### Root Cause: Servlet API Design

```java
// Servlet API is fundamentally blocking
public void doGet(HttpServletRequest request, 
                  HttpServletResponse response) {
    
    // This call BLOCKS until body is fully read
    BufferedReader reader = request.getReader();
    String body = reader.readLine();  // Blocking!
    
    // This call BLOCKS until response is written
    response.getWriter().write("Hello");  // Blocking!
}
```

### JDBC Is Blocking

```java
// JDBC has no async API
Connection conn = dataSource.getConnection();  // Might block
Statement stmt = conn.createStatement();
ResultSet rs = stmt.executeQuery("SELECT * FROM users");  // BLOCKS!

while (rs.next()) {  // BLOCKS for each row
    // ...
}
```

### HTTP Clients Are Blocking (by default)

```java
// RestTemplate is blocking
RestTemplate restTemplate = new RestTemplate();
String result = restTemplate.getForObject(url, String.class);  // BLOCKS!
```

---

## 7. When Blocking Matters (Production Issues)

### Issue 1: Slow Downstream Service

```text
Normal: API responds in 50ms → Thread free quickly
Degraded: API responds in 5000ms → Thread held 100x longer!

With 200 threads:
Normal: 200 threads ÷ 0.05s = 4000 requests/second capacity
Degraded: 200 threads ÷ 5s = 40 requests/second capacity

97% drop in capacity from one slow service!
```

### Issue 2: Database Connection Pool Exhaustion

```java
// HikariCP default: 10 connections
@Transactional
public void slowMethod() {
    // Holds DB connection for entire method
    
    Thread.sleep(60000);  // Simulating slow processing
    
    // All 10 connections exhausted after 10 concurrent requests
    // Request 11 blocks waiting for connection → timeout
}
```

### Issue 3: Thread Starvation

```text
Symptoms:
- Response times spike from 100ms to 30s
- All threads show "WAITING" in thread dump
- CPU usage is LOW (threads are blocked, not working)
- Database/external service appears slow but is actually fine

Root cause: All threads blocked waiting for I/O
```

---

## 8. WebFlux Overview (High-Level)

### What is it?

**Non-blocking, reactive web framework** built on Project Reactor. Uses event-loop model instead of thread-per-request.

### Comparison

| Aspect | Spring MVC | Spring WebFlux |
|--------|------------|----------------|
| Threading | Thread-per-request | Event loop (few threads) |
| I/O | Blocking | Non-blocking |
| Paradigm | Imperative | Reactive (Mono/Flux) |
| Server | Tomcat, Jetty | Netty, Undertow |
| Scalability | Limited by thread count | Limited by memory/CPU |
| Learning curve | Low | High |
| Best for | CRUD apps, existing codebases | High-concurrency, streaming |

### When to Use WebFlux

```text
✅ Use WebFlux when:
- Handling 10,000+ concurrent connections
- Streaming data (real-time feeds, SSE)
- Microservices with many downstream calls
- New project with team experienced in reactive

❌ Stay with MVC when:
- Team unfamiliar with reactive programming
- Using blocking dependencies (most JPA/Hibernate)
- Application is CRUD-heavy
- Not facing scalability issues
```

### Simple WebFlux Example

```java
// WebFlux Controller
@RestController
public class UserController {
    
    private final ReactiveUserRepository repository;  // R2DBC (non-blocking)
    
    @GetMapping("/users")
    public Flux<User> getAllUsers() {
        return repository.findAll();  // Returns immediately, streams results
    }
    
    @GetMapping("/users/{id}")
    public Mono<User> getUser(@PathVariable Long id) {
        return repository.findById(id);  // Returns immediately
    }
}
```

---

## 9. Code Examples

### Analyzing Blocking Points

```java
@Service
@Slf4j
public class OrderService {
    
    @Autowired
    private RestTemplate restTemplate;  // Blocking HTTP client
    
    @Autowired
    private JdbcTemplate jdbcTemplate;  // Blocking DB access
    
    public Order processOrder(Order order) {
        log.info("Thread: {} - Starting", Thread.currentThread().getName());
        
        // Blocking point 1: Database call
        long start = System.currentTimeMillis();
        jdbcTemplate.update(
            "INSERT INTO orders VALUES (?, ?)", 
            order.getId(), order.getAmount()
        );
        log.info("DB took: {}ms", System.currentTimeMillis() - start);
        
        // Blocking point 2: External API call
        start = System.currentTimeMillis();
        PaymentResult result = restTemplate.postForObject(
            "http://payment-api/charge",
            order,
            PaymentResult.class
        );
        log.info("API took: {}ms", System.currentTimeMillis() - start);
        
        return order;
    }
}
```

### Using WebClient (Non-Blocking HTTP)

```java
@Service
public class OrderService {
    
    private final WebClient webClient;
    
    public OrderService(WebClient.Builder builder) {
        this.webClient = builder
            .baseUrl("http://payment-api")
            .build();
    }
    
    // Still blocking overall (returns Order, not Mono<Order>)
    // But doesn't hold thread during HTTP call
    public Order processOrderWithWebClient(Order order) {
        
        PaymentResult result = webClient.post()
            .uri("/charge")
            .bodyValue(order)
            .retrieve()
            .bodyToMono(PaymentResult.class)
            .block();  // Converts to blocking (avoid in reactive code!)
        
        return order;
    }
    
    // Fully non-blocking version
    public Mono<Order> processOrderReactive(Order order) {
        
        return webClient.post()
            .uri("/charge")
            .bodyValue(order)
            .retrieve()
            .bodyToMono(PaymentResult.class)
            .map(result -> {
                order.setPaymentId(result.getTransactionId());
                return order;
            });
    }
}
```

### Configuring Tomcat for High Load

```java
@Configuration
public class TomcatConfig {
    
    @Bean
    public TomcatServletWebServerFactory tomcatFactory() {
        TomcatServletWebServerFactory factory = new TomcatServletWebServerFactory();
        
        factory.addConnectorCustomizers(connector -> {
            connector.setMaxThreads(400);        // Increase for I/O bound
            connector.setMinSpareThreads(50);    // More threads ready
            connector.setAcceptCount(200);       // Larger queue
            connector.setConnectionTimeout(30000); // 30s timeout
        });
        
        return factory;
    }
}
```

---

## 10. Common Interview Questions

### Q1: Explain the thread-per-request model.

**Answer:**
> "In Spring MVC with Tomcat, each HTTP request is handled by a single thread from start to finish. The thread is taken from Tomcat's thread pool, executes the controller logic, waits for any I/O operations like database calls, and is only returned to the pool after the response is sent. The default is 200 threads, which limits concurrent request capacity."

### Q2: What happens when all Tomcat threads are busy?

**Answer:**
> "New requests wait in the accept-queue (default 100). When that fills up too, Tomcat rejects additional requests with 503 Service Unavailable. This often happens when downstream services are slow, causing threads to block longer than expected."

### Q3: Why can Spring MVC handle fewer concurrent requests than WebFlux?

**Answer:**
> "Because MVC uses blocking I/O, threads wait during database and HTTP calls instead of doing work. With 200 threads and 100ms requests, you get 2000 req/sec. But if each request blocks for 1 second, capacity drops to 200 req/sec. WebFlux uses non-blocking I/O, so a small number of threads can handle thousands of concurrent requests by not waiting."

### Q4: When would you NOT use WebFlux?

**Answer:**
> "When using blocking dependencies like JDBC, Hibernate, or synchronous APIs - they'd block the event loop which is worse than thread-per-request. Also when the team isn't familiar with reactive programming, as the debugging is harder. For CRUD applications that aren't hitting scalability limits, Spring MVC is simpler and sufficient."

---

## 11. Traps & Pitfalls

### Trap 1: Blocking in WebFlux

```java
// ❌ TERRIBLE - blocks the event loop!
@GetMapping("/data")
public Mono<Data> getData() {
    Data data = jdbcTemplate.queryForObject(...);  // BLOCKS!
    return Mono.just(data);
}
```

**Result:** Event loop thread blocked, entire application freezes.

### Trap 2: Not Setting Request Timeouts

```java
// ❌ No timeout - slow service blocks forever
restTemplate.getForObject(slowService, String.class);

// ✅ Always set timeouts
RestTemplate restTemplate = new RestTemplate();
((HttpComponentsClientHttpRequestFactory) restTemplate.getRequestFactory())
    .setConnectTimeout(3000);
    .setReadTimeout(5000);
```

### Trap 3: Underestimating Thread Pool Size

```text
Formula: threads = connections × avg_response_time / 1000

If you expect 100 concurrent users, each request takes 200ms:
threads = 100 × 0.2 = 20 threads (minimum)

Add buffer: 20 × 2 = 40 threads recommended
```

### Trap 4: Synchronous Logging in Hot Path

```java
// ❌ Blocking logging can create bottleneck
@GetMapping("/hot-endpoint")
public String process() {
    logger.info("Request received with details: " + buildLargeLogMessage());
    // String concatenation + sync file write blocks!
}

// ✅ Use async logging (Logback/Log4j2 async appenders)
```

---

## 12. How to Explain in Interview

> **Short answer (30 seconds):**
> "Spring MVC uses a thread-per-request model where each HTTP request occupies a thread from Tomcat's pool for its entire duration. The thread blocks during database and API calls. With 200 default threads, slow I/O can quickly exhaust capacity. WebFlux solves this with non-blocking I/O, but requires reactive code throughout and isn't worth it unless you're hitting scalability limits."

> **Real-world analogy:**
> "Thread-per-request is like a restaurant where each waiter serves one table at a time, standing idle while the kitchen prepares food. WebFlux is like a modern ordering system where waiters take orders, hand them to the kitchen, and immediately serve other tables - checking back only when food is ready."

---

## 13. Quick Reference

```text
THREAD-PER-REQUEST MODEL
─────────────────────────────────────────────────────
- 1 thread = 1 request (entire lifecycle)
- Thread blocks during I/O (DB, HTTP, file)
- Default: 200 threads in Tomcat
- Capacity = threads ÷ avg_response_time

BLOCKING POINTS IN TYPICAL REQUEST
─────────────────────────────────────────────────────
1. Reading request body
2. Database query (JDBC)
3. External HTTP call (RestTemplate)
4. File I/O
5. Writing response

TOMCAT CONFIGURATION
─────────────────────────────────────────────────────
server.tomcat.threads.max=200      # Max threads
server.tomcat.threads.min-spare=10 # Idle threads
server.tomcat.accept-count=100     # Queue size
server.tomcat.connection-timeout=20000  # 20s

WHEN TO USE WEBFLUX
─────────────────────────────────────────────────────
✅ High concurrency (10k+ simultaneous users)
✅ Streaming/real-time data
✅ New project, experienced team
✅ Non-blocking dependencies (R2DBC, WebClient)

❌ Blocking dependencies (JDBC, JPA)
❌ Unfamiliar team
❌ Simple CRUD apps
❌ Not facing scalability issues
```

---

**This concludes the Spring Boot Internals section!**

**Go back to:** [Introduction & Syllabus](./01-intro)
