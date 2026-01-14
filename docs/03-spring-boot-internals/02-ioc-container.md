---
title: 2. Spring IoC Container Deep Dive
sidebar_position: 2
description: Master the Spring IoC container, Bean lifecycle, and dependency injection for interviews.
keywords: [spring ioc, dependency injection, beanfactory, applicationcontext, bean lifecycle, beanpostprocessor]
---

# Spring IoC Container Deep Dive

:::info Interview Favorite
"Explain the difference between BeanFactory and ApplicationContext" is asked in **90%+ of Spring interviews**. Understanding IoC is fundamental to Spring mastery.
:::

---

## 1. What is IoC (Inversion of Control)?

### Simple Explanation

**IoC means the framework controls object creation, not you.** Instead of your code saying "I need a PaymentService, let me create one," Spring says "Here's a PaymentService I created and configured for you."

### Why Does Spring Need This?

| Problem Without IoC | Solution With IoC |
|---------------------|-------------------|
| You create dependencies manually | Spring creates and wires them |
| Hard to swap implementations | Just change configuration |
| Testing requires real objects | Inject mocks easily |
| Lifecycle management is manual | Spring handles lifecycle |
| Tight coupling between classes | Loose coupling via interfaces |

### How It Works Internally

```text
APPLICATION STARTUP
───────────────────────────────────────────────────────
1. Spring scans for @Component, @Service, @Repository, @Controller
   ↓
2. Creates BeanDefinition for each (metadata about the bean)
   ↓
3. Resolves dependencies between beans
   ↓
4. Creates beans in correct order (dependencies first)
   ↓
5. Injects dependencies via constructor/setter/field
   ↓
6. Runs lifecycle callbacks (@PostConstruct, etc.)
   ↓
7. Beans ready to use!
```

---

## 2. Dependency Injection Types

### Constructor Injection (✅ Recommended)

```java
@Service
public class OrderService {
    
    private final PaymentService paymentService;  // Immutable
    private final InventoryService inventoryService;
    
    // All dependencies in constructor - obvious what's required
    public OrderService(PaymentService paymentService, 
                        InventoryService inventoryService) {
        this.paymentService = paymentService;
        this.inventoryService = inventoryService;
    }
}
```

**Why constructor injection is preferred:**
- Dependencies are **final** (immutable)
- Class cannot be created without dependencies (fail-fast)
- Easy to write unit tests (just pass mocks in constructor)
- Makes dependencies **explicit**

### Setter Injection

```java
@Service
public class OrderService {
    
    private PaymentService paymentService;
    
    @Autowired
    public void setPaymentService(PaymentService paymentService) {
        this.paymentService = paymentService;
    }
}
```

**Use when:** Dependency is **optional** or needs to be changed at runtime.

### Field Injection (⚠️ Avoid in Production)

```java
@Service
public class OrderService {
    
    @Autowired
    private PaymentService paymentService;  // ❌ Hard to test!
}
```

**Problems:**
- Cannot make fields final
- Reflection needed to set in tests
- Hides dependencies from constructor
- Makes class harder to reason about

---

## 3. BeanFactory vs ApplicationContext

### BeanFactory (Basic Container)

```java
// Old way - rarely used now
BeanFactory factory = new XmlBeanFactory(new ClassPathResource("beans.xml"));
MyBean bean = factory.getBean(MyBean.class);  // Bean created NOW (lazy)
```

**Characteristics:**
- **Lazy initialization** - beans created when first requested
- Minimal features
- Lower memory footprint
- Used internally by Spring

### ApplicationContext (Feature-Rich Container)

```java
// Modern way
ApplicationContext context = new AnnotationConfigApplicationContext(AppConfig.class);
MyBean bean = context.getBean(MyBean.class);  // Already created at startup
```

**Characteristics:**
- **Eager initialization** - singleton beans created at startup
- Event publishing mechanism
- Internationalization (i18n) support
- Environment and property resolution
- Automatic BeanPostProcessor registration

### Interview Comparison

| Feature | BeanFactory | ApplicationContext |
|---------|-------------|-------------------|
| Initialization | Lazy | Eager (singletons) |
| Event publishing | ❌ | ✅ |
| i18n support | ❌ | ✅ |
| BeanPostProcessor auto-registration | ❌ | ✅ |
| AOP integration | Manual | Automatic |
| Use in production | Rarely | Always |

### Interview Answer Template

> "ApplicationContext extends BeanFactory and adds enterprise features like event publishing, internationalization, and annotation configuration. Most importantly, it eagerly initializes singleton beans at startup, which helps fail-fast if there are configuration errors like missing dependencies."

---

## 4. Bean Creation Flow (Internal Process)

