---
title: 4. File Descriptors & I/O
sidebar_position: 4
description: Master file descriptors, ulimit, I/O models, and the "too many open files" error for backend interviews.
keywords: [file descriptors, ulimit, epoll, io, linux, too many open files]
---

# File Descriptors & I/O

:::danger Production Alert
The infamous "Too many open files" error has crashed more production systems than you'd expect. Understanding file descriptors is essential for any backend developer.
:::

## 1. What are File Descriptors?

### Definition

A **file descriptor (FD)** is an integer that uniquely identifies an open file/resource within a process.

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    FILE DESCRIPTOR TABLE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  FD    Resource                                                     │
│  ──    ────────                                                     │
│  0     stdin  (standard input)                                      │
│  1     stdout (standard output)                                     │
│  2     stderr (standard error)                                      │
│  3     /var/log/app.log                                            │
│  4     TCP socket to database:5432                                  │
│  5     TCP socket to redis:6379                                     │
│  6     /tmp/cache.dat                                               │
│  ...                                                                 │
│                                                                      │
│  Every open file, socket, pipe is a file descriptor!               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Everything is a File in Linux

```text
In Linux, "everything is a file":

├── Regular files      → /etc/config.yml
├── Directories        → /home/user/
├── Sockets           → TCP/UDP connections
├── Pipes             → Inter-process communication
├── Device files      → /dev/sda, /dev/null
├── Symbolic links    → /usr/bin/java → /usr/lib/jvm/.../bin/java
└── Event descriptors → epoll, signalfd, timerfd
```

---

## 2. File Descriptor Limits

### Types of Limits

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    FD LIMIT HIERARCHY                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ 1. SYSTEM-WIDE LIMIT (kernel)                                       │
│    └── cat /proc/sys/fs/file-max                                    │
│    └── Typically millions (e.g., 2097152)                           │
│                                                                      │
│ 2. USER SOFT LIMIT (can be raised by user)                          │
│    └── ulimit -n                                                    │
│    └── Default: 1024 (often too low!)                               │
│                                                                      │
│ 3. USER HARD LIMIT (max soft can be raised to)                      │
│    └── ulimit -Hn                                                   │
│    └── Often: 4096 or 65535                                         │
│                                                                      │
│ 4. PROCESS LIMIT (inherits from user)                               │
│    └── cat /proc/<PID>/limits                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Checking Limits

```bash
# Current shell limits
ulimit -n          # Soft limit
ulimit -Hn         # Hard limit

# System-wide maximum
cat /proc/sys/fs/file-max

# For a specific process
cat /proc/<PID>/limits | grep "open files"
# Max open files            1024                 65535                files

# Currently open FDs for a process
ls /proc/<PID>/fd | wc -l

# Detailed list
lsof -p <PID> | wc -l
```

### Increasing Limits

```bash
# Temporarily (current session only)
ulimit -n 65535

# Permanently (edit /etc/security/limits.conf)
# <user>     <type>  <item>    <value>
  *          soft    nofile    65535
  *          hard    nofile    65535
  root       soft    nofile    65535
  root       hard    nofile    65535

# For systemd services (in unit file)
[Service]
LimitNOFILE=65535

# System-wide (edit /etc/sysctl.conf)
fs.file-max = 2097152

# Apply without reboot
sysctl -p
```

---

## 3. "Too Many Open Files" Error

### Understanding the Error

```text
java.io.IOException: Too many open files

This means your process has hit its FD limit.

Common causes:
├── Connection pool too large
├── Not closing connections/files properly
├── FD leaks in code
├── Hundreds of log files open
└── ulimit set too low for the workload
```

### Debugging Steps

```bash
# Step 1: Find the process
ps aux | grep java

# Step 2: Check current FD count
ls /proc/<PID>/fd | wc -l

# Step 3: Check the limit
cat /proc/<PID>/limits | grep "open files"

# Step 4: See WHAT files are open
lsof -p <PID> | head -50

# Step 5: Group by type
lsof -p <PID> | awk '{print $5}' | sort | uniq -c | sort -rn

# Example output:
#  1024 IPv4    ← Too many network connections!
#   512 REG     ← Regular files
#    64 unix    ← Unix sockets
```

### Common Fixes

```java
// FIX 1: Always close resources
// ❌ BAD - FD leak
InputStream is = new FileInputStream("data.txt");
// ... use is
// forgot to close!

// ✅ GOOD - Auto-close with try-with-resources
try (InputStream is = new FileInputStream("data.txt")) {
    // ... use is
}  // Automatically closed

// FIX 2: Size connection pools appropriately
HikariConfig config = new HikariConfig();
config.setMaximumPoolSize(50);  // Not 1000!

// FIX 3: Close HTTP connections
// Spring WebClient properly manages connections
// Apache HttpClient needs connection manager
```

