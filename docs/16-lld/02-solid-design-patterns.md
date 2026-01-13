---
title: 2. SOLID Principles & Design Patterns
sidebar_position: 2
description: Master SOLID principles and essential design patterns for LLD interviews.
keywords: [solid principles, design patterns, low level design, oop, clean code]
---

# SOLID Principles & Design Patterns

:::info LLD Interview
LLD interviews test your ability to write **clean, extensible, maintainable code**. SOLID principles are the foundation.
:::

## 1. SOLID Principles

### S - Single Responsibility Principle

**"A class should have only one reason to change."**

```java
// ❌ BAD: Multiple responsibilities
public class User {
    private String name;
    private String email;
    
    public void save() {
        // Database logic - should be in repository
        db.insert(this);
    }
    
    public void sendEmail(String message) {
        // Email logic - should be in email service
        smtp.send(this.email, message);
    }
    
    public String toJson() {
        // Serialization - should be separate
        return gson.toJson(this);
    }
}

// ✅ GOOD: Single responsibility each
public class User {
    private String name;
    private String email;
    // Only user data and behavior
}

public class UserRepository {
    public void save(User user) { /* DB logic */ }
}

public class EmailService {
    public void send(String to, String message) { /* Email logic */ }
}

public class UserSerializer {
    public String toJson(User user) { /* Serialization */ }
}
```

### O - Open/Closed Principle

**"Open for extension, closed for modification."**

```java
// ❌ BAD: Must modify class to add new payment type
public class PaymentProcessor {
    public void process(String type, double amount) {
        if (type.equals("CREDIT_CARD")) {
            // credit card logic
        } else if (type.equals("PAYPAL")) {
            // paypal logic
        } else if (type.equals("CRYPTO")) {  // Must modify!
            // crypto logic
        }
    }
}

// ✅ GOOD: Extend without modifying
public interface PaymentProcessor {
    void process(double amount);
}

public class CreditCardProcessor implements PaymentProcessor {
    public void process(double amount) { /* Credit card logic */ }
}

public class PayPalProcessor implements PaymentProcessor {
    public void process(double amount) { /* PayPal logic */ }
}

// Adding new payment type - no modification needed!
public class CryptoProcessor implements PaymentProcessor {
    public void process(double amount) { /* Crypto logic */ }
}
```

### L - Liskov Substitution Principle

**"Subtypes must be substitutable for their base types."**

```java
// ❌ BAD: Square breaks Rectangle contract
public class Rectangle {
    protected int width;
    protected int height;
    
    public void setWidth(int width) { this.width = width; }
    public void setHeight(int height) { this.height = height; }
    public int getArea() { return width * height; }
}

public class Square extends Rectangle {
    @Override
    public void setWidth(int width) {
        this.width = width;
        this.height = width;  // Breaks expected behavior!
    }
}

// Client code breaks:
Rectangle r = new Square();
r.setWidth(5);
r.setHeight(10);
assert r.getArea() == 50;  // FAILS! Area is 100

// ✅ GOOD: Use composition or separate abstractions
public interface Shape {
    int getArea();
}

public class Rectangle implements Shape {
    private int width, height;
    public int getArea() { return width * height; }
}

public class Square implements Shape {
    private int side;
    public int getArea() { return side * side; }
}
```

### I - Interface Segregation Principle

**"Clients should not depend on interfaces they don't use."**

```java
// ❌ BAD: Fat interface
public interface Worker {
    void work();
    void eat();
    void sleep();
}

public class Robot implements Worker {
    public void work() { /* OK */ }
    public void eat() { /* Robots don't eat! */ }
    public void sleep() { /* Robots don't sleep! */ }
}

// ✅ GOOD: Segregated interfaces
public interface Workable {
    void work();
}

public interface Eatable {
    void eat();
}

public interface Sleepable {
    void sleep();
}

public class Human implements Workable, Eatable, Sleepable {
    public void work() { }
    public void eat() { }
    public void sleep() { }
}

public class Robot implements Workable {
    public void work() { }  // Only what it needs
}
```

