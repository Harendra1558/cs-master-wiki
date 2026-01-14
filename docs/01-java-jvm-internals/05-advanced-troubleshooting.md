---
title: "4. Advanced Troubleshooting & JVM Tuning"
sidebar_position: 5
description: JVM flags, ClassLoader leaks, production debugging, and performance tuning.
---

# Advanced Troubleshooting & JVM Tuning

:::info Interview Importance ⭐⭐⭐⭐
These topics are asked in **senior-level interviews** and show that you have real production experience. Understanding JVM tuning and troubleshooting is what separates mid-level from senior developers.
:::

---

## 1. JVM Startup Flags - Complete Reference

### Memory Settings

```bash
# Heap Memory
-Xms4G              # Initial heap size (start with this much)
-Xmx4G              # Maximum heap size (never exceed this)
# Best Practice: Set both equal to avoid resize pauses

# Young Generation
-Xmn1G              # Young generation size
-XX:NewRatio=2      # Old:Young ratio (2 means Old is 2x Young)
-XX:SurvivorRatio=8 # Eden:Survivor ratio (Eden is 8x one Survivor)

# Stack (per thread)
-Xss512K            # Stack size per thread (default ~1MB)
# Warning: 1000 threads × 1MB = 1GB just for stacks!

# Metaspace (Java 8+)
-XX:MetaspaceSize=256M     # Initial Metaspace size
-XX:MaxMetaspaceSize=512M  # Maximum Metaspace size
```

### GC Selection

```bash
# Choose one GC algorithm
-XX:+UseSerialGC          # Single-threaded (client apps)
-XX:+UseParallelGC        # Throughput focus (batch jobs)
-XX:+UseG1GC              # Balanced (default Java 9+)
-XX:+UseZGC               # Ultra-low latency (Java 11+)
-XX:+UseShenandoahGC      # Ultra-low latency (Java 12+)
```

### G1 GC Tuning

```bash
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200   # Target max pause time (ms)
-XX:G1HeapRegionSize=16M   # Region size (1-32 MB, power of 2)
-XX:G1NewSizePercent=30    # Minimum Young gen %
-XX:G1MaxNewSizePercent=60 # Maximum Young gen %
```

### GC Logging

```bash
# Java 8
-XX:+PrintGCDetails
-XX:+PrintGCDateStamps
-XX:+PrintGCTimeStamps
-Xloggc:/var/log/gc.log
-XX:+UseGCLogFileRotation
-XX:NumberOfGCLogFiles=5
-XX:GCLogFileSize=10M

# Java 9+ (Unified Logging)
-Xlog:gc*:file=/var/log/gc.log:time,uptime,level:filecount=5,filesize=10M
```

### Out of Memory Handling

```bash
# Heap dump on OOM
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/var/dumps/heap.hprof

# Run script on OOM
-XX:OnOutOfMemoryError="./restart.sh"

# Exit on OOM (for container restart)
-XX:+ExitOnOutOfMemoryError
```

### JIT Compilation

```bash
# Code cache for compiled code
-XX:ReservedCodeCacheSize=512M
-XX:InitialCodeCacheSize=64M

# Compile in background
-XX:+BackgroundCompilation

# Print compilation activity
-XX:+PrintCompilation
```

---

## 2. ClassLoader Architecture

### Understanding ClassLoaders

ClassLoaders are responsible for loading `.class` files into the JVM. They follow a **hierarchical delegation model**.

