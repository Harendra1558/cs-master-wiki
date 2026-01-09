---
title: "3. Transaction Management & Pitfalls"
sidebar_position: 3
description: "@Transactional internals, Rollback rules, and the Self-Invocation problem."
---

# Transaction Management in Spring

## 1. How `@Transactional` Works (AOP Proxies)
When you annotate a method, Spring wraps that class in a Proxy.

**The Flow:**
1.  **Caller** calls the method `saveUser()`.
2.  **Proxy** intercepts the call.
3.  **Proxy** asks Transaction Manager: *"Start a transaction"*.
    *   `connection.setAutoCommit(false)`
4.  **Real Object** executes `saveUser()` logic.
5.  **Proxy** catches exceptions?
    *   **Yes:** `connection.rollback()`
    *   **No:** `connection.commit()`

## 2. The Self-Invocation Pitfall (Critical)
Calling a transactional method from within the **same class** bypasses the proxy.

**❌ This will NOT work:**
```java
public class UserService {
    
    public void registerUser() {
        // Calling internal method directly ("this.createUser")
        // BYPASSES the Proxy! No Transaction started!
        createUser(); 
    }

    @Transactional
    public void createUser() {
        repo.save();
    }
}
```

**✅ The Fix:**
1.  Move `createUser` to a different Service (Recommended).
2.  Self-inject the proxy (Quick hack).
    ```java
    @Autowired @Lazy private UserService self;
    public void registerUser() { self.createUser(); }
    ```

## 3. Rollback Rules
By default, Spring ONLY rolls back on **Unchecked Exceptions** (`RuntimeException`) or `Error`.
It does **NOT** rollback on Checked Exceptions (`IOException`, `SQLException`)!

**Fix:**
```java
// Rollback for EVERYTHING
@Transactional(rollbackFor = Exception.class)
public void saveFile() throws IOException { ... }
```

## 4. Propagation Levels
Sometimes you need fine control over how new method calls handle existing transactions.

*   **REQUIRED (Default):** Join existing transaction. If none, create new.
*   **REQUIRES_NEW:** Suspend current transaction. Create a brand new independent transaction.
    *   *Usage:* Logging "Audit Trails" even if the main business logic fails/rolls back.
*   **MANDATORY:** Throw exception if no transaction exists.
*   **SUPPORTS:** Run in transaction if exists, else run non-transactional.
