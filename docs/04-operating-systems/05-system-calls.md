---
title: 5. System Calls
sidebar_position: 5
description: Master system calls, user vs kernel mode, and debugging with strace for backend interviews.
keywords: [system calls, kernel, user mode, strace, linux, performance]
---

# System Calls

:::info Interview Importance ⭐⭐⭐
Understanding system calls helps you explain why certain operations are expensive, debug performance issues, and make informed architectural decisions.
:::

## 1. What is a System Call?

### Definition

A **system call (syscall)** is the interface between user programs and the kernel. It's how applications request services from the operating system.

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    USER SPACE vs KERNEL SPACE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     USER SPACE                              │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐               │    │
│  │  │  Your App │  │  Library  │  │   JVM     │               │    │
│  │  │  (Java)   │  │  (glibc)  │  │           │               │    │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘               │    │
│  │        │              │              │                      │    │
│  │        └──────────────┴──────────────┘                      │    │
│  │                       │                                     │    │
│  │                 System Call                                 │    │
│  │                       │                                     │    │
│  └───────────────────────┼─────────────────────────────────────┘    │
│  ════════════════════════╪═════════════════════════════════════     │
│  ┌───────────────────────┼─────────────────────────────────────┐    │
│  │                       ↓                                     │    │
│  │                  KERNEL SPACE                               │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐               │    │
│  │  │   FS      │  │  Network  │  │  Memory   │               │    │
│  │  │  Driver   │  │  Stack    │  │  Manager  │               │    │
│  │  └───────────┘  └───────────┘  └───────────┘               │    │
│  │                       │                                     │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │                   HARDWARE                          │   │    │
│  │  └─────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Syscalls are Necessary

```text
User programs CANNOT directly:
├── Access hardware (disk, network, devices)
├── Modify other processes' memory
├── Change system configuration
└── Access protected resources

They must ASK the kernel via syscalls!
```

---

## 2. User Mode vs Kernel Mode

### CPU Privilege Levels

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    CPU PRIVILEGE RINGS                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                    ┌─────────────────┐                              │
│                    │     Ring 0      │  ← Kernel Mode               │
│                    │   (Full Access) │     Most privileged          │
│                    └────────┬────────┘                              │
│                             │                                        │
│                    ┌────────┴────────┐                              │
│                    │     Ring 3      │  ← User Mode                 │
│                    │  (Restricted)   │     Least privileged         │
│                    └─────────────────┘                              │
│                                                                      │
│  User Mode:                         Kernel Mode:                    │
│  ├── Can't access hardware directly ├── Full hardware access       │
│  ├── Can't execute privileged instr ├── All CPU instructions       │
│  ├── Limited memory access          ├── All memory accessible      │
│  └── Where your app runs            └── Where OS kernel runs       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Mode Switching

```text
When a syscall happens:

1. User app calls glibc function (e.g., write())
2. glibc prepares syscall number and args in registers
3. glibc executes SYSCALL instruction (x86_64)
4. CPU switches to Ring 0 (kernel mode)
5. CPU jumps to kernel's syscall handler
6. Kernel performs the operation
7. Kernel returns result
8. CPU switches back to Ring 3 (user mode)
9. Control returns to app

This switch is EXPENSIVE: ~100-1000 cycles
```

---

## 3. Common System Calls

### Categories of Syscalls

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    SYSTEM CALL CATEGORIES                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PROCESS CONTROL:                                                    │
│  ├── fork()      Create child process                              │
│  ├── exec()      Execute a program                                  │
│  ├── exit()      Terminate process                                  │
│  └── wait()      Wait for child process                             │
│                                                                      │
│  FILE OPERATIONS:                                                    │
│  ├── open()      Open a file                                        │
│  ├── read()      Read from file descriptor                          │
│  ├── write()     Write to file descriptor                           │
│  ├── close()     Close file descriptor                              │
│  ├── lseek()     Move file pointer                                  │
│  └── stat()      Get file information                               │
│                                                                      │
│  NETWORK:                                                            │
│  ├── socket()    Create socket                                      │
│  ├── connect()   Connect to server                                  │
│  ├── bind()      Bind to address                                    │
│  ├── listen()    Listen for connections                             │
│  ├── accept()    Accept connection                                  │
│  ├── send()/recv()  Send/receive data                              │
│  └── select()/poll()/epoll()  I/O multiplexing                     │
│                                                                      │
│  MEMORY:                                                             │
│  ├── mmap()      Map memory                                         │
│  ├── munmap()    Unmap memory                                       │
│  └── brk()       Adjust heap size                                   │
│                                                                      │
│  TIME:                                                               │
│  ├── gettimeofday()  Get current time                              │
│  ├── clock_gettime() High-resolution time                          │
│  └── nanosleep()     Sleep                                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Java to Syscall Mapping