```
┌───────────────────────────────────────────────────────────────────┐
│                   CLASSLOADER HIERARCHY                            │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│    ┌─────────────────────────────────────────────────────────┐    │
│    │           Bootstrap ClassLoader (C/C++)                  │    │
│    │           Loads: rt.jar, core Java classes               │    │
│    │           Path: java.home/lib                            │    │
│    └─────────────────────────────────────────────────────────┘    │
│                              ↑                                     │
│                          (parent)                                  │
│                              ↑                                     │
│    ┌─────────────────────────────────────────────────────────┐    │
│    │           Extension/Platform ClassLoader                 │    │
│    │           Loads: Extension classes                       │    │
│    │           Path: java.ext.dirs (Java 8)                   │    │
│    └─────────────────────────────────────────────────────────┘    │
│                              ↑                                     │
│                          (parent)                                  │
│                              ↑                                     │
│    ┌─────────────────────────────────────────────────────────┐    │
│    │           Application/System ClassLoader                 │    │
│    │           Loads: Application classes                     │    │
│    │           Path: CLASSPATH, -cp                           │    │
│    └─────────────────────────────────────────────────────────┘    │
│                              ↑                                     │
│                          (parent)                                  │
│                              ↑                                     │
│    ┌─────────────────────────────────────────────────────────┐    │
│    │           Custom ClassLoaders                            │    │
│    │           Web App ClassLoader (Tomcat)                   │    │
│    │           OSGi Bundle ClassLoader                        │    │
│    └─────────────────────────────────────────────────────────┘    │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

### Delegation Model

When a ClassLoader needs to load a class:
1. First, **ask parent** to load it (**delegation**)
2. If parent can't, **try to load it yourself**

```java
// Simplified loadClass implementation
protected Class<?> loadClass(String name) {
    // 1. Check if already loaded
    Class<?> c = findLoadedClass(name);
    if (c != null) return c;
    
    // 2. Delegate to parent first
    try {
        c = parent.loadClass(name);
        if (c != null) return c;
    } catch (ClassNotFoundException e) {}
    
    // 3. Try to load it ourselves
    return findClass(name);
}
```

### Interview Question: Why Delegation?

**Answer:**
1. **Security:** Prevents malicious code from replacing core classes (e.g., custom `java.lang.String`)
2. **Uniqueness:** Same class loaded by different ClassLoaders are different types!
3. **Visibility:** Child can see parent's classes, but not vice versa

---

## 3. ClassLoader Memory Leaks

:::danger Critical Production Issue
ClassLoader leaks cause `OutOfMemoryError: Metaspace`. They're hard to debug and common in applications with hot-reload or dynamic class generation.
:::

### Why ClassLoader Leaks Happen

A ClassLoader (and all its classes) can only be garbage collected when:
1. No instances of any of its classes exist
2. No references to the ClassLoader itself exist
3. No references to any `Class` objects loaded by it exist

**The Problem:**
```java
// ❌ Static reference holds the ClassLoader alive!
public class LeakyClass {
    // This class was loaded by WebAppClassLoader
    private static LeakyClass INSTANCE = new LeakyClass();
}
```

When you redeploy the web app:
- New WebAppClassLoader is created
- Old WebAppClassLoader should be GC'd
- BUT: INSTANCE → LeakyClass.class → old WebAppClassLoader
- **Result:** Old ClassLoader can't be collected!

### Common Causes

| Cause | Example |
|-------|---------|
| **Static fields** | Singleton instances, static caches |
| **ThreadLocal** | Not cleaned up in thread pool |
| **JDBC drivers** | Driver registered in old ClassLoader |
| **Shutdown hooks** | Registered but not removed |
| **Logging frameworks** | Log4j, Logback holding references |
| **JMX beans** | MBeans not unregistered |

### How to Detect

```bash
# Check Metaspace usage
jstat -gc <PID> 1000

# Take heap dump and analyze in Eclipse MAT
jmap -dump:live,format=b,file=heap.hprof <PID>

# In Eclipse MAT:
# 1. Open heap dump
# 2. Run "ClassLoader" analysis
# 3. Look for duplicate ClassLoaders
# 4. Find "Path to GC Roots" → "exclude weak references"
```

### How to Fix

```java
// 1. Clean up static instances on undeploy
@WebListener
public class CleanupListener implements ServletContextListener {
    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        LeakyClass.cleanup();  // Clear static references
    }
}

