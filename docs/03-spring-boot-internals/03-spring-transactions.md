---
title: 3. Spring Transactions & Common Pitfalls
sidebar_position: 3
description: Master @Transactional annotation, self-invocation problem, rollback rules, and propagation.
keywords: [spring transactions, transactional annotation, self-invocation, rollback, acid, propagation]
---

# Spring Transactions & Common Pitfalls

:::danger Interview Alert
The **self-invocation problem** catches many developers. Understanding why `@Transactional` sometimes "doesn't work" is critical for senior roles. This topic has the highest trap density!
:::

---

## 1. What is Spring Transaction Management?

### Simple Explanation

**Spring wraps your database operations in a transaction automatically** when you use `@Transactional`. You don't write `BEGIN TRANSACTION` and `COMMIT` manually - Spring does it for you through proxies.

### Why Does Spring Need This?

| Without Spring Transactions | With @Transactional |
|-----------------------------|---------------------|
| Manual begin/commit/rollback | Automatic |
| Try-catch everywhere | Declarative annotations |
| Easy to forget rollback | Always rolls back on error |
| Boilerplate code | Clean business logic |
| Inconsistent handling | Consistent behavior |

### The ACID Problem It Solves

```java
// ❌ WITHOUT proper transactions
public void transferMoney(Account from, Account to, BigDecimal amount) {
    from.debit(amount);         // Succeeds
    // CRASH HERE → Money disappeared!
    to.credit(amount);          // Never runs
}

// ✅ WITH @Transactional
@Transactional
public void transferMoney(Account from, Account to, BigDecimal amount) {
    from.debit(amount);         // Part of transaction
    // If ANY exception → BOTH rolled back
    to.credit(amount);          // Part of transaction
    // COMMIT happens here (or ROLLBACK on exception)
}
```

---

## 2. How @Transactional Works Internally

### The Proxy Mechanism

When you add `@Transactional`, Spring creates a **proxy** around your class that:
1. Opens a transaction before your method
2. Calls your actual method
3. Commits on success OR rolls back on exception

```text
EXTERNAL CALL (how it should be called):
┌────────────┐      ┌─────────────────────────┐      ┌─────────────────┐
│  Caller    │─────▶│  OrderService PROXY     │─────▶│  OrderService   │
│ (Controller)      │  [BEGIN TX]             │      │  (your code)    │
└────────────┘      │  [call target]          │      └─────────────────┘
                    │  [COMMIT/ROLLBACK]      │
                    └─────────────────────────┘
```

### Sequence Diagram

```text
1. Controller calls orderService.placeOrder(order)
        │
        ▼ (actually calls the PROXY)
2. Proxy: TransactionInterceptor.invoke()
        │
        ▼
3. Proxy: PlatformTransactionManager.getTransaction()
        │
        ▼
4. Proxy: Get connection from DataSource
        │
        ▼
5. Proxy: connection.setAutoCommit(false)  // BEGIN TX
        │
        ▼
6. Proxy: Call YOUR actual placeOrder() method
        │
        ├──→ Success: transactionManager.commit()
        │              connection.commit()
        │
        └──→ Exception: transactionManager.rollback()
                        connection.rollback()
```

### What Gets Created

```java
// Your code
@Service
public class PaymentService {
    @Transactional
    public void processPayment(Payment payment) {
        paymentRepository.save(payment);
    }
}

// What Spring generates (conceptually)
public class PaymentService$$EnhancerBySpringCGLIB extends PaymentService {
    
    private final PaymentService target;
    private final TransactionManager txManager;
    
    @Override
    public void processPayment(Payment payment) {
        TransactionStatus status = txManager.getTransaction(
            new DefaultTransactionDefinition()
        );
        
        try {
            target.processPayment(payment);  // YOUR code
            txManager.commit(status);
        } catch (RuntimeException e) {
            txManager.rollback(status);
            throw e;
        }
    }
}
```

---

## 3. The Self-Invocation Problem (CRITICAL!)

### What Happens

```java
@Service
public class OrderService {
    
    @Transactional
    public void processOrder(Order order) {
        // Some processing...
        
        this.saveAuditLog(order);  // ❌ NO TRANSACTION on saveAuditLog!
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveAuditLog(Order order) {
        // You EXPECT a new transaction here
        // But it runs in the SAME transaction (or none!)
        auditRepository.save(new AuditLog(order));
    }
}
```

### Why It Happens

