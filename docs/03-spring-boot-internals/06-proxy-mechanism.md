---
title: 6. Proxy Mechanism Deep Dive
sidebar_position: 6
description: Master Spring's proxy magic - JDK Dynamic Proxy, CGLIB, and why @Transactional fails.
keywords: [spring proxy, cglib, jdk dynamic proxy, aop, transactional, self-invocation]
---

# Proxy Mechanism Deep Dive

:::danger Most Important Topic
**If you understand nothing else, understand proxies.** This single concept explains why `@Transactional` doesn't work on internal calls, why `final` methods break, and how Spring adds behavior to your code.
:::

---

## 1. What is a Proxy?

### Simple Explanation

A **proxy** is a wrapper object that sits between the caller and your actual bean. It intercepts method calls and adds behavior (transactions, security, logging) before/after calling your real code.

**Real-world analogy:** A celebrity's personal assistant. When someone wants to talk to the celebrity (your bean), they go through the assistant (proxy) who can:
- Screen calls (security)
- Schedule meetings (transactions)
- Take notes (logging)
- Then connect to the actual celebrity

```text
WITHOUT PROXY:
┌────────────┐        ┌───────────────────┐
│   Caller   │──────▶│   YourService     │
└────────────┘        └───────────────────┘

WITH PROXY:
┌────────────┐        ┌──────────┐        ┌───────────────────┐
│   Caller   │──────▶│  PROXY   │──────▶│   YourService     │
└────────────┘        │ (adds TX,│        └───────────────────┘
                      │  logging)│
                      └──────────┘
```

---

## 2. Why Does Spring Need Proxies?

### The Problem Spring Solves

You want cross-cutting concerns (transactions, security, logging) **without modifying your business code**.

```java
// ❌ Without AOP/Proxies - Messy, repetitive code
public class OrderService {
    public void placeOrder(Order order) {
        // Manual transaction management
        Transaction tx = transactionManager.begin();
        try {
            // Security check
            if (!securityContext.hasPermission("PLACE_ORDER")) {
                throw new AccessDeniedException();
            }
            
            // Logging
            logger.info("Placing order: {}", order);
            
            // FINALLY - actual business logic (just 2 lines!)
            orderRepository.save(order);
            paymentService.charge(order);
            
            tx.commit();
        } catch (Exception e) {
            tx.rollback();
            logger.error("Order failed", e);
            throw e;
        }
    }
}

// ✅ With Proxies - Clean, focused code
@Service
public class OrderService {
    
    @Transactional
    @PreAuthorize("hasRole('USER')")
    @Logged
    public void placeOrder(Order order) {
        orderRepository.save(order);
        paymentService.charge(order);
    }
}
```

---

## 3. How Proxies Work Internally

### The Flow

```text
Step 1: You call orderService.placeOrder()
        ↓
Step 2: Call goes to PROXY, not your actual service
        ↓
Step 3: Proxy checks for @Transactional → begins transaction
        ↓
Step 4: Proxy calls YOUR actual placeOrder() method
        ↓
Step 5: Your method executes, returns
        ↓
Step 6: Proxy commits transaction (or rollbacks on exception)
        ↓
Step 7: Result returned to caller
```

### What Spring Actually Creates

When you define:

```java
@Service
public class PaymentService {
    @Transactional
    public void process(Payment payment) {
        // ... 
    }
}
```

Spring creates something like:

```java
// Auto-generated proxy (simplified)
public class PaymentService$$SpringProxy extends PaymentService {
    
    private final PaymentService target;           // Your actual bean
    private final TransactionManager txManager;
    
    @Override
    public void process(Payment payment) {
        // Added behavior BEFORE
        TransactionStatus tx = txManager.getTransaction(new DefaultTransactionDefinition());
        
        try {
            target.process(payment);  // Call YOUR code
            txManager.commit(tx);     // Added behavior AFTER (success)
        } catch (RuntimeException e) {
            txManager.rollback(tx);   // Added behavior AFTER (failure)
            throw e;
        }
    }
}
```

---

## 4. JDK Dynamic Proxy

### What is it?

Creates a proxy **at runtime** using Java's built-in `java.lang.reflect.Proxy`. Works **only with interfaces**.

### How It Works

```java
// Your interface
public interface PaymentService {
    void processPayment(BigDecimal amount);
}

// Your implementation
@Service
public class PaymentServiceImpl implements PaymentService {
    @Transactional
    public void processPayment(BigDecimal amount) {
        // ...
    }
}
```