// 2. Deregister JDBC drivers
@Override
public void contextDestroyed(ServletContextEvent sce) {
    Enumeration<Driver> drivers = DriverManager.getDrivers();
    while (drivers.hasMoreElements()) {
        Driver driver = drivers.nextElement();
        try {
            DriverManager.deregisterDriver(driver);
        } catch (SQLException e) {
            log.warn("Error deregistering driver", e);
        }
    }
}

// 3. Always clean up ThreadLocal
try {
    // work
} finally {
    threadLocal.remove();
}

// 4. Unregister MBeans
@PreDestroy
public void cleanup() {
    MBeanServer mbs = ManagementFactory.getPlatformMBeanServer();
    mbs.unregisterMBean(objectName);
}
```

---

## 4. Production Debugging Toolkit

### 4.1 jps - List Java Processes

```bash
jps -l
# Output:
# 12345 com.example.MyApplication
# 12346 sun.tools.jps.Jps
```

### 4.2 jinfo - JVM Configuration

```bash
# Show all flags and values
jinfo -flags <PID>

# Show specific flag
jinfo -flag MaxHeapSize <PID>

# Dynamically change flag (if mutable)
jinfo -flag +HeapDumpOnOutOfMemoryError <PID>
```

### 4.3 jstat - GC Statistics

```bash
# GC statistics every 1 second
jstat -gc <PID> 1000

# GC cause
jstat -gccause <PID> 1000

# Class loading statistics
jstat -class <PID> 1000
```

**Understanding jstat -gc output:**

```
 S0C    S1C    S0U    S1U      EC       EU        OC         OU       MC     MU    CCSC   CCSU   YGC     YGCT    FGC    FGCT     GCT   
52416  52416   0.0   3360.0  419456   92460.0   174784.0   65443.2   50688  48901  6016   5623    15    0.123    2     0.085    0.208

S0C/S1C = Survivor 0/1 Capacity (KB)
S0U/S1U = Survivor 0/1 Used (KB)
EC/EU = Eden Capacity/Used (KB)
OC/OU = Old Gen Capacity/Used (KB)
MC/MU = Metaspace Capacity/Used (KB)
YGC/YGCT = Young GC count/time (seconds)
FGC/FGCT = Full GC count/time (seconds)
GCT = Total GC time
```

### 4.4 jstack - Thread Dump

```bash
# Take thread dump
jstack <PID> > thread_dump.txt

# With locked monitors and synchronizers
jstack -l <PID> > thread_dump.txt

# Force dump (even if hung)
jstack -F <PID> > thread_dump.txt
```

**Analyzing thread dump:**

```
"http-nio-8080-exec-1" #42 daemon prio=5 os_prio=0 tid=0x00007f...
   java.lang.Thread.State: WAITING (on object monitor)
	at java.lang.Object.wait(Native Method)
	- waiting on <0x00000000e...> (a java.lang.Object)
	at com.example.Service.processRequest(Service.java:45)
	- locked <0x00000000e...> (a java.lang.Object)
	at com.example.Controller.handle(Controller.java:30)
```

**Thread states to look for:**

| State | Meaning | Concern Level |
|-------|---------|--------------|
| RUNNABLE | Executing or ready | ✅ Normal |
| WAITING | Waiting indefinitely | ⚠️ Check why |
| TIMED_WAITING | Waiting with timeout | ✅ Usually OK |
| BLOCKED | Waiting for lock | 🔴 Potential issue |
| NEW/TERMINATED | Starting/finished | ✅ Normal |

### 4.5 jmap - Memory Analysis

```bash
# Heap summary
jmap -heap <PID>

# Object histogram (top memory consumers)
jmap -histo <PID> | head -30

# Heap dump (for detailed analysis)
jmap -dump:live,format=b,file=heap.hprof <PID>