### D - Dependency Inversion Principle

**"Depend on abstractions, not concretions."**

```java
// ❌ BAD: High-level depends on low-level
public class OrderService {
    private MySqlDatabase database = new MySqlDatabase();  // Concrete!
    
    public void save(Order order) {
        database.insert(order);  // Tightly coupled
    }
}

// ✅ GOOD: Both depend on abstraction
public interface OrderRepository {
    void save(Order order);
}

public class MySqlOrderRepository implements OrderRepository {
    public void save(Order order) { /* MySQL implementation */ }
}

public class MongoOrderRepository implements OrderRepository {
    public void save(Order order) { /* MongoDB implementation */ }
}

public class OrderService {
    private final OrderRepository repository;  // Abstraction!
    
    public OrderService(OrderRepository repository) {
        this.repository = repository;  // Injected
    }
    
    public void save(Order order) {
        repository.save(order);  // Works with any implementation
    }
}
```

---

## 2. Creational Patterns

### Factory Pattern

**When:** Object creation logic is complex or needs to be centralized.

```java
// Simple Factory
public class NotificationFactory {
    public static Notification create(String type) {
        switch (type) {
            case "EMAIL": return new EmailNotification();
            case "SMS": return new SMSNotification();
            case "PUSH": return new PushNotification();
            default: throw new IllegalArgumentException("Unknown type");
        }
    }
}

// Usage
Notification notification = NotificationFactory.create("EMAIL");
notification.send("Hello!");
```

### Builder Pattern

**When:** Object has many optional parameters.

```java
public class User {
    private final String name;        // Required
    private final String email;       // Required
    private final String phone;       // Optional
    private final String address;     // Optional
    private final int age;            // Optional
    
    private User(Builder builder) {
        this.name = builder.name;
        this.email = builder.email;
        this.phone = builder.phone;
        this.address = builder.address;
        this.age = builder.age;
    }
    
    public static class Builder {
        private final String name;
        private final String email;
        private String phone;
        private String address;
        private int age;
        
        public Builder(String name, String email) {
            this.name = name;
            this.email = email;
        }
        
        public Builder phone(String phone) {
            this.phone = phone;
            return this;
        }
        
        public Builder address(String address) {
            this.address = address;
            return this;
        }
        
        public Builder age(int age) {
            this.age = age;
            return this;
        }
        
        public User build() {
            return new User(this);
        }
    }
}

// Usage - readable and flexible
User user = new User.Builder("John", "john@email.com")
    .phone("123-456-7890")
    .age(25)
    .build();
```

### Singleton Pattern

**When:** Exactly one instance needed (use sparingly!).

```java
// Thread-safe singleton with double-checked locking
public class DatabaseConnection {
    private static volatile DatabaseConnection instance;
    
    private DatabaseConnection() {
        // Private constructor
    }
    
    public static DatabaseConnection getInstance() {
        if (instance == null) {
            synchronized (DatabaseConnection.class) {
                if (instance == null) {
                    instance = new DatabaseConnection();
                }
            }
        }
        return instance;
    }
}

// Better: Enum singleton (thread-safe, serialization-safe)
public enum ConfigManager {
    INSTANCE;
    
    private Properties config;
    
    public String get(String key) {
        return config.getProperty(key);
    }
}
```

---

## 3. Structural Patterns

### Adapter Pattern

**When:** Make incompatible interfaces work together.

```java
// Legacy payment system
public class LegacyPaymentGateway {
    public void makePayment(String xml) { /* Process XML */ }
}

// Our interface expects JSON
public interface PaymentGateway {
    void pay(PaymentRequest request);
}

// Adapter makes them compatible
public class LegacyPaymentAdapter implements PaymentGateway {
    private final LegacyPaymentGateway legacy;
    
    public LegacyPaymentAdapter(LegacyPaymentGateway legacy) {
        this.legacy = legacy;
    }
    
    @Override
    public void pay(PaymentRequest request) {
        String xml = convertToXml(request);  // Convert JSON to XML
        legacy.makePayment(xml);
    }
    
    private String convertToXml(PaymentRequest request) {
        // Conversion logic
        return "<payment>...</payment>";
    }
}
```