```text
The Problem:
──────────────────────────────────────────────────────
When you call this.saveAuditLog(), you're calling the 
ACTUAL METHOD DIRECTLY, bypassing the proxy!

┌──────────────────────────────────────────────────────┐
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │            OrderService PROXY                 │  │
│  │                                               │  │
│  │  processOrder() {                             │  │
│  │     tx.begin();                               │  │
│  │     target.processOrder(); ────────┐          │  │
│  │     tx.commit();                   │          │  │
│  │  }                                 │          │  │
│  │                                    ▼          │  │
│  │  ┌─────────────────────────────────────────┐ │  │
│  │  │     OrderService (REAL OBJECT)          │ │  │
│  │  │                                         │ │  │
│  │  │  processOrder() {                       │ │  │
│  │  │      this.saveAuditLog() ──────────┐    │ │  │
│  │  │  }                                 │    │ │  │
│  │  │                                    │    │ │  │
│  │  │  saveAuditLog() { ◄────────────────┘    │ │  │
│  │  │      // NO PROXY involved!              │ │  │
│  │  │      // @Transactional IGNORED!         │ │  │
│  │  │  }                                      │ │  │
│  │  └─────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### Solutions

**Solution 1: Inject Self (Most Common)**

```java
@Service
public class OrderService {
    
    @Autowired
    private OrderService self;  // Inject the PROXY, not 'this'
    
    @Transactional
    public void processOrder(Order order) {
        // Call through proxy!
        self.saveAuditLog(order);  // ✅ Transaction applied
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveAuditLog(Order order) {
        auditRepository.save(new AuditLog(order));
    }
}
```

**Solution 2: Extract to Separate Service**

```java
@Service
public class OrderService {
    
    @Autowired
    private AuditService auditService;
    
    @Transactional
    public void processOrder(Order order) {
        auditService.saveAuditLog(order);  // ✅ Different bean = proxy
    }
}

@Service
public class AuditService {
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveAuditLog(Order order) {
        auditRepository.save(new AuditLog(order));
    }
}
```

**Solution 3: ApplicationContext Lookup (Last Resort)**

```java
@Service
public class OrderService implements ApplicationContextAware {
    
    private ApplicationContext context;
    
    @Override
    public void setApplicationContext(ApplicationContext context) {
        this.context = context;
    }
    
    @Transactional
    public void processOrder(Order order) {
        OrderService proxy = context.getBean(OrderService.class);
        proxy.saveAuditLog(order);  // ✅ Gets proxy from context
    }
}
```

---

## 4. Rollback Rules

### Default Behavior

| Exception Type | Rollback? |
|----------------|-----------|
| `RuntimeException` (unchecked) | ✅ YES |
| `Error` | ✅ YES |
| `Exception` (checked) | ❌ NO |

```java
@Transactional
public void riskyOperation() throws IOException {
    repository.save(entity);
    
    throw new IOException("File error");  // ❌ NO ROLLBACK!
    // Transaction commits despite exception!
}
```

### Customizing Rollback

```java
// Rollback for ALL exceptions
@Transactional(rollbackFor = Exception.class)
public void process() throws IOException {
    repository.save(entity);
    throw new IOException("Error");  // ✅ NOW it rolls back
}

// Rollback for specific checked exception
@Transactional(rollbackFor = {IOException.class, CustomException.class})
public void process() throws Exception { ... }

// DON'T rollback for specific runtime exception
@Transactional(noRollbackFor = BusinessException.class)
public void process() {
    repository.save(entity);
    throw new BusinessException("Expected");  // ❌ No rollback
    // Sometimes you WANT the transaction to commit
}
```

### The Try-Catch Trap

```java
@Transactional
public void processWithBadCatch() {
    try {
        repository.save(entity);
        throw new RuntimeException("Error!");
    } catch (Exception e) {
        log.error("Error occurred", e);
        // You caught it, but...
    }
}
// ⚠️ Transaction STILL rolls back!
// Why? Spring marks it as rollback-only when exception occurs
```

**Why this happens:**

```text
1. RuntimeException thrown
2. Spring's TransactionInterceptor sees it
3. Marks transaction as "rollback-only"
4. Your catch block runs
5. Method returns normally
6. Spring tries to commit
7. Sees "rollback-only" flag → ROLLBACK
8. UnexpectedRollbackException thrown!
```

**Solution if you want to COMMIT despite exception:**

```java
@Transactional
public void processWithProperHandling() {
    try {
        repository.save(entity);
        doRiskyThing();
    } catch (Exception e) {
        log.error("Error occurred, but continuing", e);
        // Use noRollbackFor, or don't let exception propagate to AOP
        entity.setStatus("FAILED");
        repository.save(entity);  // Save the failure state
    }
}
```

---

## 5. Propagation Types

### Quick Reference

| Propagation | Existing TX? | Behavior | Use Case |
|-------------|--------------|----------|----------|
| `REQUIRED` (default) | Yes → Join it | No → Create new | Normal operations |
| `REQUIRES_NEW` | Yes → Suspend it, create new | No → Create new | Audit logs |
| `NESTED` | Yes → Create savepoint | No → Create new | Batch jobs |
| `SUPPORTS` | Yes → Join it | No → Run without TX | Read-only lookups |
| `NOT_SUPPORTED` | Yes → Suspend it | No → Run without TX | Long running tasks |
| `MANDATORY` | Yes → Join it | No → **THROW EXCEPTION** | Must be in TX |
| `NEVER` | Yes → **THROW EXCEPTION** | No → Run without TX | Cannot be in TX |

### REQUIRES_NEW Deep Dive

```java
@Service
public class OrderService {
    
