---
title: 2. Garbage Collection & Memory Leaks
sidebar_position: 3
description: Understanding GC, Stop-The-World pauses, and identifying memory leaks.
---

# Garbage Collection & Memory Management

:::warning Performance Impact
Garbage Collection is a **Stop-The-World (STW)** event. During STW, your application **halts completely**. Minimizing these pauses is the goal of GC tuning.
:::

## 1. How GC Works (Generational Hypothesis)

The JVM assumes:
1.  Most objects die young (Request objects, temporary calculations).
2.  Few objects survive for a long time (Caches, Spring Beans).

### 1.1 Minor GC (Young Gen)
*   **Trigger:** When Eden space is full.
*   **Action:**
    1.  Live objects in Eden are moved to Survivor (S0).
    2.  Live objects in S1 are moved to S0 (swap).
    3.  Eden is wiped clean.
*   **Cost:** Very fast, but still STW.

### 1.2 Major / Full GC (Old Gen)
*   **Trigger:** When Old Gen fills up or Metaspace fills up.
*   **Cost:** **Expensive**. Iterates over the entire heap.
*   **Danger:** If this happens frequently (e.g., every minute), your app becomes unresponsive.

---

## 2. Memory Leak Patterns

In Java, a memory leak occurs when legitimate objects are **unintentionally kept alive** by a reference, preventing the GC from collecting them.

### 2.1 Static Fields (The Forever Object)
Static fields live for the entire life of the application (attached to the ClassLoader).

**❌ Bad Code:**
```java
public class LeakyClass {
    // This list grows forever and is NEVER collected
    private static final List<byte[]> cache = new ArrayList<>();

    public void processData(byte[] data) {
        cache.add(data); // OOPS!
    }
}
```

### 2.2 Unclosed Resources
Not closing connections or streams keeps the underlying OS memory/handles open.

**❌ Bad Code:**
```java
public void readFile() {
    FileInputStream fis = new FileInputStream("bigfile.txt");
    // If exception occurs here, fis is never closed!
}
```

**✅ Good Code (Try-with-Resources):**
```java
try (FileInputStream fis = new FileInputStream("bigfile.txt")) {
    // logical
} // Automatically closed here
```

### 2.3 ThreadLocal Leaks
`ThreadLocal` variables are attached to the **Thread**. In Thread Pools (Tomcat, ExecutorService), threads are reused inside the pool. If you don't `remove()` the value, it stays attached to the thread *forever*.

**❌ Bad Code:**
```java
public class UserContext {
    private static final ThreadLocal<User> context = new ThreadLocal<>();

    public static void set(User user) {
        context.set(user);
    }
    // Missing remove() method!
}
```

**✅ Good Code:**
```java
try {
    UserContext.set(user);
    chain.doFilter(request, response);
} finally {
    // CRITICAL: Always clean up!
    UserContext.remove();
}
```

---

## 3. Troubleshooting Tools

| Tool | Usage |
|------|-------|
| **jstat** | `jstat -gc <pid> 1000` (Live GC monitoring) |
| **jmap** | `jmap -dump:live,format=b,file=heap.bin <pid>` (Take Heap Dump) |
| **VisualVM** | GUI for analyzing CPU/Memory usage. |
| **Eclipse MAT** | The best tool to analyze heap dumps and find leaks. |

### Detecting a Leak
1.  **Symptom:** Memory usage seesaws (goes up, GC brings it down), but the "bottom" ownership generally rises over time.
2.  **Confirmation:** Take two heap dumps 1 hour apart. Compare object counts.
3.  **Fix:** Find the "GC Root" holding the reference in Eclipse MAT.