### Decorator Pattern

**When:** Add behavior dynamically without modifying class.

```java
public interface Coffee {
    double getCost();
    String getDescription();
}

public class SimpleCoffee implements Coffee {
    public double getCost() { return 2.0; }
    public String getDescription() { return "Coffee"; }
}

// Decorators
public abstract class CoffeeDecorator implements Coffee {
    protected Coffee coffee;
    
    public CoffeeDecorator(Coffee coffee) {
        this.coffee = coffee;
    }
}

public class MilkDecorator extends CoffeeDecorator {
    public MilkDecorator(Coffee coffee) { super(coffee); }
    
    public double getCost() { return coffee.getCost() + 0.5; }
    public String getDescription() { return coffee.getDescription() + ", Milk"; }
}

public class SugarDecorator extends CoffeeDecorator {
    public SugarDecorator(Coffee coffee) { super(coffee); }
    
    public double getCost() { return coffee.getCost() + 0.2; }
    public String getDescription() { return coffee.getDescription() + ", Sugar"; }
}

// Usage - combine dynamically
Coffee coffee = new MilkDecorator(new SugarDecorator(new SimpleCoffee()));
System.out.println(coffee.getDescription());  // "Coffee, Sugar, Milk"
System.out.println(coffee.getCost());         // 2.7
```

---

## 4. Behavioral Patterns

### Strategy Pattern

**When:** Algorithm needs to be swappable at runtime.

```java
public interface SortingStrategy {
    void sort(int[] array);
}

public class QuickSort implements SortingStrategy {
    public void sort(int[] array) { /* Quick sort implementation */ }
}

public class MergeSort implements SortingStrategy {
    public void sort(int[] array) { /* Merge sort implementation */ }
}

public class BubbleSort implements SortingStrategy {
    public void sort(int[] array) { /* Bubble sort implementation */ }
}

// Context
public class Sorter {
    private SortingStrategy strategy;
    
    public void setStrategy(SortingStrategy strategy) {
        this.strategy = strategy;
    }
    
    public void sort(int[] array) {
        strategy.sort(array);
    }
}

// Usage
Sorter sorter = new Sorter();
sorter.setStrategy(new QuickSort());  // Use quick sort
sorter.sort(data);

sorter.setStrategy(new MergeSort());  // Switch to merge sort
sorter.sort(data);
```

### Observer Pattern

**When:** Objects need to be notified of state changes.

```java
public interface Observer {
    void update(String message);
}

public interface Subject {
    void attach(Observer observer);
    void detach(Observer observer);
    void notifyObservers();
}

public class NewsAgency implements Subject {
    private List<Observer> observers = new ArrayList<>();
    private String news;
    
    public void attach(Observer observer) {
        observers.add(observer);
    }
    
    public void detach(Observer observer) {
        observers.remove(observer);
    }
    
    public void notifyObservers() {
        for (Observer observer : observers) {
            observer.update(news);
        }
    }
    
    public void setNews(String news) {
        this.news = news;
        notifyObservers();
    }
}

public class NewsChannel implements Observer {
    private String name;
    
    public NewsChannel(String name) { this.name = name; }
    
    public void update(String message) {
        System.out.println(name + " received: " + message);
    }
}

// Usage
NewsAgency agency = new NewsAgency();
agency.attach(new NewsChannel("CNN"));
agency.attach(new NewsChannel("BBC"));

agency.setNews("Breaking news!");
// Output:
// CNN received: Breaking news!
// BBC received: Breaking news!
```

---

## 5. Common LLD Interview Problems

### Parking Lot System