### Step-by-Step Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                    BEAN CREATION FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Load Bean Definitions                                   │
│     ├── Scan @Component classes                             │
│     ├── Read @Bean methods in @Configuration                │
│     └── Store as BeanDefinition objects                     │
│                                                             │
│  2. BeanFactory Post-Processing                             │
│     └── Modify bean definitions (PropertyPlaceholder, etc.) │
│                                                             │
│  3. Instantiate Beans (in dependency order)                 │
│     ├── Use constructor reflection                          │
│     └── Resolve constructor arguments (@Autowired)          │
│                                                             │
│  4. Populate Properties                                     │
│     ├── Field injection (@Autowired fields)                 │
│     └── Setter injection (@Autowired setters)               │
│                                                             │
│  5. Bean Post-Processing (BEFORE init)                      │
│     └── BeanPostProcessor.postProcessBeforeInitialization   │
│                                                             │
│  6. Initialization                                          │
│     ├── @PostConstruct method                               │
│     ├── InitializingBean.afterPropertiesSet()               │
│     └── Custom init-method                                  │
│                                                             │
│  7. Bean Post-Processing (AFTER init)                       │
│     └── BeanPostProcessor.postProcessAfterInitialization    │
│     └── THIS IS WHERE PROXIES ARE CREATED!                  │
│                                                             │
│  8. Bean Ready for Use                                      │
│                                                             │
│  9. Destruction (on container shutdown)                     │
│     ├── @PreDestroy method                                  │
│     ├── DisposableBean.destroy()                            │
│     └── Custom destroy-method                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Bean Lifecycle Callbacks

### All Callback Methods

```java
@Component
public class DataSourceBean implements InitializingBean, DisposableBean, 
                                       BeanNameAware, BeanFactoryAware {
    
    private String beanName;
    private BeanFactory beanFactory;
    
    // 1. Constructor
    public DataSourceBean() {
        System.out.println("1. Constructor called");
    }
    
    // 2. Dependency injection happens here
    
    // 3. Awareness interfaces (rarely needed)
    @Override
    public void setBeanName(String name) {
        System.out.println("3a. BeanNameAware - name: " + name);
        this.beanName = name;
    }
    
    @Override
    public void setBeanFactory(BeanFactory factory) {
        System.out.println("3b. BeanFactoryAware");
        this.beanFactory = factory;
    }
    
    // 4. BeanPostProcessor.postProcessBeforeInitialization (external)
    
    // 5. @PostConstruct (MOST COMMONLY USED)
    @PostConstruct
    public void init() {
        System.out.println("5. @PostConstruct - initialization logic");
    }
    
    // 6. InitializingBean interface
    @Override
    public void afterPropertiesSet() {
        System.out.println("6. afterPropertiesSet()");
    }
    
    // 7. BeanPostProcessor.postProcessAfterInitialization (external)
    // Proxies created here!
    
    // 8. Bean is ready
    
    // 9. @PreDestroy (cleanup)
    @PreDestroy
    public void cleanup() {
        System.out.println("9. @PreDestroy - cleanup resources");
    }
    
    // 10. DisposableBean interface
    @Override
    public void destroy() {
        System.out.println("10. destroy()");
    }
}
```

### Output Order

```text
1. Constructor called
3a. BeanNameAware - name: dataSourceBean
3b. BeanFactoryAware
5. @PostConstruct - initialization logic
6. afterPropertiesSet()

... application runs ...

9. @PreDestroy - cleanup resources
10. destroy()
```

---

## 6. @PostConstruct vs InitializingBean

### When to Use Each

| Aspect | @PostConstruct | InitializingBean |
|--------|----------------|------------------|
| Type | Annotation | Interface |
| Coupling | Low (JSR-250) | High (Spring) |
| Multiple methods | Yes | No (one method) |
| Recommended | ✅ Yes | ⚠️ Only if needed |
| Use case | Normal init | Framework code |

### Common @PostConstruct Use Cases

```java
@Service
public class CacheService {
    
    @Autowired
    private CacheRepository repository;
    
    private Map<String, Object> cache;
    
    @PostConstruct
    public void loadCache() {
        // ✅ Dependencies are already injected here!
        // Safe to use repository
        this.cache = repository.findAll()
            .stream()
            .collect(Collectors.toMap(Item::getKey, Item::getValue));
        
        log.info("Loaded {} items into cache", cache.size());
    }
}
```

```java
@Component
public class HealthChecker {
    
    @Value("${external.service.url}")
    private String serviceUrl;
    
    @PostConstruct
    public void validateConfiguration() {
        // Fail fast if misconfigured
        if (serviceUrl == null || serviceUrl.isEmpty()) {
            throw new IllegalStateException("external.service.url must be configured!");
        }
    }
}
```

---

## 7. BeanPostProcessor (Advanced)

### What is it?