    @Autowired
    private AuditService auditService;
    
    @Transactional
    public void placeOrder(Order order) {
        // TX1 starts
        
        orderRepository.save(order);
        
        // TX1 is SUSPENDED
        auditService.logAudit("Order placed: " + order.getId());
        // TX2 COMMITTED (even if order fails later!)
        // TX1 RESUMED
        
        paymentService.charge(order);  // If this fails...
        // TX1 ROLLBACK - but audit log is already saved!
    }
}

@Service
public class AuditService {
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAudit(String action) {
        // TX2 starts (independent of TX1)
        auditRepository.save(new AuditLog(action));
        // TX2 commits HERE
    }
}
```

**Visual timeline:**

```text
Time →
──────────────────────────────────────────────────────────
TX1: [------OrderService.placeOrder()------]
           │                             │
           │  TX1 SUSPENDED              │  TX1 RESUMED
           ▼                             ▼
TX2:       [---AuditService.logAudit()---]
                    │
                    └─→ COMMITTED (independent!)

If placeOrder() fails after audit:
- TX1 rolls back (order not saved)
- TX2 already committed (audit log saved!)
```

### NESTED - Savepoints

```java
@Service
public class BatchProcessor {
    
    @Transactional
    public void processBatch(List<Item> items) {
        for (Item item : items) {
            try {
                processItem(item);  // Each gets a SAVEPOINT
            } catch (Exception e) {
                log.error("Item {} failed, continuing", item.getId());
                // Rolls back to savepoint, continues with rest
            }
        }
    }
    
    @Transactional(propagation = Propagation.NESTED)
    public void processItem(Item item) {
        // Creates SAVEPOINT within parent transaction
        itemRepository.save(item);
        externalService.notify(item);  // May fail
    }
}
```

---

## 6. Isolation Levels

### Problems They Solve

| Problem | Description | Example |
|---------|-------------|---------|
| **Dirty Read** | Read uncommitted data | TX1 updates, TX2 reads, TX1 rollback |
| **Non-Repeatable Read** | Same query, different results | TX1 reads, TX2 updates, TX1 reads again |
| **Phantom Read** | New rows appear | TX1 queries, TX2 inserts, TX1 queries again |

### Isolation Levels

| Level | Dirty Read | Non-Repeatable | Phantom |
|-------|------------|----------------|---------|
| `READ_UNCOMMITTED` | ⚠️ | ⚠️ | ⚠️ |
| `READ_COMMITTED` | ✅ | ⚠️ | ⚠️ |
| `REPEATABLE_READ` | ✅ | ✅ | ⚠️ |
| `SERIALIZABLE` | ✅ | ✅ | ✅ |

```java
@Transactional(isolation = Isolation.REPEATABLE_READ)
public BigDecimal calculateTotalBalance() {
    BigDecimal savings = accountRepo.getSavingsBalance();
    // Even if another transaction changes savings...
    BigDecimal checking = accountRepo.getCheckingBalance();
    // ...we still see the original value!
    return savings.add(checking);
}
```

### Default Isolation

```java
@Transactional(isolation = Isolation.DEFAULT)
// Uses the database's default:
// - PostgreSQL: READ_COMMITTED
// - MySQL InnoDB: REPEATABLE_READ
// - Oracle: READ_COMMITTED
```

---

## 7. @Transactional Best Practices

### ✅ DO

```java
// 1. Apply at service layer, not repository
@Service
public class OrderService {
    @Transactional
    public void placeOrder(Order order) { ... }
}

// 2. Keep transactions SHORT
@Transactional
public void process(Order order) {
    validateOrder(order);      // Quick
    calculateTotal(order);     // Quick
    saveOrder(order);          // Quick
    // ❌ Don't: sendEmail(order) - slow, external
}

// 3. Use readOnly for queries (optimization)
@Transactional(readOnly = true)
public List<Order> findAllOrders() {
    return orderRepository.findAll();
}

// 4. Always specify rollbackFor for checked exceptions
@Transactional(rollbackFor = Exception.class)
public void riskyOperation() throws Exception { ... }

// 5. Put @Transactional on interface OR implementation, not both
```

### ❌ DON'T

```java
// 1. Don't call external services in transaction
@Transactional
public void process(Order order) {
    orderRepository.save(order);
    httpClient.callPaymentApi(order);  // ❌ Holding DB connection!
}

// 2. Don't use on private methods
@Transactional  // ❌ IGNORED - proxy can't intercept
private void helper() { ... }

// 3. Don't catch exceptions and swallow them
@Transactional
public void process() {
    try {
        doWork();
    } catch (Exception e) {
        // ❌ Transaction may still rollback!
        log.error("Silently ignored", e);
    }
}

// 4. Don't use final methods or classes
@Service
public final class OrderService {  // ❌ CGLIB can't extend
    @Transactional
    public final void process() { }  // ❌ Can't override
}
```

---

## 8. Common Real-World Failures

### Failure 1: Transaction Not Applied

**Symptoms:** Data not rolled back on exception

**Causes:**
- Self-invocation (calling `this.method()`)
- Private method has `@Transactional`
- No `@EnableTransactionManagement` (rare in Spring Boot)
- Final method/class

**Debug:**

```java
@RestController
public class DebugController {
    
