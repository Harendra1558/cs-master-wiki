---
title: 4. Java 9-17 Features
sidebar_position: 4
description: Master Java 9-17 features - var, Records, Sealed Classes, Pattern Matching, HTTP Client.
keywords: [java 17, java 11, records, sealed classes, pattern matching, var, http client]
---

# Java 9-17 Features

:::info LTS Versions
Java 11 and 17 are **Long-Term Support (LTS)** versions. Most production systems run on these. Know these features well!
:::

## 1. Java 9 Features

### Immutable Collection Factories

```java
// Before Java 9: Verbose
List<String> list = Collections.unmodifiableList(
    Arrays.asList("a", "b", "c")
);

// Java 9+: Concise
List<String> list = List.of("a", "b", "c");
Set<String> set = Set.of("a", "b", "c");
Map<String, Integer> map = Map.of("a", 1, "b", 2, "c", 3);

// For more entries
Map<String, Integer> largeMap = Map.ofEntries(
    Map.entry("key1", 1),
    Map.entry("key2", 2),
    // ...
);

// ⚠️ These are IMMUTABLE
list.add("d");  // throws UnsupportedOperationException

// ⚠️ No null allowed
List.of("a", null);  // throws NullPointerException

// ⚠️ No duplicates in Set/Map keys
Set.of("a", "a");  // throws IllegalArgumentException
```

### Optional Enhancements

```java
// ifPresentOrElse (Java 9)
optional.ifPresentOrElse(
    value -> System.out.println("Found: " + value),
    () -> System.out.println("Not found")
);

// or() - lazy alternative Optional (Java 9)
Optional<User> user = findById(id)
    .or(() -> findByEmail(email))
    .or(() -> findByPhone(phone));

// stream() - convert to Stream (Java 9)
List<String> values = optionals.stream()
    .flatMap(Optional::stream)  // Only present values
    .collect(Collectors.toList());

// isEmpty() (Java 11) - opposite of isPresent
if (optional.isEmpty()) {
    return defaultValue;
}

// orElseThrow() without argument (Java 10)
User user = optional.orElseThrow();  // throws NoSuchElementException
```

### Stream Enhancements

```java
// takeWhile - take while condition is true (Java 9)
List<Integer> result = Stream.of(1, 2, 3, 4, 5, 4, 3)
    .takeWhile(n -> n < 4)
    .toList();  // [1, 2, 3]

// dropWhile - skip while condition is true (Java 9)
List<Integer> result = Stream.of(1, 2, 3, 4, 5, 4, 3)
    .dropWhile(n -> n < 4)
    .toList();  // [4, 5, 4, 3]

// ofNullable - safe single-element stream (Java 9)
Stream<String> stream = Stream.ofNullable(nullableValue);
// Empty stream if null, single-element if not

// iterate with predicate (Java 9)
Stream.iterate(1, n -> n < 100, n -> n * 2)
    .toList();  // [1, 2, 4, 8, 16, 32, 64]

// toList() - convenience method (Java 16)
List<String> list = stream.toList();  // Instead of collect(Collectors.toList())
// ⚠️ Returns unmodifiable list
```

### Private Interface Methods

```java
public interface PaymentProcessor {
    
    void processPayment(Payment payment);
    void refund(Payment payment);
    
    // Private method - shared logic
    private void logTransaction(String message) {
        System.out.println("[PAYMENT] " + message);
    }
    
    // Default method using private method
    default void processWithLogging(Payment payment) {
        logTransaction("Processing: " + payment.getId());
        processPayment(payment);
        logTransaction("Completed: " + payment.getId());
    }
}
```

---

## 2. Java 10: var Keyword

### Local Variable Type Inference

