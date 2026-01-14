---
title: 5. Bean Scope & Concurrency
sidebar_position: 5
description: Master singleton thread safety, prototype scope gotchas, and production concurrency issues.
keywords: [spring singleton, thread safety, bean scope, prototype, concurrency, stateless]
---

# Bean Scope & Concurrency

:::danger Production Alert
**90% of concurrency bugs in Spring** come from misunderstanding singleton scope. This topic is where interviews separate mid-level from senior developers.
:::

---

## 1. What is Bean Scope?

### Simple Explanation

**Bean scope** defines how many instances of a bean Spring creates and how long they live.

Think of it like coffee cups:
- **Singleton** = One office mug shared by everyone (careful who drinks from it!)
- **Prototype** = Disposable cups - new cup for each use
- **Request** = Your personal cup for this meeting only
- **Session** = Your designated mug for the day

---

## 2. Singleton Scope (The Default)

### What is it?

**One instance per Spring container.** All requests, all threads, all users share the SAME object.

```java
@Service  // Singleton by default
public class OrderService {
    // This single instance handles ALL orders from ALL users
}
```

### Why Does Spring Use Singleton by Default?

| Reason | Explanation |
|--------|-------------|
| **Memory efficient** | One object instead of thousands |
| **Fast** | No object creation overhead per request |
| **Stateless by design** | Encourages good architecture |
| **Easy caching** | Dependencies injected once |

### How It Works Internally

```text
┌─────────────────────────────────────────────┐
│           SPRING CONTAINER                  │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │     OrderService (SINGLETON)         │   │
│  │     Created at startup, lives        │   │
│  │     until container shuts down       │   │
│  └─────────────────────────────────────┘   │
│           ↑           ↑           ↑        │
│           │           │           │        │
│        Thread 1    Thread 2    Thread 3    │
│        (User A)    (User B)    (User C)    │
└─────────────────────────────────────────────┘
```

---

## 3. Thread Safety of Singleton Beans (CRITICAL!)

### ❌ The Dangerous Pattern

```java
@Service
public class OrderService {
    
    // ❌ DISASTER - Shared mutable state!
    private Order currentOrder;
    private User currentUser;
    
    public void processOrder(Long orderId) {
        this.currentOrder = orderRepository.findById(orderId);  // Thread 1 sets it
        
        // Thread 2 comes in, overwrites currentOrder!
        
        validateOrder();  // Now using Thread 2's order!
        chargePayment();  // Charging wrong user!
    }
}
```

### What Happens in Production?

```text
Timeline:
─────────────────────────────────────────────────────
Thread 1: processOrder(order=100) ──┐
                                    │ sets currentOrder = Order#100
Thread 2: processOrder(order=200) ──│──┐
                                    │  │ OVERWRITES currentOrder = Order#200
Thread 1: validateOrder() ──────────┘  │
          (validates Order#200 by mistake!)
Thread 2: validateOrder() ─────────────┘
          (validates Order#200 - correct)

Result: Thread 1 charged User A for User B's order!
```

### ✅ The Correct Pattern - Stateless Services

```java
@Service
public class OrderService {
    
    // ✅ Dependencies are immutable - SAFE
    private final OrderRepository orderRepository;
    private final PaymentService paymentService;
    
    public OrderService(OrderRepository orderRepository, 
                        PaymentService paymentService) {
        this.orderRepository = orderRepository;
        this.paymentService = paymentService;
    }
    
    // ✅ All state is passed as parameters or local variables
    public void processOrder(Long orderId) {
        Order order = orderRepository.findById(orderId);  // Local variable!
        User user = order.getUser();                       // Local variable!
        
        validateOrder(order);
        chargePayment(order, user);
    }
    
    private void validateOrder(Order order) {
        // order is local to this thread's call
    }
    
    private void chargePayment(Order order, User user) {
        paymentService.charge(user, order.getAmount());
    }
}
```

### Interview Answer: Why Are Singleton Beans Thread-Safe by Default?

> "They're NOT automatically thread-safe. They're safe only if they're **stateless** - meaning they don't store any mutable instance variables. Spring makes singletons by default to encourage stateless design, but it's the developer's responsibility to not store request-specific data in fields."

---

## 4. Stateless vs Stateful Design

### Stateless Service (✅ Correct)

```java
@Service
public class CalculatorService {
    
    // No instance variables that change
    
    public BigDecimal calculateTax(BigDecimal amount, String state) {
        BigDecimal rate = getTaxRate(state);  // Local variable
        return amount.multiply(rate);          // Pure computation
    }
}
```

### Stateful Service (❌ Problematic)

```java
@Service
public class ShoppingCartService {
    
    // ❌ State that changes per user
    private List<Item> items = new ArrayList<>();
    
    public void addItem(Item item) {
        items.add(item);  // All users share this cart!
    }
}
```

### When You Need State - Use Request/Session Scope

```java
@Component
@Scope(value = WebApplicationContext.SCOPE_REQUEST, proxyMode = ScopedProxyMode.TARGET_CLASS)
public class ShoppingCart {
    
    private List<Item> items = new ArrayList<>();
    
    public void addItem(Item item) {
        items.add(item);  // ✅ Each HTTP request gets its own cart
    }
}
```

