---
slug: jvm-memory-management-best-practices
title: JVM Memory Management - Production Best Practices
authors: [harendra]
tags: [java, jvm, performance, memory-management]
image: /img/blog/jvm-memory.jpg
description: Deep dive into JVM memory management, garbage collection tuning, and avoiding common memory leaks in production Java applications.
keywords: [java memory management, jvm tuning, garbage collection, memory leaks, java performance]
---

# JVM Memory Management - Production Best Practices

Memory management is one of the most critical aspects of running Java applications in production. Poor memory configuration or memory leaks can lead to application crashes, performance degradation, and frustrated users. In this comprehensive guide, we'll explore JVM memory management from the ground up.

<!-- truncate -->

## Understanding JVM Memory Architecture

The JVM divides memory into several distinct regions, each serving a specific purpose:

### Heap Memory

The heap is where all Java objects live. It's divided into:

1. **Young Generation** - Where new objects are allocated
   - Eden Space
   - Survivor Spaces (S0 and S1)

2. **Old Generation** - Long-lived objects that survived multiple GC cycles

```bash
# Configure heap sizes
-Xms2g    # Initial heap size
-Xmx4g    # Maximum heap size
```

### Non-Heap Memory

- **Metaspace** - Stores class metadata (replaces PermGen in Java 8+)
- **Code Cache** - JIT-compiled native code
- **Thread Stacks** - One stack per thread

## Common Memory Leak Patterns

### 1. Static Collections

```java
// ❌ BAD: Memory leak
public class LeakyCache {
    private static Map<String, byte[]> cache = new HashMap<>();
    
    public void cacheData(String key, byte[] data) {
        cache.put(key, data); // Never removed!
    }
}

// ✅ GOOD: Bounded cache
public class SafeCache {
    private static Cache<String, byte[]> cache = CacheBuilder.newBuilder()
        .maximumSize(10000)
        .expireAfterWrite(1, TimeUnit.HOURS)
        .build();
}
```

### 2. ThreadLocal Leaks

```java
// ❌ BAD: ThreadLocal not cleaned up
private static ThreadLocal<User> currentUser = new ThreadLocal<>();

public void handleRequest(User user) {
    currentUser.set(user);
    // Process request
    // LEAKED: Never removed from thread pool threads
}

// ✅ GOOD: Always clean up
public void handleRequest(User user) {
    try {
        currentUser.set(user);
        // Process request
    } finally {
        currentUser.remove(); // Critical!
    }
}
```

## Garbage Collection Tuning

### Choosing the Right GC

| GC | Best For | Typical Pause | Use Case |
|----|----------|---------------|----------|
| **G1GC** | General purpose | 10-200ms | Default for most apps |
| **ZGC** | Ultra-low latency | &lt;10ms | Low-latency services |
| **Shenandoah** | Low latency | &lt;10ms | Alternative to ZGC |

### G1GC Configuration

```bash
# Recommended G1GC settings
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200
-XX:G1HeapRegionSize=16m
-XX:InitiatingHeapOccupancyPercent=45
```

## Monitoring and Troubleshooting

### Essential JVM Flags

```bash
# GC Logging
-Xlog:gc*:file=gc.log:time,uptime,level,tags

# Heap dump on OOM
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/path/to/dumps

# Monitor GC
jstat -gc <pid> 1000
```

### Analyzing Heap Dumps

Use these tools to analyze heap dumps:
- Eclipse MAT (Memory Analyzer Tool)
- VisualVM
- JProfiler

## Production Checklist

✅ Set appropriate heap sizes based on load testing  
✅ Enable GC logging  
✅ Configure heap dump on OOM  
✅ Monitor GC pause times  
✅ Set up alerts for memory usage  
✅ Review ThreadLocal usage  
✅ Implement bounded caches  
✅ Profile regularly in production

## Conclusion

Effective JVM memory management requires understanding the memory model, choosing the right GC, and preventing common leak patterns. Monitor your applications continuously and tune based on actual production metrics.

For a deeper dive into JVM internals, check out my [CS Fundamentals Wiki](/docs).

---

**Have questions about JVM tuning?** Drop a comment below or connect with me on [LinkedIn](https://linkedin.com/in/yourprofile).