```java
// var infers type from right side
var list = new ArrayList<String>();      // ArrayList<String>
var map = new HashMap<String, User>();   // HashMap<String, User>
var stream = users.stream();             // Stream<User>

// Works with generic types
var future = CompletableFuture.supplyAsync(() -> "Hello");  // CompletableFuture<String>

// Works with try-with-resources
try (var connection = dataSource.getConnection();
     var statement = connection.prepareStatement(sql)) {
    // ...
}

// Works in for-each
for (var user : users) {
    System.out.println(user.getName());
}

// Works in lambda (Java 11)
BiFunction<String, String, String> concat = (var a, var b) -> a + b;
```

### var Limitations

```java
// ❌ Can't use without initializer
var x;  // Compile error

// ❌ Can't use with null
var x = null;  // Compile error

// ❌ Can't use for fields
class User {
    var name = "Alice";  // ❌ Compile error
}

// ❌ Can't use for method parameters
public void process(var item) {  // ❌ Compile error

// ❌ Can't use for method return type
public var getName() {  // ❌ Compile error

// ❌ Can't use with lambda alone
var runnable = () -> {};  // ❌ Can't infer functional interface

// ✅ Works with cast
var runnable = (Runnable) () -> {};  // Runnable
```

### When to Use var

```java
// ✅ Good: Obvious from right side
var users = new ArrayList<User>();
var response = httpClient.send(request);
var now = LocalDateTime.now();

// ✅ Good: Complex generic types
var future = CompletableFuture
    .supplyAsync(() -> fetchData())
    .thenApply(this::process);

// ❌ Avoid: Type not obvious
var x = getResult();  // What type is x?
var y = calculate();  // What does this return?

// ❌ Avoid: Primitive literals can be surprising
var price = 19.99;    // double (not BigDecimal!)
var count = 100;      // int (not long!)
var id = 123L;        // long (explicit L is clearer)
```

---

## 3. Java 11: HTTP Client & String APIs

### HTTP Client API

```java
// HttpClient - modern, async-capable
HttpClient client = HttpClient.newBuilder()
    .version(HttpClient.Version.HTTP_2)
    .connectTimeout(Duration.ofSeconds(10))
    .followRedirects(HttpClient.Redirect.NORMAL)
    .build();

// Synchronous request
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/users"))
    .header("Content-Type", "application/json")
    .header("Authorization", "Bearer " + token)
    .GET()
    .build();

HttpResponse<String> response = client.send(request, 
    HttpResponse.BodyHandlers.ofString());

System.out.println(response.statusCode());  // 200
System.out.println(response.body());        // JSON string

// Asynchronous request
CompletableFuture<HttpResponse<String>> futureResponse = 
    client.sendAsync(request, HttpResponse.BodyHandlers.ofString());

futureResponse
    .thenApply(HttpResponse::body)
    .thenApply(this::parseJson)
    .thenAccept(this::processResult)
    .exceptionally(ex -> {
        log.error("Request failed", ex);
        return null;
    });
```

### POST with Body

```java
// POST JSON
String jsonBody = """
    {
        "name": "John Doe",
        "email": "john@example.com"
    }
    """;

HttpRequest postRequest = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/users"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
    .build();

// POST form data
HttpRequest formRequest = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/login"))
    .header("Content-Type", "application/x-www-form-urlencoded")
    .POST(HttpRequest.BodyPublishers.ofString("username=john&password=secret"))
    .build();

// POST file
HttpRequest fileRequest = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/upload"))
    .POST(HttpRequest.BodyPublishers.ofFile(Path.of("document.pdf")))
    .build();
```

### String Methods

```java
// isBlank() - true if empty or only whitespace
"".isBlank();       // true
"   ".isBlank();    // true
"  a  ".isBlank();  // false

// strip() - Unicode-aware trim (better than trim())
"  hello  ".strip();        // "hello"
"  hello  ".stripLeading(); // "hello  "
"  hello  ".stripTrailing();// "  hello"

// lines() - split by line breaks
String multiline = "line1\nline2\nline3";
multiline.lines().forEach(System.out::println);
// line1
// line2
// line3

// repeat() - repeat string n times
"ab".repeat(3);  // "ababab"
"-".repeat(50);  // Separator line

// Java 12: indent() and transform()
"hello".indent(4);   // "    hello\n"
"HELLO".transform(String::toLowerCase);  // "hello"
```