```java
// What JDK Proxy creates (conceptually)
PaymentService proxy = (PaymentService) Proxy.newProxyInstance(
    classLoader,
    new Class<?>[] { PaymentService.class },
    new InvocationHandler() {
        @Override
        public Object invoke(Object proxy, Method method, Object[] args) {
            // Before advice
            beginTransaction();
            
            try {
                Object result = method.invoke(actualPaymentServiceImpl, args);
                commitTransaction();
                return result;
            } catch (Exception e) {
                rollbackTransaction();
                throw e;
            }
        }
    }
);
```

### Key Points

| Aspect | JDK Dynamic Proxy |
|--------|-------------------|
| Requirement | Target must implement an interface |
| Proxy type | Implements same interface |
| Performance | Slightly slower at runtime |
| Creation | Faster to create |
| Uses | Reflection-based invocation |

---

## 5. CGLIB Proxy

### What is it?

Creates a proxy by **generating a subclass** of your class at runtime. Works with classes that **don't implement interfaces**.

### How It Works

```java
@Service
public class OrderService {  // No interface
    
    @Transactional
    public void placeOrder(Order order) {
        // ...
    }
}
```

```java
// What CGLIB creates (conceptually)
public class OrderService$$EnhancerByCGLIB extends OrderService {
    
    @Override
    public void placeOrder(Order order) {
        // Before: begin transaction
        beginTransaction();
        
        try {
            super.placeOrder(order);  // Call parent (your code)
            commitTransaction();
        } catch (RuntimeException e) {
            rollbackTransaction();
            throw e;
        }
    }
}
```

### Key Points

| Aspect | CGLIB Proxy |
|--------|-------------|
| Requirement | Class cannot be `final` |
| Proxy type | Subclass of your class |
| Performance | Faster at runtime |
| Creation | Slower to create |
| Uses | Bytecode generation |

---

## 6. Proxy Selection Rules

### Spring Boot Default (Since 2.0)

**CGLIB is the default**, even if your class implements interfaces.

```yaml
# application.properties
spring.aop.proxy-target-class=true   # Default in Spring Boot 2+
```

### When Each Is Used

```text
Decision Flow:
─────────────────────────────────────────────────────────
                    ┌─────────────────────┐
                    │ Does class have     │
                    │ @Transactional/AOP? │
                    └─────────┬───────────┘
                              │ YES
                              ▼
                    ┌─────────────────────┐
                    │ Spring Boot 2.0+?   │
                    └─────────┬───────────┘
                        │           │
                       YES          NO
                        │           │
                        ▼           ▼
                ┌──────────┐   ┌───────────────────┐
                │  CGLIB   │   │ Implements iface? │
                └──────────┘   └─────────┬─────────┘
                                    │        │
                                   YES       NO
                                    │        │
                                    ▼        ▼
                            ┌─────────┐  ┌──────────┐
                            │JDK Proxy│  │  CGLIB   │
                            └─────────┘  └──────────┘
```

### Force JDK Proxy

```java
@Configuration
@EnableTransactionManagement(proxyTargetClass = false)  // Use JDK proxy
public class AppConfig { }
```

---

## 7. Limitations of Proxies (Interview Favorite!)

### Limitation 1: Final Methods Cannot Be Proxied

```java
@Service
public class CacheService {
    
    @Cacheable("items")
    public final Item getItem(Long id) {  // ❌ FINAL - Proxy can't override!
        return repository.findById(id);
    }
}
// Result: @Cacheable is SILENTLY IGNORED!
```

**Why?** CGLIB creates a subclass. In Java, subclasses cannot override `final` methods.

### Limitation 2: Final Classes Cannot Be Proxied

```java
@Service
public final class SecurityService {  // ❌ FINAL class
    
    @Transactional
    public void audit(String action) {
        // ...
    }
}
// Result: Application fails to start (or no transaction)
```

**Why?** CGLIB can't extend a `final` class.

### Limitation 3: Self-Invocation Bypasses Proxy (MOST IMPORTANT!)

```java
@Service
public class OrderService {
    
    @Transactional
    public void processOrder(Order order) {
        // Direct call - bypasses proxy!
        this.validateAndSave(order);  // ❌ No transaction!
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void validateAndSave(Order order) {
        // This @Transactional is IGNORED
        orderRepository.save(order);
    }
}
```

**Visual explanation:**

```text
External Call (✅ WORKS):
┌────────────┐      ┌─────────────────┐      ┌───────────────┐
│  Caller    │─────▶│  OrderService   │─────▶│ validateAnd   │
│            │      │     PROXY       │      │ Save (actual) │
└────────────┘      └─────────────────┘      └───────────────┘
                     ↑ Transaction HERE

Self-Invocation (❌ BROKEN):
┌────────────┐      ┌─────────────────┐      ┌───────────────┐
│  Caller    │─────▶│  OrderService   │      │ validateAnd   │
│            │      │     PROXY       │      │ Save (actual) │
└────────────┘      └────────┬────────┘      └───────────────┘
                             │                       ↑
                             │   ┌────────────────┐  │
                             └──▶│ processOrder   │──┘
                                 │ (actual bean)  │ Direct call
                                 │ this.validate  │ NO PROXY!
                                 └────────────────┘
```