A **hook** that allows you to modify bean instances before and after initialization. Spring uses this internally to create proxies, process annotations, etc.

### How It Works

```java
@Component
public class TimingBeanPostProcessor implements BeanPostProcessor {
    
    private Map<String, Long> startTimes = new ConcurrentHashMap<>();
    
    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) {
        // Called BEFORE @PostConstruct
        startTimes.put(beanName, System.currentTimeMillis());
        return bean;  // Must return the bean (or a wrapper)
    }
    
    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) {
        // Called AFTER @PostConstruct
        // This is where Spring creates PROXIES!
        
        Long startTime = startTimes.remove(beanName);
        if (startTime != null) {
            long duration = System.currentTimeMillis() - startTime;
            if (duration > 100) {
                log.warn("Slow bean initialization: {} took {}ms", beanName, duration);
            }
        }
        
        return bean;  // Return bean or a PROXY wrapping it
    }
}
```

### Real-World Examples of BeanPostProcessors

```text
Spring's Built-in BeanPostProcessors:
──────────────────────────────────────────────────────
AutowiredAnnotationBeanPostProcessor
  → Processes @Autowired, @Value

CommonAnnotationBeanPostProcessor
  → Processes @PostConstruct, @PreDestroy, @Resource

AsyncAnnotationBeanPostProcessor
  → Creates proxies for @Async methods

TransactionAttributeSourcePointcut
  → Creates proxies for @Transactional
```

### Interview Question: How Does @Transactional Work?

```java
// Your code
@Service
public class PaymentService {
    @Transactional
    public void process() { ... }
}

// What Spring creates (simplified)
public class PaymentService$$EnhancerBySpringCGLIB extends PaymentService {
    private final TransactionInterceptor txInterceptor;
    
    @Override
    public void process() {
        TransactionStatus status = txInterceptor.createTransactionIfNecessary();
        try {
            super.process();  // Your actual code
            txInterceptor.commitTransactionAfterReturning(status);
        } catch (Throwable ex) {
            txInterceptor.completeTransactionAfterThrowing(status, ex);
            throw ex;
        }
    }
}
```

---

## 8. Code Examples

### ✅ Correct: Constructor Injection with Immutability

```java
@Service
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    
    // All dependencies explicit, immutable
    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }
    
    public User createUser(CreateUserRequest request) {
        String encoded = passwordEncoder.encode(request.getPassword());
        User user = new User(request.getEmail(), encoded);
        
        User saved = userRepository.save(user);
        emailService.sendWelcome(saved);
        
        return saved;
    }
}
```

### ❌ Wrong: Field Injection with Hidden Dependencies

```java
@Service
public class BadUserService {
    
    @Autowired
    private UserRepository userRepository;  // Hidden
    
    @Autowired
    private PasswordEncoder encoder;  // Hidden
    
    @Autowired
    private EmailService emailService;  // Hidden
    
    @Autowired
    private AuditService auditService;  // Hidden
    
    // How many dependencies? Have to read the whole class!
    // Testing requires reflection or Spring context
}
```

### @PostConstruct for Initialization

```java
@Component
public class ConfigurationValidator {
    
    @Value("${app.api.key}")
    private String apiKey;
    
    @Value("${app.api.url}")
    private String apiUrl;
    
    @PostConstruct
    public void validate() {
        List<String> errors = new ArrayList<>();
        
        if (apiKey == null || apiKey.length() < 32) {
            errors.add("app.api.key must be at least 32 characters");
        }
        
        if (apiUrl == null || !apiUrl.startsWith("https://")) {
            errors.add("app.api.url must start with https://");
        }
        
        if (!errors.isEmpty()) {
            throw new IllegalStateException(
                "Configuration errors:\n" + String.join("\n", errors)
            );
        }
        
        log.info("Configuration validated successfully");
    }
}
```

---

## 9. Common Interview Questions

### Q1: What's the difference between @Component, @Service, @Repository?

**Answer:**
> "Functionally identical - all register beans. The difference is semantic:
> - `@Component`: Generic bean
> - `@Service`: Business logic layer
> - `@Repository`: Data access layer (also enables exception translation)
> - `@Controller`: Web layer
> 
> Using the right annotation improves code readability and allows layer-specific processing."

### Q2: What happens if there are multiple beans of the same type?

**Answer:**
> "Spring throws `NoUniqueBeanDefinitionException`. Solutions:
> - `@Primary` on the preferred bean
> - `@Qualifier("beanName")` at injection point
> - Inject `List<Interface>` to get all implementations
> - Use `@ConditionalOnProperty` to conditionally create beans"

```java
@Configuration
public class DataSourceConfig {
    
    @Bean
    @Primary  // Default choice
    public DataSource primaryDataSource() { ... }
    
    @Bean("readReplica")
    public DataSource readReplicaDataSource() { ... }
}

@Service
public class UserService {
    
    public UserService(
            DataSource primary,                      // Gets @Primary
            @Qualifier("readReplica") DataSource replica) {  // Gets specific
        // ...
    }
}
```