```java
public enum VehicleType { MOTORCYCLE, CAR, TRUCK }

public abstract class Vehicle {
    protected String licensePlate;
    protected VehicleType type;
    public abstract int getSpotsNeeded();
}

public class ParkingSpot {
    private int id;
    private VehicleType type;
    private Vehicle vehicle;
    
    public boolean isAvailable() { return vehicle == null; }
    public boolean canFitVehicle(Vehicle v) { 
        return isAvailable() && v.getSpotsNeeded() <= 1; 
    }
    public void park(Vehicle v) { this.vehicle = v; }
    public void leave() { this.vehicle = null; }
}

public class ParkingLot {
    private List<ParkingSpot> spots;
    
    public ParkingSpot findAvailableSpot(Vehicle vehicle) {
        return spots.stream()
            .filter(s -> s.canFitVehicle(vehicle))
            .findFirst()
            .orElse(null);
    }
    
    public boolean parkVehicle(Vehicle vehicle) {
        ParkingSpot spot = findAvailableSpot(vehicle);
        if (spot != null) {
            spot.park(vehicle);
            return true;
        }
        return false;
    }
}
```

### LRU Cache

```java
public class LRUCache<K, V> {
    private final int capacity;
    private final Map<K, Node<K, V>> cache;
    private final Node<K, V> head;  // Most recently used
    private final Node<K, V> tail;  // Least recently used
    
    private static class Node<K, V> {
        K key;
        V value;
        Node<K, V> prev, next;
        
        Node(K key, V value) {
            this.key = key;
            this.value = value;
        }
    }
    
    public LRUCache(int capacity) {
        this.capacity = capacity;
        this.cache = new HashMap<>();
        this.head = new Node<>(null, null);
        this.tail = new Node<>(null, null);
        head.next = tail;
        tail.prev = head;
    }
    
    public V get(K key) {
        Node<K, V> node = cache.get(key);
        if (node == null) return null;
        
        moveToHead(node);  // Recently used
        return node.value;
    }
    
    public void put(K key, V value) {
        Node<K, V> node = cache.get(key);
        
        if (node != null) {
            node.value = value;
            moveToHead(node);
        } else {
            Node<K, V> newNode = new Node<>(key, value);
            cache.put(key, newNode);
            addToHead(newNode);
            
            if (cache.size() > capacity) {
                Node<K, V> lru = removeTail();
                cache.remove(lru.key);
            }
        }
    }
    
    private void moveToHead(Node<K, V> node) {
        removeNode(node);
        addToHead(node);
    }
    
    private void addToHead(Node<K, V> node) {
        node.prev = head;
        node.next = head.next;
        head.next.prev = node;
        head.next = node;
    }
    
    private void removeNode(Node<K, V> node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }
    
    private Node<K, V> removeTail() {
        Node<K, V> lru = tail.prev;
        removeNode(lru);
        return lru;
    }
}
```

---

## 6. Interview Tips

### How to Approach LLD Interview

```text
1. CLARIFY (5 min)
   - What entities are involved?
   - What are the core use cases?
   - What are the constraints?

2. IDENTIFY CLASSES (5 min)
   - List nouns → potential classes
   - List verbs → potential methods
   - Identify relationships

3. DESIGN (15 min)
   - Start simple, extend if time
   - Apply SOLID principles
   - Use appropriate patterns

4. CODE (20 min)
   - Write clean, compilable code
   - Explain as you go
   - Handle edge cases
```

---

## Quick Reference

```text
SOLID:
- S: One class, one responsibility
- O: Extend, don't modify
- L: Subtypes must be substitutable
- I: Don't force unused methods
- D: Depend on abstractions

Key Patterns:
- Factory: Create objects
- Builder: Complex object construction
- Singleton: Single instance
- Strategy: Swappable algorithms
- Observer: Event notification
- Decorator: Add behavior dynamically
- Adapter: Make interfaces compatible

Common LLD Problems:
- Parking Lot
- Elevator System
- LRU Cache
- Vending Machine
- Library Management
- Tic-Tac-Toe
```

---

**Next:** [Design Patterns Deep Dive →](./03-design-patterns-advanced)