# Force dump (even if hung)
jmap -F -dump:live,format=b,file=heap.hprof <PID>
```

### 4.6 jcmd - All-in-One Tool (Recommended)

```bash
# List available commands
jcmd <PID> help

# GC class histogram
jcmd <PID> GC.class_histogram

# Heap dump
jcmd <PID> GC.heap_dump /tmp/heap.hprof

# Thread dump
jcmd <PID> Thread.print

# VM info
jcmd <PID> VM.info
jcmd <PID> VM.flags
jcmd <PID> VM.system_properties

# Force GC (use sparingly!)
jcmd <PID> GC.run
```

---

## 5. Analyzing Heap Dumps with Eclipse MAT

### Step-by-Step Analysis

```
1. TAKE HEAP DUMP
   └── jmap -dump:live,format=b,file=heap.hprof <PID>

2. OPEN IN ECLIPSE MAT
   └── File → Open Heap Dump → heap.hprof

3. RUN LEAK SUSPECTS REPORT
   └── Run "Leak Suspects" from wizard
   └── Look for "Problem Suspect 1, 2, 3..."

4. ANALYZE DOMINATOR TREE
   └── Shows objects that retain the most memory
   └── Follow the chain: What's holding what?

5. FIND GC ROOTS
   └── Right-click suspicious object
   └── Path to GC Roots → exclude weak references
   └── This shows WHY the object can't be GC'd

6. COMPARE HISTOGRAMS
   └── Take two dumps, 1 hour apart
   └── Compare → identify growing objects
```

### Key Eclipse MAT Views

| View | Purpose |
|------|---------|
| **Leak Suspects** | Automatic detection of likely leaks |
| **Dominator Tree** | Objects retaining most memory |
| **Histogram** | Count of each class |
| **Path to GC Roots** | Why an object can't be collected |
| **Top Consumers** | Largest objects |
| **Thread Overview** | Memory retained by each thread |

---

## 6. Common Production Issues

### Issue 1: High CPU Usage

**Symptoms:** CPU at 100%, slow responses

**Diagnosis:**
```bash
# 1. Find the thread consuming CPU
top -H -p <PID>  # Linux: show threads
# Note the thread ID (e.g., 12345)

# 2. Convert to hex
printf '%x\n' 12345  # → 3039

# 3. Take thread dump
jstack <PID> > dump.txt

# 4. Search for the thread
grep -A 50 "nid=0x3039" dump.txt
```

**Common causes:**
- Infinite loop in code
- Busy spin lock
- High GC activity (Full GC loop)

### Issue 2: Memory Keeps Growing

**Symptoms:** Heap usage increases over time, even after GC

**Diagnosis:**
```bash
# 1. Monitor GC
jstat -gc <PID> 5000

# 2. Watch Old Gen (OU) - should not keep rising

# 3. Take heap dump
jmap -dump:live,format=b,file=heap.hprof <PID>

# 4. Analyze in Eclipse MAT
```

**Common causes:**
- Static collection growing
- ThreadLocal leak
- Cache without eviction
- Event listeners not unregistered

### Issue 3: Application Freezes/Pauses

**Symptoms:** Periodic unresponsiveness, timeouts

**Diagnosis:**
```bash
# 1. Check GC logs
grep "Full GC" gc.log

# 2. Enable GC logging (if not enabled)
-Xlog:gc*:file=gc.log:time

# 3. Analyze GC pauses
# Use GCeasy.io or GCViewer
```

**Common causes:**
- Frequent Full GC
- Large heap with STW collector
- Insufficient heap size

### Issue 4: OutOfMemoryError

**Types and fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Java heap space` | Heap is full | Increase `-Xmx` or fix leak |
| `GC overhead limit exceeded` | Too much time in GC | Increase heap or fix leak |
| `Metaspace` | Too many classes | Increase `-XX:MaxMetaspaceSize` or fix ClassLoader leak |
| `Unable to create native thread` | OS thread limit | Reduce `-Xss` or increase OS limits |
| `Direct buffer memory` | NIO buffers exhausted | Increase `-XX:MaxDirectMemorySize` |