### Limitation 4: Private Methods Cannot Be Proxied

```java
@Service
public class MyService {
    
    @Transactional  // ❌ IGNORED - private method
    private void helper() {
        // ...
    }
}
```

**Why?** Proxies only intercept `public` methods.

### Limitation 5: Protected/Package-Private Might Not Work

With JDK proxies, **only interface methods** work. Protected methods won't be proxied.

---

## 8. How @Transactional Depends on Proxies

### The Complete Flow

```text
1. Application starts
   ↓
2. Spring scans for @Transactional
   ↓
3. BeanPostProcessor creates PROXY for those beans
   ↓
4. Proxy is registered in container (not your bean!)
   ↓
5. When you @Autowire OrderService, you get the PROXY
   ↓
6. Proxy intercepts calls and manages transactions
```

### Code Demonstration

```java
@Service
public class OrderService {
    
    @Transactional
    public void placeOrder(Order order) {
        orderRepository.save(order);
    }
}

@RestController
public class OrderController {
    
    @Autowired
    private OrderService orderService;  // This is the PROXY!
    
    @PostMapping("/orders")
    public void create(@RequestBody Order order) {
        // This prints: OrderService$$EnhancerBySpringCGLIB$$abc123
        System.out.println(orderService.getClass().getName());
        
        orderService.placeOrder(order);  // Goes through proxy
    }
}
```

---

## 9. Solutions for Self-Invocation

### Solution 1: Inject Self (Most Common)

```java
@Service
public class OrderService {
    
    @Autowired
    private OrderService self;  // Inject the PROXY
    
    public void processOrder(Order order) {
        self.validateAndSave(order);  // ✅ Goes through proxy
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void validateAndSave(Order order) {
        orderRepository.save(order);
    }
}
```

### Solution 2: Extract to Separate Service

```java
@Service
public class OrderService {
    
    @Autowired
    private OrderValidationService validationService;
    
    public void processOrder(Order order) {
        validationService.validateAndSave(order);  // ✅ Different bean = proxy
    }
}

@Service
public class OrderValidationService {
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void validateAndSave(Order order) {
        orderRepository.save(order);
    }
}
```

### Solution 3: AopContext (Less Preferred)

```java
@Service
public class OrderService {
    
    public void processOrder(Order order) {
        // Get proxy from AOP context
        ((OrderService) AopContext.currentProxy()).validateAndSave(order);
    }
    
    @Transactional
    public void validateAndSave(Order order) {
        orderRepository.save(order);
    }
}

// Must enable in config
@EnableAspectJAutoProxy(exposeProxy = true)
```

---

## 10. How @Async Depends on Proxies

Same mechanism as `@Transactional`:

```java
@Service
public class NotificationService {
    
    @Async
    public void sendEmail(String to) {
        // Runs in separate thread
    }
}
```

**Without proxy, @Async does nothing:**

```java
@Service
public class MyService {
    
    public void doWork() {
        this.sendEmailAsync("user@example.com");  // ❌ Runs synchronously!
    }
    
    @Async
    public void sendEmailAsync(String to) {
        // NOT async when called internally
    }
}
```

---

## 11. Code Examples

### ✅ Correct Usage

```java
@Service
public class PaymentService {
    
    private final PaymentService self;
    private final PaymentRepository repository;
    
    public PaymentService(@Lazy PaymentService self, PaymentRepository repository) {
        this.self = self;
        this.repository = repository;
    }
    
    public void processPayment(Payment payment) {
        // Validation (no transaction needed)
        validate(payment);
        
        // Call through proxy for transaction
        self.savePayment(payment);
    }
    
    @Transactional
    public void savePayment(Payment payment) {
        repository.save(payment);
        // Transaction commits here
    }
    
    private void validate(Payment payment) {
        // Private helper - no proxy needed
        if (payment.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
    }
}
```

### ❌ Broken: Final Method

```java
@Service
public class CacheService {
    
    @Cacheable("products")
    public final Product getProduct(Long id) {  // ❌ final = no caching!
        return repository.findById(id).orElseThrow();
    }
}
```

### Check if Bean is Proxied

