---
title: 2. Spring IoC Container Deep Dive
sidebar_position: 2
description: Master the Spring IoC container, Bean lifecycle, and dependency injection for interviews.
keywords: [spring ioc, dependency injection, beanfactory, applicationcontext, bean lifecycle]
---

# Spring IoC Container Deep Dive

:::info Interview Favorite
"Explain the difference between BeanFactory and ApplicationContext" is asked in **90%+ of Spring interviews**. Understanding IoC is fundamental to Spring mastery.
:::

## 1. Understanding Inversion of Control (IoC)

### What is IoC?

**Simple Explanation:** Instead of your code creating objects, Spring creates them for you and "injects" them where needed.

```java
// ❌ WITHOUT IoC - Tight coupling
public class OrderService {
    private PaymentService paymentService = new PaymentService(); // YOU create it
    private EmailService emailService = new EmailService();       // YOU create it
}

// ✅ WITH IoC - Loose coupling
public class OrderService {
    private final PaymentService paymentService;  // Spring INJECTS it
    private final EmailService emailService;      // Spring INJECTS it
    
    public OrderService(PaymentService paymentService, EmailService emailService) {
        this.paymentService = paymentService;
        this.emailService = emailService;
    }
}
```

### Interview Question: Why is IoC Important?

| Without IoC | With IoC |
|-------------|----------|
| Hard to test (can't mock dependencies) | Easy to test (inject mocks) |
| Tight coupling | Loose coupling |
| Hard to swap implementations | Easy to swap (just change config) |
| You manage object lifecycle | Spring manages lifecycle |

---

## 2. BeanFactory vs ApplicationContext

### BeanFactory (The Basic Container)
- **Lazy initialization** - Beans created when first requested
- Minimal features
- Lower memory footprint
- Rarely used directly in modern apps

### ApplicationContext (The Feature-Rich Container)
- **Eager initialization** - Singleton beans created at startup
- Extends BeanFactory with extra features
- Most commonly used in real applications

```java
// BeanFactory - Manual loading
BeanFactory factory = new XmlBeanFactory(new ClassPathResource("beans.xml"));
MyBean bean = factory.getBean(MyBean.class); // Created NOW

// ApplicationContext - Recommended
ApplicationContext context = new AnnotationConfigApplicationContext(AppConfig.class);
MyBean bean = context.getBean(MyBean.class); // Already created at startup
```

### Interview Answer Template

> "ApplicationContext extends BeanFactory and adds enterprise features like internationalization (i18n), event publishing, and annotation-based configuration. It also eagerly initializes singleton beans at startup, which helps fail-fast if there are configuration errors."

---

## 3. Bean Lifecycle (Critical for Interviews!)

```mermaid
graph TD
    A[Bean Definition Loaded] --> B[Instantiation]
    B --> C[Populate Properties - Dependency Injection]
    C --> D[BeanNameAware.setBeanName]
    D --> E[BeanFactoryAware.setBeanFactory]
    E --> F[BeanPostProcessor.postProcessBeforeInitialization]
    F --> G[@PostConstruct]
    G --> H[InitializingBean.afterPropertiesSet]
    H --> I[Custom init-method]
    I --> J[BeanPostProcessor.postProcessAfterInitialization]
    J --> K[Bean Ready to Use]
    K --> L[@PreDestroy]
    L --> M[DisposableBean.destroy]
    M --> N[Custom destroy-method]
```

### Lifecycle Callbacks in Code

```java
@Component
public class MyBean implements InitializingBean, DisposableBean {
    
    // 1. Constructor called first
    public MyBean() {
        System.out.println("1. Constructor");
    }
    
    // 2. Dependencies injected
    @Autowired
    public void setDependency(SomeDependency dep) {
        System.out.println("2. Dependencies injected");
    }
    
    // 3. @PostConstruct - MOST COMMONLY USED
    @PostConstruct
    public void init() {
        System.out.println("3. @PostConstruct - initialization logic here");
    }
    
    // 4. InitializingBean interface (less preferred)
    @Override
    public void afterPropertiesSet() {
        System.out.println("4. afterPropertiesSet");
    }
    
    // 5. @PreDestroy - cleanup
    @PreDestroy
    public void cleanup() {
        System.out.println("5. @PreDestroy - cleanup resources");
    }
    
    // 6. DisposableBean interface
    @Override
    public void destroy() {
        System.out.println("6. destroy");
    }
}
```

### Interview Question: When would you use @PostConstruct?

**Common use cases:**
- Loading cache data at startup
- Validating configuration
- Establishing database connections
- Starting background threads

```java
@Component
public class CacheLoader {
    @Autowired
    private ProductRepository repository;
    
    private Map<String, Product> cache;
    
    @PostConstruct
    public void loadCache() {
        // Dependencies are already injected here!
        this.cache = repository.findAll()
            .stream()
            .collect(Collectors.toMap(Product::getId, p -> p));
    }
}
```

---

## 4. BeanPostProcessor (Advanced)

BeanPostProcessors are hooks that let you **modify beans before and after initialization**.

### Real-World Example: Custom Annotation Processing

```java
@Component
public class LoggingBeanPostProcessor implements BeanPostProcessor {
    
    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) {
        // Called BEFORE @PostConstruct
        System.out.println("Before init: " + beanName);
        return bean;
    }
    
    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) {
        // Called AFTER @PostConstruct
        // This is where Spring creates PROXIES (for @Transactional, @Async, etc.)
        return bean;
    }
}
```

### Interview Insight: How @Transactional Works

Spring uses a BeanPostProcessor to wrap your beans in a PROXY:

```java
// Your code
@Service
public class PaymentService {
    @Transactional
    public void processPayment() { ... }
}

// What Spring actually creates (simplified)
public class PaymentService$$EnhancerBySpringCGLIB extends PaymentService {
    @Override
    public void processPayment() {
        beginTransaction();
        try {
            super.processPayment();
            commitTransaction();
        } catch (Exception e) {
            rollbackTransaction();
            throw e;
        }
    }
}
```

---

## 5. Bean Scopes

| Scope | Description | When to Use |
|-------|-------------|-------------|
| `singleton` (default) | One instance per Spring container | Stateless services |
| `prototype` | New instance every time requested | Stateful beans |
| `request` | One instance per HTTP request | Request-specific data |
| `session` | One instance per HTTP session | User session data |

### Singleton Scope (Default)

```java
@Service  // Singleton by default
public class UserService {
    // ⚠️ DANGER: Don't store state in singleton beans!
    private User currentUser;  // ❌ WRONG - Shared across all requests!
    
    // ✅ Correct - Stateless operation
    public User findUser(Long id) {
        return userRepository.findById(id);
    }
}
```

### Prototype Scope

```java
@Component
@Scope("prototype")
public class ShoppingCart {
    private List<Item> items = new ArrayList<>();
    
    public void addItem(Item item) {
        items.add(item);
    }
}

// Each call gets a NEW instance
ShoppingCart cart1 = context.getBean(ShoppingCart.class);
ShoppingCart cart2 = context.getBean(ShoppingCart.class);
// cart1 != cart2
```

---

## 6. Common Interview Questions

### Q1: What happens if you inject a prototype bean into a singleton?

**Problem:** The prototype is injected once and never changes!

```java
@Service
public class OrderService {  // Singleton
    @Autowired
    private ShoppingCart cart;  // Prototype - but SAME instance always!
}
```

**Solutions:**

```java
// Solution 1: ObjectFactory
@Service
public class OrderService {
    @Autowired
    private ObjectFactory<ShoppingCart> cartFactory;
    
    public void process() {
        ShoppingCart cart = cartFactory.getObject();  // New instance each time
    }
}

// Solution 2: @Lookup method
@Service
public abstract class OrderService {
    @Lookup
    public abstract ShoppingCart getCart();  // Spring overrides this
}
```

### Q2: How do you choose between constructor and setter injection?

| Constructor Injection ✅ | Setter Injection |
|-------------------------|------------------|
| Required dependencies | Optional dependencies |
| Immutable (final fields) | Mutable |
| Fail-fast (fails at startup) | May fail at runtime |
| Easier to test | Harder to test |

**Best Practice:** Always prefer constructor injection.

```java
@Service
public class PaymentService {
    private final PaymentGateway gateway;      // Required
    private NotificationService notifications; // Optional
    
    // Constructor injection for required dependency
    public PaymentService(PaymentGateway gateway) {
        this.gateway = gateway;
    }
    
    // Setter injection for optional dependency
    @Autowired(required = false)
    public void setNotifications(NotificationService notifications) {
        this.notifications = notifications;
    }
}
```

---

## 7. Quick Reference Cheat Sheet

```text
IoC Container Hierarchy:
BeanFactory (basic) → ApplicationContext (full features)

Bean Lifecycle Order:
Constructor → DI → @PostConstruct → afterPropertiesSet → init-method
                    ↓ (Bean Ready) ↓
@PreDestroy → destroy → destroy-method

Scopes: singleton (default) | prototype | request | session

Injection Types:
- Constructor (preferred, immutable)
- Setter (optional deps)
- Field @Autowired (avoid in production)
```

---

**Next:** [Spring Transactions & Pitfalls →](./03-spring-transactions)