### Prevention Checklist

```text
☐ Set appropriate ulimit (65535 for high-traffic apps)
☐ Use try-with-resources for all I/O
☐ Configure connection pool sizes (DB, HTTP, Redis)
☐ Monitor FD count in production (Prometheus metric)
☐ Set alerts when FD usage > 80% of limit
```

---

## 4. I/O Models

### Blocking vs Non-Blocking

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    I/O MODELS                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  BLOCKING I/O:                                                       │
│  ─────────────                                                       │
│  Thread blocked until data arrives                                  │
│                                                                      │
│  Thread 1: [───read()───────────wait──────────────]──process──      │
│                                                                      │
│  Problem: 1 thread per connection = 10000 threads for 10000 users   │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  NON-BLOCKING I/O:                                                   │
│  ─────────────────                                                   │
│  Thread checks if data ready, returns immediately                   │
│                                                                      │
│  Thread 1: [read()→EAGAIN][read()→EAGAIN][read()→data!]──process── │
│                                                                      │
│  Problem: Wasteful polling                                          │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  I/O MULTIPLEXING (select/poll/epoll):                              │
│  ─────────────────────────────────────                               │
│  Monitor multiple FDs, wake when any is ready                       │
│                                                                      │
│  Thread 1: [epoll_wait()──────────]──events!──[process FD3, FD7]──  │
│                                                                      │
│  Benefit: Handle 10000 connections with few threads!                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### select, poll, epoll Comparison

| Feature | select | poll | epoll |
|---------|--------|------|-------|
| **Max FDs** | 1024 (hardcoded) | Unlimited | Unlimited |
| **Scaling** | O(n) scan every call | O(n) scan every call | O(1) for ready FDs |
| **Memory** | Copy FD set each call | Copy FD set each call | Kernel maintains list |
| **Best for** | < 100 connections | < 1000 connections | 10000+ connections |

### epoll Details

```c
// Pseudo-code showing epoll workflow
int epoll_fd = epoll_create(1);

// Register interest in FDs
epoll_ctl(epoll_fd, EPOLL_CTL_ADD, socket_fd, &event);

// Wait for events
while (true) {
    int n = epoll_wait(epoll_fd, events, MAX_EVENTS, timeout);
    
    for (int i = 0; i < n; i++) {
        // Only ready FDs are returned - no scanning!
        handle_connection(events[i].data.fd);
    }
}
```

### Edge-Triggered vs Level-Triggered

```text
LEVEL-TRIGGERED (default):
  epoll_wait returns as long as FD is readable
  Simpler to use, but may wake up repeatedly
  
EDGE-TRIGGERED (EPOLLET flag):
  epoll_wait returns only when NEW data arrives
  Must read all data or you won't be notified again!
  More efficient but tricky to implement correctly
```

---

## 5. Java and I/O Models

### Traditional I/O (java.io)

```java
// Blocking I/O - 1 thread per connection
ServerSocket server = new ServerSocket(8080);
while (true) {
    Socket client = server.accept();  // Blocks
    
    // Need new thread for each client!
    new Thread(() -> {
        InputStream in = client.getInputStream();
        in.read();  // Blocks
    }).start();
}

// Problem: 10000 connections = 10000 threads
// Each thread: ~1MB stack memory
// Total: ~10GB just for stacks!
```

### NIO (java.nio)

```java
// Non-blocking I/O with Selector (uses epoll on Linux)
Selector selector = Selector.open();
ServerSocketChannel server = ServerSocketChannel.open();
server.configureBlocking(false);
server.register(selector, SelectionKey.OP_ACCEPT);

while (true) {
    selector.select();  // Blocks until event
    
    Set<SelectionKey> keys = selector.selectedKeys();
    for (SelectionKey key : keys) {
        if (key.isAcceptable()) {
            // Accept new connection
            SocketChannel client = server.accept();
            client.configureBlocking(false);
            client.register(selector, SelectionKey.OP_READ);
        }
        if (key.isReadable()) {
            // Read data
            SocketChannel client = (SocketChannel) key.channel();
            ByteBuffer buffer = ByteBuffer.allocate(1024);
            client.read(buffer);
        }
    }
}

// Benefit: 10000 connections with 1 thread!
```

### Netty/Reactive (Modern Approach)

```java
// Netty handles all the complexity
EventLoopGroup bossGroup = new NioEventLoopGroup(1);      // Accept connections
EventLoopGroup workerGroup = new NioEventLoopGroup();     // Handle I/O

ServerBootstrap b = new ServerBootstrap();
b.group(bossGroup, workerGroup)
    .channel(NioServerSocketChannel.class)
    .childHandler(new MyHandler());

// Spring WebFlux uses Netty internally
@GetMapping("/data")
public Mono<String> getData() {
    return webClient.get()
        .uri("/api/data")
        .retrieve()
        .bodyToMono(String.class);
}
```