```java
// Java code                          // Underlying syscalls

new FileInputStream("data.txt")  -->  open("data.txt", O_RDONLY)
inputStream.read()               -->  read(fd, buffer, size)
inputStream.close()              -->  close(fd)

Socket socket = new Socket()     -->  socket(AF_INET, SOCK_STREAM, 0)
socket.connect(addr)             -->  connect(fd, addr, len)
socket.getInputStream().read()   -->  recv(fd, buffer, size, 0)

new Thread().start()             -->  clone(CLONE_VM | CLONE_THREAD | ...)
Thread.sleep(1000)               -->  nanosleep({1, 0}, NULL)

System.currentTimeMillis()       -->  clock_gettime(CLOCK_REALTIME, &ts)
```

---

## 4. System Call Overhead

### Why Syscalls are Expensive

```text
Syscall cost breakdown (approximate):

1. Argument preparation:        ~10 cycles
2. SYSCALL instruction:         ~50 cycles
3. Mode switch (user→kernel):   ~100-200 cycles
4. Kernel work:                 varies (disk I/O = millions!)
5. Mode switch (kernel→user):   ~100-200 cycles
6. Result handling:             ~10 cycles

Minimum overhead: ~500 cycles = ~200 nanoseconds

Plus:
- TLB/cache pollution
- Security checks
- Context saving/restoration
```

### Reducing Syscall Overhead

```java
// ❌ BAD: One syscall per byte
FileInputStream fis = new FileInputStream("data.txt");
int b;
while ((b = fis.read()) != -1) {  // syscall every byte!
    process(b);
}

// ✅ GOOD: Buffered reads (single syscall per buffer)
BufferedInputStream bis = new BufferedInputStream(fis, 8192);
int b;
while ((b = bis.read()) != -1) {  // syscall every 8KB
    process(b);
}

// ✅ EVEN BETTER: Bulk reads
byte[] buffer = new byte[8192];
int bytesRead;
while ((bytesRead = fis.read(buffer)) != -1) {
    process(buffer, bytesRead);
}
```

### Batching Syscalls

```java
// ❌ BAD: Network write per message
for (Message msg : messages) {
    socket.getOutputStream().write(msg.toBytes());  // syscall each
}

// ✅ GOOD: Batch writes
ByteArrayOutputStream batch = new ByteArrayOutputStream();
for (Message msg : messages) {
    batch.write(msg.toBytes());
}
socket.getOutputStream().write(batch.toByteArray());  // single syscall
```

---

## 5. Debugging with strace

### What is strace?

`strace` intercepts and records all system calls made by a process. Essential for debugging.

### Basic Usage

```bash
# Trace a new command
strace ls -la

# Trace existing process
strace -p <PID>

# Trace with timing
strace -T ls -la

# Summary statistics
strace -c java -jar app.jar

# Output to file
strace -o trace.log -p <PID>

# Trace specific syscalls
strace -e open,read,write ls

# Trace category of syscalls
strace -e trace=file ls      # File operations
strace -e trace=network curl google.com  # Network
strace -e trace=memory java -jar app.jar # Memory
```

### Reading strace Output

```bash
$ strace -T cat /etc/passwd

open("/etc/passwd", O_RDONLY)         = 3 <0.000015>
fstat(3, {st_mode=S_IFREG|0644, ...}) = 0 <0.000007>
read(3, "root:x:0:0:root:/root:...", 65536) = 2847 <0.000012>
write(1, "root:x:0:0:root:/root:...", 2847) = 2847 <0.000045>
close(3)                              = 0 <0.000008>
exit_group(0)                         = ?

# Format: syscall(args) = return_value <time_in_seconds>

# Key observations:
# - open() returned fd 3
# - read() read 2847 bytes
# - write() wrote 2847 bytes to fd 1 (stdout)
# - Timings in <brackets> show each syscall duration
```

### Finding Performance Issues

```bash
# Summary of syscalls
$ strace -c -p <PID>

% time     seconds  usecs/call     calls    errors syscall
------ ----------- ----------- --------- --------- ----------------
 82.14    5.230944        5230      1000           write
 10.23    0.651234         651      1000           read
  5.12    0.326123          32     10000           clock_gettime
  2.51    0.159876          79      2000           futex
------ ----------- ----------- --------- --------- ----------------
100.00    6.368177                 14000           total

# Analysis:
# - 82% time in write() calls → I/O bound
# - 10000 clock_gettime calls → excessive time lookups
# - 2000 futex calls → potential lock contention
```

### Debugging "Too Many Open Files"

```bash
# See what files are being opened
strace -e openat -p <PID> 2>&1 | head -100

# Output:
openat(AT_FDCWD, "/var/log/app.log", O_WRONLY|O_CREAT|O_APPEND) = -1 EMFILE (Too many open files)

# EMFILE means process hit FD limit
```

---

## 6. VDSO: Optimizing Syscalls

### What is VDSO?

**VDSO (Virtual Dynamic Shared Object)** is a small library mapped into every process that allows some syscalls to run in user mode without switching to kernel.