    @Autowired
    private OrderService orderService;
    
    @GetMapping("/debug")
    public String debug() {
        // Check if it's a proxy
        return "Is proxy: " + AopUtils.isAopProxy(orderService) + 
               "\nProxy type: " + orderService.getClass().getName();
    }
}
// Expected: OrderService$$EnhancerBySpringCGLIB$$abc123
```

### Failure 2: Connection Pool Exhaustion

**Symptoms:** Application hangs, timeout errors

**Cause:** Long-running transactions hold connections

```yaml
# Detect with logging
logging:
  level:
    org.springframework.transaction: DEBUG
    com.zaxxer.hikari: DEBUG
```

### Failure 3: Unexpected Rollback

**Symptoms:** `UnexpectedRollbackException` thrown

**Cause:** Inner method marked transaction as rollback-only

```java
@Service
public class OuterService {
    
    @Transactional
    public void outer() {
        try {
            innerService.inner();  // Throws, marks rollback-only
        } catch (Exception e) {
            // You caught it... but transaction is doomed
        }
        // COMMIT attempted here
        // → UnexpectedRollbackException!
    }
}
```

**Solution:** Use `REQUIRES_NEW` for inner if it should have independent lifecycle.

---

## 9. Code Examples

### Complete Transaction Service

```java
@Service
@Transactional  // Class-level default
public class PaymentService {
    
    private final PaymentRepository paymentRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;
    
    public PaymentService(PaymentRepository paymentRepository,
                          AuditService auditService,
                          NotificationService notificationService) {
        this.paymentRepository = paymentRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }
    
    @Transactional(rollbackFor = Exception.class)
    public Payment processPayment(PaymentRequest request) throws PaymentException {
        // 1. Create payment record
        Payment payment = new Payment(request);
        payment = paymentRepository.save(payment);
        
        // 2. Audit in separate transaction (always saved)
        auditService.logPaymentAttempt(payment);
        
        // 3. Process with external provider
        try {
            PaymentResult result = paymentGateway.charge(request);
            payment.setStatus(PaymentStatus.COMPLETED);
            payment.setTransactionId(result.getTransactionId());
        } catch (PaymentGatewayException e) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setErrorMessage(e.getMessage());
            throw new PaymentException("Payment failed", e);
        }
        
        return paymentRepository.save(payment);
    }
    
    @Transactional(readOnly = true)
    public List<Payment> findPaymentsByUser(Long userId) {
        return paymentRepository.findByUserId(userId);
    }
}

@Service
public class AuditService {
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logPaymentAttempt(Payment payment) {
        // Always commits, even if parent transaction fails
        auditRepository.save(new AuditLog("PAYMENT", payment.getId()));
    }
}
```

### Testing Transactions

```java
@SpringBootTest
@Transactional  // Each test rolls back automatically!
class OrderServiceTest {
    
    @Autowired
    private OrderService orderService;
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Test
    void shouldRollbackOnException() {
        Order order = new Order();
        
        assertThrows(PaymentException.class, () -> 
            orderService.placeOrder(order)
        );
        
        // Verify rollback
        assertEquals(0, orderRepository.count());
    }
    