```java
@Component
public class ProxyChecker implements ApplicationRunner {
    
    @Autowired
    private OrderService orderService;
    
    @Override
    public void run(ApplicationArguments args) {
        System.out.println("Is proxy? " + AopUtils.isAopProxy(orderService));
        System.out.println("Is CGLIB? " + AopUtils.isCglibProxy(orderService));
        System.out.println("Is JDK? " + AopUtils.isJdkDynamicProxy(orderService));
        System.out.println("Actual class: " + AopProxyUtils.ultimateTargetClass(orderService));
    }
}
```

---

## 12. Common Interview Questions

### Q1: Why doesn't @Transactional work on private methods?

**Answer:**
> "Spring uses proxies to implement @Transactional. Proxies can only intercept public methods because they work by either implementing an interface (JDK proxy) or creating a subclass (CGLIB). Private methods can't be overridden in subclasses and aren't part of interfaces, so they bypass the proxy entirely."

### Q2: What's the self-invocation problem?

**Answer:**
> "When a method calls another method in the same class using 'this', it bypasses the proxy. The proxy only intercepts external calls. So if methodA() calls this.methodB() where methodB() has @Transactional, no transaction is created. The solution is to inject the bean into itself and call through that reference."

### Q3: CGLIB vs JDK Proxy - when to use which?

**Answer:**
> "Spring Boot 2.0+ uses CGLIB by default because it works with classes that don't implement interfaces. JDK proxy is slightly faster to create but only works with interfaces. CGLIB is faster at runtime but can't proxy final classes or methods. For most applications, the default CGLIB is fine."

### Q4: Why do final methods break @Transactional?

**Answer:**
> "CGLIB creates a subclass of your bean to intercept method calls. In Java, final methods cannot be overridden in subclasses. So CGLIB can't add transaction logic around final methods - calls go directly to the original method without any proxy behavior."

---

## 13. Traps & Pitfalls

### Trap 1: Kotlin Classes Are Final by Default

```kotlin
@Service
class UserService {  // Implicitly final in Kotlin!
    
    @Transactional
    fun createUser(user: User) {
        // Won't work unless class is 'open'
    }
}

// Solution: Use allopen plugin or 'open' keyword
@Service
open class UserService {
    @Transactional
    open fun createUser(user: User) { ... }
}
```

### Trap 2: Lombok @Data Generates Final on Fields, Not Methods

This is fine for proxies, but be careful with:

```java
@Data
@Service
public class MyService {
    private final String config;  // final field = OK
    
    @Transactional
    public void process() { }  // NOT final = OK
}
```

### Trap 3: Proxy Doesn't Apply During Construction

```java
@Service
public class MyService {
    
    public MyService() {
        this.initialize();  // ❌ Proxy doesn't exist yet!
    }
    
    @Transactional
    public void initialize() {
        // No transaction - bean isn't fully constructed
    }
}

// Use @PostConstruct instead
@PostConstruct
public void init() {
    self.initialize();  // ✅ Proxy exists now
}
```

---

## 14. How to Explain in Interview

> **Short answer (30 seconds):**
> "Spring uses proxies to add behavior like transactions and caching without modifying our code. When we call a method on a Spring bean, we're actually calling a proxy that wraps our code, adding transaction management before and after. This only works for external calls - internal method calls bypass the proxy, which is why self-invocation breaks @Transactional."

> **Real-world analogy:**
> "It's like calling a company's customer service. You don't talk directly to the engineer (your bean). You talk to a receptionist (proxy) who logs your call, routes it to the right person, and follows up. But if engineers talk to each other internally, they skip the receptionist - that's self-invocation."

---

## 15. Quick Reference

```text
PROXY TYPES
─────────────────────────────────────────────────────
JDK Dynamic Proxy:
  - Requires interface
  - Uses java.lang.reflect.Proxy
  - Slightly slower at runtime

CGLIB Proxy (Spring Boot default):
  - Creates subclass
  - Works without interface
  - Can't proxy final class/methods

WHAT BREAKS PROXIES
─────────────────────────────────────────────────────
❌ final methods - CGLIB can't override
❌ final classes - CGLIB can't extend
❌ private methods - not visible to proxy
❌ self-invocation (this.method()) - bypasses proxy
❌ calls during construction - proxy not ready

SELF-INVOCATION SOLUTIONS
─────────────────────────────────────────────────────
1. @Autowired private MyService self;
2. Extract to separate service
3. AopContext.currentProxy() (less preferred)

HOW ANNOTATIONS USE PROXIES
─────────────────────────────────────────────────────
@Transactional → TransactionInterceptor
@Async → AsyncExecutionInterceptor
@Cacheable → CacheInterceptor
@Secured → MethodSecurityInterceptor
```

---

**Next:** [Servlet & Web Model →](./07-servlet-web-model)