---

## 7. Performance Tuning Guidelines

### Sizing the Heap

```bash
# Rule of Thumb:
# Live Data Size × 3-4 = Total Heap Size
# Live Data Size × 1-1.5 = Old Gen
# Live Data Size × 1-1.5 = Young Gen

# Example: If your app uses ~1GB of live data
-Xms4G -Xmx4G  # 4GB total heap
```

### GC Pause Time vs Throughput

| Priority | GC Choice | Flags |
|----------|-----------|-------|
| **Minimize pause time** | ZGC, Shenandoah | `-XX:+UseZGC` |
| **Balance** | G1GC | `-XX:+UseG1GC -XX:MaxGCPauseMillis=200` |
| **Maximum throughput** | Parallel GC | `-XX:+UseParallelGC` |

### Memory Allocation Rate

**Goal:** Reduce object creation to reduce GC frequency

```java
// ❌ High allocation rate
for (int i = 0; i < 1000000; i++) {
    String s = new String("constant");  // BAD!
}

// ✅ Low allocation rate
String s = "constant";  // Reuse
for (int i = 0; i < 1000000; i++) {
    process(s);
}

// ❌ Object creation in hot path
for (User u : users) {
    processDate(new Date());  // New Date every iteration!
}

// ✅ Reuse objects
Date now = new Date();
for (User u : users) {
    processDate(now);
}
```

---

## 8. JFR (Java Flight Recorder)

:::tip Production-Safe Profiling
JFR is designed for production use with **minimal overhead** (under 2%). It's the best way to collect detailed runtime data.
:::

### Starting JFR

```bash
# Start recording (Java 11+)
jcmd <PID> JFR.start name=recording1 filename=recording.jfr

# Stop recording
jcmd <PID> JFR.stop name=recording1

# Configure and start
jcmd <PID> JFR.start name=prod duration=60s \
    settings=profile \
    filename=/tmp/prod-recording.jfr
```

### JVM Flag to Enable

```bash
# Java 11+: Built-in, no flag needed

# Java 8 (commercial feature):
-XX:+UnlockCommercialFeatures
-XX:+FlightRecorder
-XX:StartFlightRecording=duration=60s,filename=recording.jfr
```

### What JFR Captures

- Method profiling (CPU hot spots)
- Memory allocation
- GC events and pauses
- Thread activity
- Lock contention
- I/O operations
- JIT compilation

### Analyzing with JDK Mission Control

1. Open JDK Mission Control (jmc)
2. File → Open → Select recording.jfr
3. Explore:
   - **Method Profiling** → Find CPU hot spots
   - **Memory** → Find allocation hot spots
   - **Lock Instances** → Find contention
   - **GC** → Analyze GC behavior

---

## 9. Top Interview Questions

### Q1: How would you troubleshoot a production OutOfMemoryError?

**Answer:**
1. **Identify the type** of OOM (Heap, Metaspace, Stack, etc.)
2. **Enable heap dump** on OOM: `-XX:+HeapDumpOnOutOfMemoryError`
3. **Collect heap dump** when it occurs
4. **Analyze with Eclipse MAT:**
   - Run "Leak Suspects" report
   - Check Dominator Tree for largest objects
   - Find "Path to GC Roots" for suspicious objects
5. **Fix the root cause** (remove unneeded references, set size limits, use weak references)
6. **Add monitoring** to catch early (Prometheus, Datadog, etc.)

### Q2: What's the difference between -Xms and -Xmx? Why set them equal?

**Answer:**
- `-Xms`: Initial heap size (starting memory)
- `-Xmx`: Maximum heap size (upper limit)

**Why set them equal in production:**
1. **Avoids resize overhead:** JVM doesn't need to grow/shrink heap
2. **Predictable memory:** Container/OS knows exact memory needs
3. **Predictable latency:** No GC pauses due to heap resize
4. **Fail-fast:** Application fails at startup if memory unavailable