    @Test
    void shouldCommitSuccessfulOrder() {
        Order order = new Order();
        
        orderService.placeOrder(order);
        
        assertEquals(1, orderRepository.count());
        // But still rolls back after test due to @Transactional!
    }
}
```

---

## 10. Common Interview Questions

### Q1: What's the self-invocation problem?

**Answer:**
> "When a method calls another method in the same class using `this`, it bypasses the Spring proxy. Since `@Transactional` works through proxies, the annotation on the called method is ignored. The solution is to inject the bean into itself and call through that reference, or extract the method to a separate service."

### Q2: Why doesn't @Transactional work on private methods?

**Answer:**
> "Spring creates proxies to implement `@Transactional`. With CGLIB (default), it creates a subclass. Private methods can't be overridden by subclasses, so the proxy can't intercept them. With JDK proxy, only interface methods are proxied. Either way, private methods bypass the proxy."

### Q3: When does @Transactional NOT rollback?

**Answer:**
> "By default, it only rolls back for unchecked exceptions (RuntimeException) and Errors. Checked exceptions like IOException don't trigger rollback unless you specify `rollbackFor = Exception.class`. Also, if you catch an exception inside the method without rethrowing, Spring may have already marked the transaction as rollback-only."

### Q4: Explain REQUIRES_NEW vs NESTED propagation.

**Answer:**
> "`REQUIRES_NEW` suspends the current transaction entirely and creates a new independent one. If the outer fails, the inner still commits. `NESTED` creates a savepoint within the current transaction. If the nested part fails, you can rollback to the savepoint but continue the main transaction. However, if the outer fails, everything including nested work is rolled back."

---

## 11. Traps & Pitfalls

### Trap 1: @Transactional on @Async Method

```java
@Async
@Transactional
public void asyncWithTx(Data data) {
    // The transaction might not work as expected!
    // @Async runs in a different thread
    // Transaction is bound to thread
}
```

**Solution:** Move transactional logic to a separate method called from async.

### Trap 2: Testing with @Transactional

```java
@Test
@Transactional
void testOrder() {
    orderService.createOrder(order);
    
    // This assertion might fail!
    // Data might not be visible in the same transaction
    assertEquals(1, orderRepository.count());
    
    // Also: changes are rolled back after test
    // So checking with external tools won't show data
}
```

### Trap 3: Multiple DataSources

```java
@Transactional  // Which transaction manager?
public void process() {
    primaryRepo.save(data);
    secondaryRepo.save(data);  // Different database!
}

// Solution: Specify transaction manager
@Transactional("secondaryTransactionManager")
public void processSecondary() { ... }
```

---

## 12. How to Explain in Interview

> **Short answer (30 seconds):**
> "Spring uses proxies to implement `@Transactional`. When you call a transactional method, you actually call a proxy that begins a transaction, invokes your method, and commits or rolls back based on the outcome. The key gotcha is self-invocation - calling methods internally bypasses the proxy, so the inner `@Transactional` is ignored."

> **Real-world analogy:**
> "It's like a bank's security checkpoint. Every transaction must go through the checkpoint (proxy). If you're inside the bank (same class) and hand money to a colleague, you're not going through the checkpoint - the security rules don't apply. To enforce rules on internal transfers, the colleague would have to walk out and re-enter through the checkpoint."

---

## 13. Quick Reference

```text
TRANSACTION DEFAULTS
──────────────────────────────────────────────────────
Propagation: REQUIRED (join or create)
Isolation: DEFAULT (database default)
Rollback: RuntimeException + Error only
ReadOnly: false
Timeout: -1 (no timeout)

SELF-INVOCATION FIX
──────────────────────────────────────────────────────
@Autowired private MyService self;
self.method();  // Goes through proxy

PROPAGATION QUICK REFERENCE
──────────────────────────────────────────────────────
REQUIRED → Join existing or create new
REQUIRES_NEW → Always new (audit logs)
NESTED → Savepoint in existing
SUPPORTS → Join if exists, else none
NOT_SUPPORTED → Suspend existing
MANDATORY → Must be in transaction (throws if not)
NEVER → Must NOT be in transaction (throws if yes)

COMMON ISSUES
──────────────────────────────────────────────────────
"TX not applied" → Check proxy, self-invocation, private
"Unexpected rollback" → Inner method threw exception
"Connection exhausted" → TX too long, check for HTTP calls
```

---

**Next:** [Async Processing & Thread Pools →](./04-async-processing)