### Q3: Explain circular dependency and how to resolve it.

**Answer:**
> "When Bean A depends on Bean B, and Bean B depends on Bean A. Spring can't decide which to create first."

```java
// ❌ CIRCULAR DEPENDENCY
@Service
public class OrderService {
    @Autowired private PaymentService paymentService;  // Needs PaymentService
}

@Service
public class PaymentService {
    @Autowired private OrderService orderService;  // Needs OrderService
}
```

**Solutions:**
```java
// Solution 1: @Lazy
@Service
public class OrderService {
    @Autowired @Lazy private PaymentService paymentService;
}

// Solution 2: Setter injection (breaks the cycle)
@Service
public class PaymentService {
    private OrderService orderService;
    
    @Autowired
    public void setOrderService(OrderService orderService) {
        this.orderService = orderService;
    }
}

// Solution 3: Refactor (BEST) - extract shared logic to third service
```

### Q4: What's the difference between @PostConstruct and constructor?

**Answer:**
> "In the constructor, dependencies haven't been injected yet (for field/setter injection). `@PostConstruct` runs after all injection is complete, so you can safely use dependencies there."

```java
@Service
public class MyService {
    
    @Autowired
    private Repository repository;  // NULL in constructor!
    
    public MyService() {
        // repository is NULL here!
        // repository.findAll();  // ❌ NullPointerException
    }
    
    @PostConstruct
    public void init() {
        // repository is injected here
        repository.findAll();  // ✅ Works
    }
}
```

---

## 10. Traps & Pitfalls

### Trap 1: Using 'new' Keyword Creates Unmanaged Objects

```java
@Service
public class OrderService {
    
    public void process() {
        // ❌ This PaymentService is NOT managed by Spring!
        // No @Transactional, no @Autowired, no AOP
        PaymentService payment = new PaymentService();
        payment.charge();  // Transactions won't work!
    }
}

// ✅ Correct: Inject it
@Service
public class OrderService {
    private final PaymentService paymentService;  // Spring managed
    
    public OrderService(PaymentService paymentService) {
        this.paymentService = paymentService;
    }
}
```

### Trap 2: Prototype Bean in Singleton

```java
@Service
public class SingletonService {
    
    @Autowired
    private PrototypeBean prototypeBean;  // Injected ONCE at startup!
    
    public void doWork() {
        prototypeBean.process();  // Same instance every time!
    }
}
```

**Solution: Use ObjectFactory or Provider** (See Bean Scope chapter)

### Trap 3: Static Methods Don't Go Through Proxy

```java
@Service
public class PaymentService {
    
    @Transactional
    public static void processPayment() {  // ❌ Static!
        // Transaction NOT applied - static doesn't use 'this'
    }
}
```

---

## 11. How to Explain in Interview

> **Short answer (30 seconds):**
> "IoC means Spring controls object creation instead of us. We declare our dependencies, Spring creates and wires them. This gives us loose coupling, easy testing, and centralized configuration. ApplicationContext is the feature-rich container that eagerly creates beans and supports events, while BeanFactory is the basic lazy-loading container."

> **Real-world analogy:**
> "It's like the difference between cooking at home vs. ordering at a restaurant. Without IoC, you buy ingredients, prepare everything yourself. With IoC (restaurant), you just order what you want, and the chef (Spring) prepares it with the right ingredients and brings it to you ready to use."

---

## 12. Quick Reference

```text
IOC CONTAINER
──────────────────────────────────────────────────────
BeanFactory: Basic, lazy loading
ApplicationContext: Full features, eager loading (use this!)

INJECTION TYPES (Preference Order)
──────────────────────────────────────────────────────
1. Constructor (required deps, immutable) ✅
2. Setter (optional deps)
3. Field (avoid - hard to test) ❌

BEAN LIFECYCLE ORDER
──────────────────────────────────────────────────────
Constructor → DI → @PostConstruct → afterPropertiesSet → init-method
                    ↓ (Bean Ready) ↓
@PreDestroy → destroy() → destroy-method

KEY ANNOTATIONS
──────────────────────────────────────────────────────
@Component → Generic bean
@Service → Business layer
@Repository → Data layer (+ exception translation)
@Controller → Web layer
@Configuration → Defines @Bean methods
@Bean → Factory method for creating bean

MULTIPLE BEANS RESOLUTION
──────────────────────────────────────────────────────
@Primary → Default choice
@Qualifier("name") → Specific bean
List<T> → Inject all of type
```

---

**Next:** [Spring Transactions & Common Pitfalls →](./03-spring-transactions)