### Files Utility Methods

```java
// Read entire file to String (Java 11)
String content = Files.readString(Path.of("file.txt"));

// Write String to file (Java 11)
Files.writeString(Path.of("output.txt"), "Hello World");

// With options
Files.writeString(
    Path.of("log.txt"), 
    "New log entry\n",
    StandardOpenOption.CREATE,
    StandardOpenOption.APPEND
);
```

---

## 4. Java 14-15: Switch Expressions & Text Blocks

### Switch Expressions

```java
// Old switch (statement)
String dayType;
switch (day) {
    case MONDAY:
    case TUESDAY:
    case WEDNESDAY:
    case THURSDAY:
    case FRIDAY:
        dayType = "Weekday";
        break;
    case SATURDAY:
    case SUNDAY:
        dayType = "Weekend";
        break;
    default:
        dayType = "Unknown";
}

// New switch (expression) - Java 14+
String dayType = switch (day) {
    case MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY -> "Weekday";
    case SATURDAY, SUNDAY -> "Weekend";
};

// With blocks and yield
int numLetters = switch (day) {
    case MONDAY, FRIDAY, SUNDAY -> 6;
    case TUESDAY -> 7;
    case THURSDAY, SATURDAY -> 8;
    case WEDNESDAY -> {
        log.info("Mid-week!");
        yield 9;  // 'yield' returns value from block
    }
};

// Exhaustive - must handle all cases
// For enums: all values or default
// For sealed classes: all permitted subtypes
```

### Text Blocks

```java
// Multi-line strings (Java 15)
String json = """
    {
        "name": "John Doe",
        "age": 30,
        "email": "john@example.com"
    }
    """;

String html = """
    <html>
        <body>
            <h1>Hello World</h1>
        </body>
    </html>
    """;

String sql = """
    SELECT u.name, u.email
    FROM users u
    WHERE u.active = true
      AND u.created_at > :date
    ORDER BY u.name
    """;

// Incidental whitespace is removed based on closing """
// Trailing whitespace is removed by default

// Escape sequences still work
String escaped = """
    Line 1\nLine 2\tTabbed
    """;

// New escape: \ at end prevents line break
String oneLine = """
    This is a \
    single line\
    """;  // "This is a single line"
```

---

## 5. Java 16-17: Records & Sealed Classes

### Records

```java
// Record - immutable data class
public record User(String name, String email, int age) {}

// Compiler generates:
// - Constructor with all fields
// - Getters: name(), email(), age() (not getName()!)
// - equals(), hashCode(), toString()
// - Private final fields

// Usage
User user = new User("John", "john@example.com", 30);
String name = user.name();  // Not getName()!
System.out.println(user);   // User[name=John, email=john@example.com, age=30]

// Records support:
// - Validation in compact constructor
// - Additional methods
// - Static fields and methods
// - Implementing interfaces

public record User(String name, String email, int age) implements Serializable {
    
    // Compact constructor - validation
    public User {
        if (age < 0) {
            throw new IllegalArgumentException("Age cannot be negative");
        }
        email = email.toLowerCase();  // Can modify before assignment
    }
    
    // Additional constructor
    public User(String name, String email) {
        this(name, email, 0);
    }
    
    // Additional methods
    public String displayName() {
        return name + " <" + email + ">";
    }
    
    // Static factory
    public static User guest() {
        return new User("Guest", "guest@example.com", 0);
    }
}

// Records CANNOT:
// - Extend other classes (implicitly extend Record)
// - Be extended (they are final)
// - Have instance fields beyond components
// - Have non-final fields
```

### Sealed Classes