---

## 5. Prototype Scope

### What is it?

**New instance every time the bean is requested** from the container.

```java
@Component
@Scope("prototype")
public class ReportGenerator {
    
    private List<String> data = new ArrayList<>();
    
    public void addData(String row) {
        data.add(row);  // Safe - each call gets fresh instance
    }
    
    public Report generate() {
        return new Report(data);
    }
}
```

### ⚠️ The Prototype-in-Singleton Trap

```java
@Service
public class ReportService {  // Singleton
    
    @Autowired
    private ReportGenerator generator;  // Prototype - but injected ONCE!
    
    public Report createReport(User user) {
        generator.addData(user.getName());  // ❌ Same instance every time!
        return generator.generate();
    }
}
```

**What happens:** The prototype is injected only once when the singleton is created. You get the same instance forever!

### ✅ Solutions for Prototype-in-Singleton

**Solution 1: ObjectFactory**

```java
@Service
public class ReportService {
    
    @Autowired
    private ObjectFactory<ReportGenerator> generatorFactory;
    
    public Report createReport(User user) {
        ReportGenerator generator = generatorFactory.getObject();  // Fresh instance!
        generator.addData(user.getName());
        return generator.generate();
    }
}
```

**Solution 2: Provider (JSR-330)**

```java
@Service
public class ReportService {
    
    @Autowired
    private Provider<ReportGenerator> generatorProvider;
    
    public Report createReport(User user) {
        ReportGenerator generator = generatorProvider.get();  // Fresh instance!
        generator.addData(user.getName());
        return generator.generate();
    }
}
```

**Solution 3: @Lookup Method**

```java
@Service
public abstract class ReportService {
    
    @Lookup
    public abstract ReportGenerator getGenerator();  // Spring overrides this
    
    public Report createReport(User user) {
        ReportGenerator generator = getGenerator();  // Fresh instance!
        generator.addData(user.getName());
        return generator.generate();
    }
}
```

---

## 6. Request & Session Scope

### Request Scope

One instance per HTTP request. Automatically destroyed when request completes.

```java
@Component
@Scope(value = WebApplicationContext.SCOPE_REQUEST, proxyMode = ScopedProxyMode.TARGET_CLASS)
public class RequestContext {
    
    private String correlationId;
    private Instant startTime = Instant.now();
    
    @PostConstruct
    public void init() {
        this.correlationId = UUID.randomUUID().toString();
    }
    
    public String getCorrelationId() {
        return correlationId;
    }
    
    public Duration getElapsedTime() {
        return Duration.between(startTime, Instant.now());
    }
}
```

### Session Scope

One instance per user session. Lives until session expires or invalidates.

```java
@Component
@Scope(value = WebApplicationContext.SCOPE_SESSION, proxyMode = ScopedProxyMode.TARGET_CLASS)
public class UserPreferences {
    
    private String theme = "light";
    private String language = "en";
    
    // Getters and setters
    // Persists across requests in the same session
}
```

### Why proxyMode = TARGET_CLASS?

```java
@Service  // Singleton
public class DashboardService {
    
    @Autowired
    private UserPreferences prefs;  // Session scoped
    
    // Problem: How can a singleton hold a session-scoped bean?
    // Solution: Spring injects a PROXY that delegates to the correct instance
}
```

```text
┌────────────────────────────────────────────────────┐
│                DashboardService (Singleton)        │
│                                                    │
│   userPrefs ──→ [PROXY] ──┬──→ Session A's prefs   │
│                           ├──→ Session B's prefs   │
│                           └──→ Session C's prefs   │
└────────────────────────────────────────────────────┘
```

---

## 7. When Singleton Beans Break (Production Failures)

### Failure 1: Instance Variable Accumulation

```java
@Service
public class MetricsCollector {
    
    private List<Metric> allMetrics = new ArrayList<>();  // Grows forever!
    
    public void record(Metric metric) {
        allMetrics.add(metric);  // Memory leak!
    }
}
```

**Result:** OutOfMemoryError after running for days.

### Failure 2: Non-Thread-Safe Collections

```java
@Service
public class CacheService {
    
    private Map<String, Object> cache = new HashMap<>();  // Not thread-safe!
    
    public void put(String key, Object value) {
        cache.put(key, value);  // ❌ Race condition!
    }
    
    public Object get(String key) {
        return cache.get(key);  // ❌ May return wrong value or null
    }
}
```

**Solution:**

```java
@Service
public class CacheService {
    
    private final ConcurrentHashMap<String, Object> cache = new ConcurrentHashMap<>();
    
    public void put(String key, Object value) {
        cache.put(key, value);  // ✅ Thread-safe
    }
}
```

### Failure 3: DateFormat/SimpleDateFormat (Classic Bug!)

```java
@Service
public class DateService {
    
    // ❌ SimpleDateFormat is NOT thread-safe!
    private SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
    
    public String format(Date date) {
        return sdf.format(date);  // Garbled output, wrong dates!
    }
}
```

**Solution:**