```text
Traditional syscall:
  User → Kernel → User (expensive)

VDSO-optimized:
  User → VDSO (user space) → User (much faster!)

VDSO functions:
├── clock_gettime()   ← Very common, now fast
├── gettimeofday()
├── time()
└── getcpu()
```

### Why This Matters

```java
// System.currentTimeMillis() is cheap on modern Linux
// Because clock_gettime uses VDSO (no kernel transition)

long start = System.currentTimeMillis();
doWork();
long elapsed = System.currentTimeMillis() - start;

// Previously expensive, now ~20ns instead of ~200ns
```

---

## 7. Interview Questions

### Q1: What happens when you call System.currentTimeMillis() in Java?

```text
Answer:
"System.currentTimeMillis() ultimately calls the clock_gettime syscall.

On modern Linux, this doesn't actually enter the kernel because it uses 
VDSO (Virtual Dynamic Shared Object). The kernel maps a read-only memory 
page into every process with the current time, which it updates regularly.

So the 'syscall' runs entirely in user space, taking only ~20ns instead 
of the ~200ns a real syscall would take.

This is why timestamping in Java is quite cheap, though you should still 
avoid excessive calls in tight loops."
```

### Q2: Why are syscalls expensive?

```text
Answer:
"Syscalls are expensive for several reasons:

1. MODE SWITCH: CPU switches from Ring 3 (user) to Ring 0 (kernel)
   - Saves all registers
   - Changes privilege level
   - ~100-200 cycles each direction

2. SECURITY CHECKS: Kernel validates all arguments
   - Can't trust user input
   - Checks permissions

3. CACHE POLLUTION: Kernel code replaces user code in cache
   - After returning, user code may need to be reloaded

4. TLB FLUSH: Some syscalls require TLB invalidation
   - Affects future memory accesses

Total minimum overhead: ~500 cycles (~200ns)
Plus any actual I/O wait time.

That's why we buffer I/O operations to reduce syscall count."
```

### Q3: How do you debug a slow application on Linux?

```text
Answer:
"I use a systematic approach:

1. IDENTIFY THE BOTTLENECK
   $ top / htop - CPU or I/O bound?
   $ strace -c -p <PID> - Which syscalls are slow?
   
2. SYSCALL ANALYSIS
   $ strace -T -p <PID> - Times for each call
   
   Look for:
   - Many small reads/writes (need buffering)
   - Slow network calls (latency issue)
   - Lock contention (many futex calls)
   
3. FOR JAVA SPECIFICALLY
   $ jstack <PID> - Thread states
   $ async-profiler - CPU/allocation profiling
   
4. NETWORK ISSUES
   $ ss -tp - Connection states
   $ tcpdump - Packet analysis

Example: If strace shows 90% time in write() with small sizes,
solution is to buffer writes instead of many small syscalls."
```

### Q4: What's the difference between a syscall and a library call?

```text
Answer:
"Library call: Runs entirely in user space
  Example: strlen(), qsort(), Math.sqrt()
  Just CPU instructions, no privilege change
  Cost: nanoseconds

Syscall: Requests kernel service
  Example: read(), write(), socket()
  Requires mode switch, expensive
  Cost: microseconds minimum

Many 'library functions' actually WRAP syscalls:
  fread() → read()  (but adds buffering!)
  malloc() → mmap()/brk()
  printf() → write()

Key insight: Libraries like glibc add optimization layers 
(buffering, caching) to reduce actual syscall count."
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    SYSTEM CALLS CHEAT SHEET                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ USER vs KERNEL MODE:                                                  │
│   User (Ring 3): Restricted, where apps run                          │
│   Kernel (Ring 0): Full access, where OS runs                        │
│   Syscalls bridge the gap                                            │
│                                                                       │
│ SYSCALL COST:                                                         │
│   Minimum: ~500 cycles (~200ns)                                      │
│   Plus: actual work (disk I/O = milliseconds!)                       │
│                                                                       │
│ COMMON SYSCALLS:                                                      │
│   Files:   open, read, write, close, stat                            │
│   Network: socket, connect, bind, listen, accept                     │
│   Process: fork, exec, exit, wait                                    │
│   Memory:  mmap, brk                                                 │
│   Time:    clock_gettime (VDSO optimized)                            │
│                                                                       │
│ STRACE COMMANDS:                                                      │
│   strace -p <PID>         Trace running process                      │
│   strace -c <cmd>         Summary statistics                         │
│   strace -T <cmd>         Show timing per call                       │
│   strace -e read,write    Trace specific syscalls                    │
│                                                                       │
│ OPTIMIZATION TIPS:                                                    │
│   ├── Buffer I/O (BufferedInputStream)                               │
│   ├── Batch operations (single write vs many)                        │
│   ├── Use memory-mapped I/O for large files                          │
│   └── Avoid syscalls in hot paths                                    │
│                                                                       │
│ VDSO-OPTIMIZED (no kernel switch):                                   │
│   clock_gettime, gettimeofday, time, getcpu                          │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Back to:** [← Operating Systems Overview](./intro)