---

## 6. Useful Commands

### lsof (List Open Files)

```bash
# All open files for a process
lsof -p <PID>

# All network connections for a process
lsof -i -p <PID>

# Who has a file open
lsof /var/log/app.log

# All TCP connections
lsof -i TCP

# Connections to specific port
lsof -i :8080

# Count by type
lsof -p <PID> | awk '{print $5}' | sort | uniq -c
```

### ss (Socket Statistics)

```bash
# All TCP connections
ss -t

# TCP connections with process info
ss -tp

# Listening sockets
ss -l

# Summary statistics
ss -s

# Filter by port
ss -t sport = :8080 or dport = :5432
```

### Network Tuning

```bash
# Max connections waiting to be accepted
cat /proc/sys/net/core/somaxconn
# Default: 128 (often too low!)
# Increase: echo 65535 > /proc/sys/net/core/somaxconn

# TCP connection tracking
cat /proc/sys/net/netfilter/nf_conntrack_max

# Time-wait socket reuse
cat /proc/sys/net/ipv4/tcp_tw_reuse
```

---

## 7. Interview Questions

### Q1: What causes "Too many open files" and how do you fix it?

```text
Answer:
"This error occurs when a process exceeds its file descriptor limit.

Causes:
1. ulimit too low (default 1024)
2. Connection pool too large
3. FD leaks - not closing files/connections
4. Too many concurrent connections

Debugging steps:
1. Check current count: ls /proc/<PID>/fd | wc -l
2. Check limit: cat /proc/<PID>/limits
3. Find what's open: lsof -p <PID>

Fixes:
1. Increase ulimit: ulimit -n 65535
2. For systemd: LimitNOFILE=65535 in unit file
3. Fix leaks in code (try-with-resources)
4. Size connection pools appropriately"
```

### Q2: Explain blocking vs non-blocking I/O

```text
Answer:
"Blocking I/O: Thread waits until operation completes.
  Example: InputStream.read() blocks until data arrives.
  Problem: Need 1 thread per connection.

Non-blocking I/O: Operation returns immediately with result or EAGAIN.
  Example: SocketChannel in non-blocking mode.
  Problem: Need to poll repeatedly.

I/O Multiplexing (select/poll/epoll): Best of both worlds.
  Single thread monitors many FDs, wakes when any is ready.
  Example: Java NIO Selector uses epoll on Linux.

For high-concurrency servers:
- Java uses NIO Selector (epoll internally)
- Netty/WebFlux for even better abstraction
- Can handle 10000+ connections with few threads"
```

### Q3: What's the difference between select and epoll?

```text
Answer:
"select:
- Limited to 1024 FDs (hardcoded)
- O(n) scanning every call
- Copies FD set between user/kernel each call
- Good for < 100 connections

epoll:
- No FD limit
- O(1) for getting ready FDs
- Kernel maintains the FD list
- Returns ONLY ready FDs (no scanning)
- Good for 10000+ connections

Java NIO Selector automatically uses epoll on Linux.
Netty is built on top of this."
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│                 FILE DESCRIPTORS CHEAT SHEET                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ STANDARD FDs:                                                         │
│   0 = stdin, 1 = stdout, 2 = stderr                                  │
│                                                                       │
│ LIMITS:                                                               │
│   ulimit -n              Soft limit (default: 1024)                  │
│   ulimit -Hn             Hard limit                                  │
│   cat /proc/sys/fs/file-max    System-wide max                       │
│                                                                       │
│ INCREASE LIMITS:                                                      │
│   ulimit -n 65535        Temporary                                   │
│   /etc/security/limits.conf    Permanent                             │
│   LimitNOFILE=65535      For systemd                                 │
│                                                                       │
│ DEBUGGING COMMANDS:                                                   │
│   ls /proc/<PID>/fd | wc -l    Count open FDs                        │
│   lsof -p <PID>                List open files                       │
│   ss -tp                       Socket connections                    │
│                                                                       │
│ I/O MODELS:                                                           │
│   Blocking    1 thread/connection        Bad for scale               │
│   Non-blocking    Polling                Wasteful                    │
│   Multiplexing    epoll                  ✓ Best for high concurrency │
│                                                                       │
│ SCALING COMPARISON:                                                   │
│   select: O(n), max 1024 FDs                                         │
│   poll: O(n), no FD limit                                            │
│   epoll: O(1), no FD limit ←── Use this (Java NIO)                   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Next:** [5. System Calls →](./system-calls)