```java
// Sealed class - restrict which classes can extend
public sealed class Shape 
    permits Circle, Rectangle, Triangle {
    // Only Circle, Rectangle, Triangle can extend
}

// Permitted subclass options:
// 1. final - no further extension
public final class Circle extends Shape {
    private final double radius;
    // ...
}

// 2. sealed - continue restricting
public sealed class Rectangle extends Shape
    permits Square {
    // ...
}

public final class Square extends Rectangle {
    // ...
}

// 3. non-sealed - open to extension
public non-sealed class Triangle extends Shape {
    // Any class can extend Triangle
}

// Useful with pattern matching
public double area(Shape shape) {
    return switch (shape) {
        case Circle c -> Math.PI * c.radius() * c.radius();
        case Rectangle r -> r.width() * r.height();
        case Triangle t -> 0.5 * t.base() * t.height();
        // No default needed - compiler knows all cases
    };
}
```

### Sealed Interfaces

```java
// Sealed interface
public sealed interface PaymentMethod
    permits CreditCard, BankTransfer, Wallet {
}

public record CreditCard(String number, String expiry) implements PaymentMethod {}
public record BankTransfer(String iban) implements PaymentMethod {}
public record Wallet(String walletId) implements PaymentMethod {}

// Exhaustive pattern matching
public String process(PaymentMethod method) {
    return switch (method) {
        case CreditCard cc -> "Processing card ending in " + cc.number().substring(12);
        case BankTransfer bt -> "Processing transfer to " + bt.iban();
        case Wallet w -> "Processing wallet " + w.walletId();
    };
}
```

---

## 6. Pattern Matching

### Pattern Matching for instanceof

```java
// Before Java 16
if (obj instanceof String) {
    String s = (String) obj;
    System.out.println(s.length());
}

// Java 16+: Pattern variable
if (obj instanceof String s) {
    System.out.println(s.length());  // s already cast
}

// Works with && (pattern variable in scope)
if (obj instanceof String s && s.length() > 5) {
    System.out.println(s.toUpperCase());
}

// ⚠️ Doesn't work with || (variable might not be defined)
if (obj instanceof String s || obj instanceof Integer i) {
    // ❌ Neither s nor i guaranteed to exist
}

// Useful for equals()
@Override
public boolean equals(Object obj) {
    return obj instanceof User other
        && Objects.equals(this.email, other.email);
}
```

### Pattern Matching for switch (Java 21)

```java
// Type patterns in switch
public String format(Object obj) {
    return switch (obj) {
        case Integer i -> String.format("int: %d", i);
        case Long l -> String.format("long: %d", l);
        case Double d -> String.format("double: %.2f", d);
        case String s -> String.format("string: %s", s);
        case null -> "null";
        default -> obj.toString();
    };
}

// With guards (when clause)
public String describe(Object obj) {
    return switch (obj) {
        case String s when s.isEmpty() -> "empty string";
        case String s when s.length() < 10 -> "short string: " + s;
        case String s -> "long string: " + s.substring(0, 10) + "...";
        case Integer i when i < 0 -> "negative: " + i;
        case Integer i when i == 0 -> "zero";
        case Integer i -> "positive: " + i;
        default -> "unknown";
    };
}

// Record patterns (Java 21)
record Point(int x, int y) {}
record Circle(Point center, int radius) {}

public String describe(Object obj) {
    return switch (obj) {
        case Circle(Point(var x, var y), var r) -> 
            "Circle at (" + x + "," + y + ") with radius " + r;
        case Point(var x, var y) -> 
            "Point at (" + x + "," + y + ")";
        default -> "Unknown shape";
    };
}
```

---

## 7. Other Useful Features

### Helpful NullPointerExceptions (Java 14)

```java
// Before: Which was null?
user.getAddress().getCity().toUpperCase();
// NullPointerException with message: null

// After: Precise message
// NullPointerException: Cannot invoke "Address.getCity()" 
// because the return value of "User.getAddress()" is null
```

### Compact Number Formatting (Java 12)

```java
NumberFormat fmt = NumberFormat.getCompactNumberInstance(
    Locale.US, NumberFormat.Style.SHORT);

fmt.format(1000);       // "1K"
fmt.format(1000000);    // "1M"
fmt.format(1000000000); // "1B"
```