```java
@Service
public class DateService {
    
    // ✅ DateTimeFormatter is thread-safe
    private static final DateTimeFormatter formatter = 
        DateTimeFormatter.ofPattern("yyyy-MM-dd");
    
    public String format(LocalDate date) {
        return date.format(formatter);  // Safe
    }
}
```

---

## 8. Code Examples

### ✅ Correct: Stateless Service

```java
@Service
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    // Constructor injection - fields are final
    public UserService(UserRepository userRepository, 
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }
    
    public User createUser(String email, String rawPassword) {
        // All variables are local to this method call
        String encodedPassword = passwordEncoder.encode(rawPassword);
        User user = new User(email, encodedPassword);
        return userRepository.save(user);
    }
    
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }
}
```

### ❌ Wrong: Stateful Singleton

```java
@Service
public class BadUserService {
    
    // ❌ Mutable state shared across all threads
    private User lastCreatedUser;
    private int operationCount = 0;
    
    public User createUser(String email, String password) {
        operationCount++;  // ❌ Race condition
        
        User user = new User(email, encode(password));
        this.lastCreatedUser = user;  // ❌ Overwritten by other threads
        
        return user;
    }
    
    // This returns unpredictable results!
    public User getLastCreatedUser() {
        return lastCreatedUser;
    }
}
```

---

## 9. Common Interview Questions

### Q1: Are Spring singleton beans thread-safe?

**Answer:** 
> "No, Spring does not make singleton beans thread-safe automatically. It's the developer's responsibility to ensure thread safety. The recommended approach is to design beans as **stateless** - don't store mutable instance variables. If you need state, use local variables, method parameters, or proper synchronization."

### Q2: What happens if you inject a prototype bean into a singleton?

**Answer:**
> "The prototype bean is injected only once when the singleton is created. Subsequent calls still use the same prototype instance. To get a new instance each time, you should use `ObjectFactory`, `Provider`, or the `@Lookup` annotation."

### Q3: When would you use prototype scope?

**Answer:**
> "Prototype is useful when the bean has state that shouldn't be shared - like a builder pattern object, a report generator that accumulates data, or any object that needs to be created fresh for each use. However, be careful about memory leaks since Spring doesn't manage prototype lifecycle after creation."

### Q4: Explain the proxy mode in request/session scoped beans.

**Answer:**
> "When you inject a request or session scoped bean into a singleton, Spring can't inject the actual bean because it doesn't exist yet (no request/session context at startup). Instead, Spring injects a proxy that looks up the correct scoped instance at runtime. `ScopedProxyMode.TARGET_CLASS` uses CGLIB to create a subclass proxy."

---

## 10. Traps & Pitfalls

### Trap 1: Lazy Initialization Doesn't Solve Concurrency

```java
@Service
public class MyService {
    
    private ExpensiveObject cache;  // Still shared!
    
    @PostConstruct
    public void init() {
        // Creating lazily doesn't make it thread-safe
        this.cache = new ExpensiveObject();
    }
}
```

### Trap 2: Final Keyword Doesn't Prevent Mutation

```java
@Service
public class MyService {
    
    // final means you can't reassign the reference
    // But you CAN modify the list contents!
    private final List<String> items = new ArrayList<>();
    
    public void addItem(String item) {
        items.add(item);  // ❌ Still modifying shared state!
    }
}
```

### Trap 3: Static Fields Are Even Worse

```java
@Service
public class MyService {
    
    // ❌ Static = shared across ALL instances, ALL containers
    private static User currentUser;
    
    public void setUser(User user) {
        MyService.currentUser = user;  // Nuclear-level concurrency bug
    }
}
```

---

## 11. How to Explain in Interview

> **Short answer (30 seconds):**
> "Spring singleton beans are shared across all threads. They're not automatically thread-safe - we make them safe by design: keep them stateless, use final fields for dependencies, and pass state through method parameters. If I need per-request state, I use request scope or thread-local storage."

> **Real-world analogy:**
> "It's like a shared kitchen knife in a restaurant. The knife itself is singleton - one instance. It's safe to use because chefs don't modify the knife, they just use it to cut different ingredients (parameters). If a chef tried to 'store' their current vegetable on the knife (instance variable), the next chef would overwrite it."

---

## 12. Quick Reference

```text
SCOPE SUMMARY
─────────────────────────────────────────────────
singleton (default) → One instance per container
prototype          → New instance each time requested
request            → One instance per HTTP request
session            → One instance per HTTP session
application        → One instance per ServletContext

THREAD SAFETY RULES
─────────────────────────────────────────────────
✅ Final references to dependencies
✅ Local variables for processing
✅ Method parameters for input
✅ Return values for output
❌ Mutable instance variables
❌ Non-thread-safe types (HashMap, ArrayList, SimpleDateFormat)
❌ Static mutable fields

PROTOTYPE-IN-SINGLETON SOLUTIONS
─────────────────────────────────────────────────
1. ObjectFactory<T> - factory.getObject()
2. Provider<T> - provider.get()
3. @Lookup method - Spring overrides abstract method
```

---

**Next:** [Proxy Mechanism Deep Dive →](./06-proxy-mechanism)