### Q3: How would you detect a deadlock?

**Answer:**
```bash
# Take thread dump
jstack <PID> > threads.txt

# Look for: "Found one Java-level deadlock"
# JVM automatically detects classic deadlocks

# Or by analyzing:
# 1. Find BLOCKED threads
# 2. Check what lock they're waiting for
# 3. Find which thread holds that lock
# 4. Check if that thread is waiting for a lock held by thread 1
```

**Programmatic detection:**
```java
ThreadMXBean bean = ManagementFactory.getThreadMXBean();
long[] deadlockedThreads = bean.findDeadlockedThreads();
if (deadlockedThreads != null) {
    // Handle deadlock
}
```

### Q4: How do you choose between different GC algorithms?

**Answer:**

| Requirement | GC Choice |
|-------------|-----------|
| **Default/General** | G1GC |
| **Minimize latency (under 10ms)** | ZGC or Shenandoah |
| **Maximize throughput** | Parallel GC |
| **Small heap, single CPU** | Serial GC |
| **Legacy Java 8** | CMS (deprecated) or G1GC |

**Factors to consider:**
1. **Heap size:** ZGC handles huge heaps (TB) well
2. **Pause time requirements:** Critical for user-facing services
3. **Throughput requirements:** Important for batch processing
4. **Java version:** ZGC requires Java 11+

### Q5: Explain the difference between Xss, Xms, Xmx, and XX:MaxMetaspaceSize.

**Answer:**
- **`-Xss`**: Stack size per thread (for method calls, local variables)
- **`-Xms`**: Initial heap size (for objects)
- **`-Xmx`**: Maximum heap size (for objects)
- **`-XX:MaxMetaspaceSize`**: Maximum Metaspace size (for class metadata)

**Memory usage example:**
```
Total Memory = Heap + Metaspace + (Threads × Xss) + Native Memory

Example:
Heap (-Xmx4G):           4 GB
Metaspace:               500 MB
Threads (100 × 1MB):     100 MB
Code Cache:              240 MB
Direct Buffers:          500 MB
-----------------------------------
Total:                   ~5.3 GB
```

---

## Quick Reference Card

```
┌──────────────────────────────────────────────────────────────────┐
│                  JVM TROUBLESHOOTING CHEAT SHEET                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ COMMON COMMANDS:                                                 │
│ ├── jps -l                → List Java processes                 │
│ ├── jstat -gc <PID> 1000  → GC monitoring every 1s              │
│ ├── jstack <PID>          → Thread dump                         │
│ ├── jmap -histo <PID>     → Object histogram                    │
│ ├── jmap -dump:live...    → Heap dump                           │
│ └── jcmd <PID> help       → All-in-one tool                     │
│                                                                  │
│ OOM TYPES AND FIXES:                                             │
│ ├── Java heap space       → -Xmx or fix leak                    │
│ ├── Metaspace             → -XX:MaxMetaspaceSize or ClassLoader │
│ ├── GC overhead exceeded  → Increase heap or fix leak           │
│ └── Unable to create      → Reduce -Xss or OS ulimit            │
│     native thread                                                │
│                                                                  │
│ PRODUCTION FLAGS:                                                │
│ -Xms4G -Xmx4G             → Heap (set equal in prod)            │
│ -XX:+UseG1GC              → GC algorithm                        │
│ -XX:+HeapDumpOnOutOfMemoryError → Dump on OOM                   │
│ -Xlog:gc*:file=gc.log     → GC logging (Java 9+)                │
│                                                                  │
│ ANALYSIS TOOLS:                                                  │
│ ├── Eclipse MAT           → Heap dump analysis                  │
│ ├── JDK Mission Control   → JFR analysis                        │
│ ├── VisualVM              → Real-time monitoring                │
│ └── GCeasy.io             → GC log analysis                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```
