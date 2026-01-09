---
title: "2. IoC Container & Dependency Injection"
sidebar_position: 2
description: How Spring Beans work, Scopes, and Lifecycles.
---

# Spring IoC Container & Dependency Injection

:::info
**Inversion of Control (IoC):** You don't call `new Service()`. You ask Spring "Give me the Service", and Spring gives it to you.
:::

## 1. Bean Scopes

Spring Beans (Components) have specific lifespans.

| Scope | Description | Default? | Concurrency |
|-------|-------------|----------|-------------|
| **Singleton** | One instance per ApplicationContext. | ✅ **YES** | **NOT Thread-Safe!** |
| **Prototype** | A new instance every time you ask for it. | ❌ No | Thread-safe (if local vars used). |
| **Request** | One instance per HTTP Request. | ❌ No | Thread-safe options. |
| **Session** | One instance per HTTP User Session. | ❌ No | - |

### 🚨 The Singleton Concurrency Trap
Since Singletons are shared defaults:
*   **NEVER** use class-level variables to store user data.
*   **BAD:**
    ```java
    @Service
    public class UserService {
        private User currentUser; // ❌ ERROR: Shared by all 1000 concurrent users!
        
        public void process() { ... }
    }
    ```
*   **GOOD:** Pass data as method arguments or use `ThreadLocal` (RequestScope).

---

## 2. Bean Lifecycle (Interview Favorite)
What happens when you start the app?

1.  **Instantiate:** Spring calls the constructor (`new MyBean()`).
2.  **Populate Properties:** Spring injects dependencies (`@Autowired`).
3.  **BeanNameAware / BeanFactoryAware:** (Optional) Set ID/Factory refs.
4.  **BeanPostProcessor (Before):** Custom modifications before init.
5.  **@PostConstruct / init-method:** Your custom initialization logic.
6.  **BeanPostProcessor (After):** Proxies (AOP) are created here!
7.  **Service Ready:** Bean is ready to use.
8.  **@PreDestroy:** Called on shutdown.

---

## 3. Circular Dependencies
Problem: Bean A needs Bean B. Bean B needs Bean A.

**The Fix:**
1.  **Refactor (Best):** Extract the common logic into Bean C.
2.  **@Lazy:** Tell Spring "Don't create B yet. Just give A a proxy placeholder."
    ```java
    @Autowired
    public ServiceA(@Lazy ServiceB serviceB) { ... }
    ```
3.  **Setter Injection:** Use setters instead of Constructor injection (Not recommended, makes testing harder).

---

## 4. BeanPostProcessors (The Magic)
This is how Spring implements `@Transactional`, `@Async`, etc.
Spring wraps your original class in a **Proxy** class that adds the extra behavior, then puts the *Proxy* in the container, not your original object.