### Collectors.teeing (Java 12)

```java
// Collect to two collectors simultaneously
record Statistics(long count, double average) {}

Statistics stats = numbers.stream()
    .collect(Collectors.teeing(
        Collectors.counting(),
        Collectors.averagingDouble(Double::doubleValue),
        Statistics::new
    ));
```

---

## 8. Interview Questions

### Q1: When should you use Records vs Classes?

```text
Answer:
"Use Records for:
- DTOs (Data Transfer Objects)
- Value objects (immutable data)
- API request/response objects
- Configuration objects
- Intermediate data in streams

Use Classes when you need:
- Mutable state
- Inheritance (extend a class)
- Custom field visibility
- Complex initialization logic
- JPA entities (usually need setters)

Records are perfect for 'data carriers' - objects 
whose primary purpose is holding data, not behavior."
```

### Q2: What's the purpose of sealed classes?

```text
Answer:
"Sealed classes restrict which classes can extend them:

1. EXHAUSTIVE PATTERN MATCHING:
   Compiler knows all subtypes, no default needed
   
2. API CONTROL:
   Library authors control extension points
   
3. DOMAIN MODELING:
   Express 'a Shape is either Circle, Rectangle, or Triangle'
   
Example:
sealed interface Result permits Success, Failure {}
record Success(Data data) implements Result {}
record Failure(Error error) implements Result {}

switch (result) {
    case Success s -> process(s.data());
    case Failure f -> log(f.error());
    // No default - compiler knows these are all cases
}"
```

### Q3: var vs explicit types - best practices?

```text
Answer:
"Use var when type is OBVIOUS from right side:

✅ Good uses:
var list = new ArrayList<String>();  // Type is clear
var user = userRepository.findById(id);  // IDE shows type
var stream = users.stream().filter(...);  // Complex generic

❌ Avoid when:
var x = process();  // What type?
var list = getItems();  // ArrayList? List? Set?
var id = 123;  // int? long?

RULES:
1. Type should be obvious without hovering/lookup
2. Use good variable names that hint at type
3. Team consistency matters more than individual preference
4. In code reviews, if reviewer asks 'what type is this?', use explicit type"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│                JAVA 9-17 FEATURES CHEAT SHEET                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ JAVA 9:                                                               │
│   List.of(), Set.of(), Map.of()   Immutable collections             │
│   optional.or(() -> alt)          Lazy alternative                  │
│   stream.takeWhile/dropWhile      Conditional take/drop             │
│                                                                       │
│ JAVA 10:                                                              │
│   var x = new ArrayList<>()       Local type inference              │
│                                                                       │
│ JAVA 11:                                                              │
│   HttpClient                       Modern HTTP client               │
│   "str".isBlank()                  Empty or whitespace              │
│   "str".lines()                    Stream of lines                  │
│   "str".repeat(n)                  Repeat n times                   │
│   Files.readString/writeString     File I/O conveniences            │
│                                                                       │
│ JAVA 14-15:                                                           │
│   switch expression                Returns value, -> syntax         │
│   Text blocks (""")               Multi-line strings                │
│                                                                       │
│ JAVA 16-17:                                                           │
│   record Point(int x, int y)      Immutable data class              │
│   sealed class Shape permits...    Restrict subclasses              │
│   if (o instanceof String s)       Pattern matching                 │
│   stream.toList()                  Unmodifiable list                │
│                                                                       │
│ RECORDS:                                                              │
│   - Immutable (final fields)                                         │
│   - Auto: constructor, getters, equals, hashCode, toString          │
│   - Compact constructor for validation                               │
│   - Cannot extend classes (implicitly extend Record)                 │
│                                                                       │
│ SEALED CLASSES:                                                       │
│   sealed class X permits A, B, C                                     │
│   Subclass must be: final, sealed, or non-sealed                    │
│   Enables exhaustive pattern matching                                │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Next:** [5. Java 21 & Virtual Threads →](./java-21-virtual-threads)
