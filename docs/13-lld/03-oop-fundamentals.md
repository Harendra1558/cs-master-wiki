---
title: 3. OOP Fundamentals
sidebar_position: 3
description: Master Object-Oriented Programming principles - Encapsulation, Inheritance, Polymorphism, and Composition for LLD interviews.
keywords: [oop, encapsulation, inheritance, polymorphism, composition, abstraction]
---

# OOP Fundamentals

:::info Interview Importance ⭐⭐⭐⭐⭐
OOP concepts are the foundation of every LLD interview. You must understand when and why to use each concept, not just the definitions.
:::

## 1. The Four Pillars of OOP

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    FOUR PILLARS OF OOP                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐│
│  │ Encapsulation│  │ Abstraction  │  │ Inheritance  │  │Polymorphism│
│  │              │  │              │  │              │  │           ││
│  │ Hide data    │  │ Hide         │  │ Reuse code   │  │ Many forms││
│  │ behind       │  │ complexity   │  │ via IS-A     │  │ same      ││
│  │ methods      │  │ show only    │  │ relationship │  │ interface ││
│  │              │  │ what's needed│  │              │  │           ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Encapsulation

### What is Encapsulation?

```text
ENCAPSULATION = Data + Methods that operate on that data in ONE unit
              + Control access to that data

Key principle: "Tell, don't ask"
- Don't ask for data, then do something with it
- Tell the object to do something
```

### Bad vs Good Encapsulation

```java
// ❌ BAD: Data is exposed, logic scattered everywhere
public class BankAccount {
    public double balance;  // Anyone can modify!
    public String status;
}

// Client code
BankAccount account = new BankAccount();
account.balance = account.balance - 100;  // Direct manipulation
if (account.balance < 0) {
    account.status = "OVERDRAWN";  // Logic outside the class!
}

// ════════════════════════════════════════════════════════════════════

// ✅ GOOD: Data hidden, behavior exposed through methods
public class BankAccount {
    private double balance;  // Hidden
    private AccountStatus status;  // Hidden
    
    public BankAccount(double initialBalance) {
        if (initialBalance < 0) {
            throw new IllegalArgumentException("Initial balance cannot be negative");
        }
        this.balance = initialBalance;
        this.status = AccountStatus.ACTIVE;
    }
    
    public void withdraw(double amount) {
        validateActive();
        validateAmount(amount);
        
        if (amount > balance) {
            throw new InsufficientFundsException();
        }
        
        balance -= amount;
        
        if (balance == 0) {
            status = AccountStatus.EMPTY;
        }
    }
    
    public void deposit(double amount) {
        validateActive();
        validateAmount(amount);
        balance += amount;
    }
    
    public double getBalance() {
        return balance;  // Read-only access
    }
    
    private void validateActive() {
        if (status == AccountStatus.CLOSED) {
            throw new AccountClosedException();
        }
    }
    
    private void validateAmount(double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
    }
}

// Client code - simple and clean
account.withdraw(100);  // All logic inside the class
```

### Benefits of Encapsulation

```text
1. INVARIANTS PROTECTION
   └── Class maintains its own valid state
   └── Can't create invalid objects

2. CHANGE INTERNAL IMPLEMENTATION
   └── Can change how balance is stored (e.g., cents vs dollars)
   └── Clients don't need to change

3. VALIDATION IN ONE PLACE
   └── All validation in class methods
   └── Not scattered across codebase

4. THREAD SAFETY
   └── Can add synchronization inside class
   └── Clients don't need to know
```

---

## 3. Abstraction

### What is Abstraction?

```text
ABSTRACTION = Showing only essential features
            + Hiding implementation complexity

Real-world analogy:
Car: You use steering wheel, pedals
     You don't need to know how engine works internally
```

### Abstraction with Interfaces

```java
// Abstraction: Define WHAT, not HOW
public interface PaymentGateway {
    PaymentResult processPayment(PaymentRequest request);
    RefundResult refund(String transactionId);
}

// Implementation 1: Stripe
public class StripeGateway implements PaymentGateway {
    private final StripeClient client;
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        // Complex Stripe-specific logic hidden
        StripeCharge charge = client.charges().create(
            new ChargeCreateParams.Builder()
                .setAmount(convertToCents(request.getAmount()))
                .setCurrency(request.getCurrency())
                .setSource(request.getToken())
                .build()
        );
        return mapToPaymentResult(charge);
    }
    
    @Override
    public RefundResult refund(String transactionId) {
        // Stripe refund implementation
    }
}

// Implementation 2: PayPal
public class PayPalGateway implements PaymentGateway {
    private final PayPalClient client;
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        // Completely different PayPal implementation
        // But same interface!
    }
    
    @Override
    public RefundResult refund(String transactionId) {
        // PayPal refund implementation
    }
}

// Client code - doesn't know or care which implementation
public class OrderService {
    private final PaymentGateway paymentGateway;  // Abstraction!
    
    public void checkout(Order order) {
        PaymentResult result = paymentGateway.processPayment(
            new PaymentRequest(order.getTotal(), order.getCurrency())
        );
        
        if (result.isSuccessful()) {
            order.markPaid();
        }
    }
}
```

### Abstraction with Abstract Classes

```java
// Abstract class: Partial implementation + contract
public abstract class Notification {
    protected String recipient;
    protected String message;
    
    // Common implementation
    public void prepare(String recipient, String message) {
        this.recipient = recipient;
        this.message = message;
        validate();
    }
    
    // Common validation
    protected void validate() {
        if (recipient == null || recipient.isEmpty()) {
            throw new IllegalArgumentException("Recipient required");
        }
        if (message == null || message.isEmpty()) {
            throw new IllegalArgumentException("Message required");
        }
    }
    
    // Template method
    public final void send() {
        prepare();
        doSend();  // Let subclass implement
        logSent();
    }
    
    // Abstract: Subclass MUST implement
    protected abstract void doSend();
    
    private void logSent() {
        System.out.println("Notification sent to: " + recipient);
    }
}

public class EmailNotification extends Notification {
    @Override
    protected void doSend() {
        // Email-specific sending logic
        emailService.send(recipient, message);
    }
}

public class SMSNotification extends Notification {
    @Override
    protected void doSend() {
        // SMS-specific sending logic
        smsGateway.sendText(recipient, message);
    }
}
```

### Interface vs Abstract Class

```text
┌─────────────────────────────────────────────────────────────────────┐
│                 INTERFACE vs ABSTRACT CLASS                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  INTERFACE                      │  ABSTRACT CLASS                    │
│  ─────────────────────────────  │  ─────────────────────────────    │
│  CAN-DO relationship            │  IS-A relationship                 │
│  "implements"                   │  "extends"                         │
│  Multiple interfaces allowed    │  Single inheritance only           │
│  No state (fields)              │  Can have state (fields)           │
│  All methods public             │  Can have protected/private        │
│  100% abstract (before Java 8)  │  Partial implementation            │
│                                 │                                    │
│  Use when:                      │  Use when:                         │
│  - Defining a capability        │  - Sharing code between classes    │
│  - Multiple inheritance needed  │  - Common base behavior            │
│  - Loose coupling               │  - Template method pattern         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Inheritance

### What is Inheritance?

```text
INHERITANCE = IS-A relationship
            = Child class gets all properties/methods of Parent
            = Code reuse through hierarchy

Dog IS-A Animal → Dog extends Animal
Car IS-A Vehicle → Car extends Vehicle
```

### Inheritance Example

```java
// Base class
public class Employee {
    protected String name;
    protected String id;
    protected double baseSalary;
    
    public Employee(String name, String id, double baseSalary) {
        this.name = name;
        this.id = id;
        this.baseSalary = baseSalary;
    }
    
    public double calculateSalary() {
        return baseSalary;
    }
    
    public void work() {
        System.out.println(name + " is working");
    }
}

// Child class: inherits everything + adds more
public class Manager extends Employee {
    private double bonus;
    private List<Employee> team;
    
    public Manager(String name, String id, double baseSalary, double bonus) {
        super(name, id, baseSalary);  // Call parent constructor
        this.bonus = bonus;
        this.team = new ArrayList<>();
    }
    
    // Override parent method
    @Override
    public double calculateSalary() {
        return baseSalary + bonus + (team.size() * 100);  // Team bonus
    }
    
    // Additional method specific to Manager
    public void addTeamMember(Employee employee) {
        team.add(employee);
    }
}

// Another child class
public class Developer extends Employee {
    private String[] technologies;
    
    public Developer(String name, String id, double baseSalary, String[] technologies) {
        super(name, id, baseSalary);
        this.technologies = technologies;
    }
    
    @Override
    public double calculateSalary() {
        // Extra pay for each technology
        return baseSalary + (technologies.length * 500);
    }
    
    public void code() {
        System.out.println(name + " is coding in " + technologies[0]);
    }
}
```

### Problems with Inheritance

```java
// ❌ PROBLEM: Fragile Base Class
public class ArrayList<E> {
    public void add(E element) { ... }
    public void addAll(Collection<E> elements) {
        for (E e : elements) {
            add(e);  // Calls add for each
        }
    }
}

public class CountingList<E> extends ArrayList<E> {
    private int addCount = 0;
    
    @Override
    public void add(E element) {
        addCount++;
        super.add(element);
    }
    
    @Override
    public void addAll(Collection<E> elements) {
        addCount += elements.size();
        super.addAll(elements);  // This calls add() for each!
    }
    
    // BUG: addCount is DOUBLE what it should be!
    // super.addAll() calls our overridden add()
}

// ❌ PROBLEM: Deep inheritance hierarchies
//            Become hard to understand and change
Animal
  └── Mammal
        └── Carnivore
              └── Feline
                    └── Cat
                          └── HouseCat
                                └── PersianCat  // Too deep!
```

---

## 5. Composition Over Inheritance

### Why Prefer Composition?

```text
COMPOSITION = HAS-A relationship
            = Object contains other objects
            = More flexible than inheritance

Rules of thumb:
├── Use inheritance for IS-A (true subtype relationship)
├── Use composition for HAS-A (functionality sharing)
└── When in doubt, prefer composition
```

### Composition Example

```java
// ❌ INHERITANCE approach: Rigid
public class Car extends Engine {  // Car IS-NOT an Engine!
    // Inherits all Engine methods... confusing
}

// ════════════════════════════════════════════════════════════════════

// ✅ COMPOSITION approach: Flexible
public interface Engine {
    void start();
    void stop();
    int getHorsepower();
}

public class GasEngine implements Engine {
    public void start() { /* Gas engine start */ }
    public void stop() { /* Gas engine stop */ }
    public int getHorsepower() { return 300; }
}

public class ElectricEngine implements Engine {
    public void start() { /* Electric engine start */ }
    public void stop() { /* Electric engine stop */ }
    public int getHorsepower() { return 250; }
}

public class Car {
    private final Engine engine;  // HAS-A relationship
    private final Transmission transmission;
    private final GPS gps;
    
    public Car(Engine engine, Transmission transmission, GPS gps) {
        this.engine = engine;
        this.transmission = transmission;
        this.gps = gps;
    }
    
    public void start() {
        engine.start();
        // Can delegate to composed objects
    }
    
    // Can easily swap engine type at runtime or construction
}

// Usage: Very flexible
Car gasCar = new Car(new GasEngine(), new AutomaticTransmission(), new GarminGPS());
Car electricCar = new Car(new ElectricEngine(), new AutomaticTransmission(), new GoogleGPS());
```

### Real-World Example: Strategies via Composition

```java
// Instead of inheritance hierarchy for discounts...
public class Order {
    private final DiscountStrategy discountStrategy;
    private final TaxStrategy taxStrategy;
    private final ShippingStrategy shippingStrategy;
    
    public Order(DiscountStrategy discount, TaxStrategy tax, ShippingStrategy shipping) {
        this.discountStrategy = discount;
        this.taxStrategy = tax;
        this.shippingStrategy = shipping;
    }
    
    public double calculateTotal(List<Item> items) {
        double subtotal = items.stream().mapToDouble(Item::getPrice).sum();
        double discount = discountStrategy.calculate(subtotal);
        double tax = taxStrategy.calculate(subtotal - discount);
        double shipping = shippingStrategy.calculate(items);
        
        return subtotal - discount + tax + shipping;
    }
}

// Can combine any strategies!
Order order = new Order(
    new PercentageDiscount(10),
    new CaliforniaTax(),
    new FreeShippingOver100()
);
```

---

## 6. Polymorphism

### What is Polymorphism?

```text
POLYMORPHISM = "Many forms"
             = Same interface, different implementations
             = Treat different types uniformly

Two types:
1. COMPILE-TIME (Static): Method overloading
2. RUNTIME (Dynamic): Method overriding
```

### Compile-Time Polymorphism (Overloading)

```java
public class Calculator {
    // Same method name, different parameters
    public int add(int a, int b) {
        return a + b;
    }
    
    public double add(double a, double b) {
        return a + b;
    }
    
    public int add(int a, int b, int c) {
        return a + b + c;
    }
    
    public String add(String a, String b) {
        return a + b;  // Concatenation
    }
}

Calculator calc = new Calculator();
calc.add(1, 2);        // Calls int version → 3
calc.add(1.5, 2.5);    // Calls double version → 4.0
calc.add(1, 2, 3);     // Calls 3-param version → 6
calc.add("Hello", " World");  // Calls String version → "Hello World"

// Compiler decides which method at compile time based on parameters
```

### Runtime Polymorphism (Overriding)

```java
public interface Shape {
    double area();
    void draw();
}

public class Circle implements Shape {
    private double radius;
    
    @Override
    public double area() {
        return Math.PI * radius * radius;
    }
    
    @Override
    public void draw() {
        System.out.println("Drawing circle with radius " + radius);
    }
}

public class Rectangle implements Shape {
    private double width, height;
    
    @Override
    public double area() {
        return width * height;
    }
    
    @Override
    public void draw() {
        System.out.println("Drawing rectangle " + width + "x" + height);
    }
}

// Polymorphic usage
public class Canvas {
    private List<Shape> shapes = new ArrayList<>();
    
    public void addShape(Shape shape) {
        shapes.add(shape);  // Can add ANY shape
    }
    
    public double getTotalArea() {
        double total = 0;
        for (Shape shape : shapes) {
            total += shape.area();  // Calls correct method at RUNTIME
        }
        return total;
    }
    
    public void render() {
        for (Shape shape : shapes) {
            shape.draw();  // Different behavior for each shape
        }
    }
}

// Usage
Canvas canvas = new Canvas();
canvas.addShape(new Circle(5));       // Treated as Shape
canvas.addShape(new Rectangle(4, 6)); // Treated as Shape
canvas.render();
// Output:
// Drawing circle with radius 5
// Drawing rectangle 4x6
```

### The Power of Polymorphism

```java
// Without polymorphism - Nightmare!
public class ZooWithoutPolymorphism {
    public void feedAnimals() {
        for (Dog dog : dogs) { dog.eatDogFood(); }
        for (Cat cat : cats) { cat.eatCatFood(); }
        for (Bird bird : birds) { bird.eatBirdFood(); }
        // Add lion, tiger, bear... endless if-else!
    }
}

// With polymorphism - Clean!
public class Zoo {
    private List<Animal> animals;  // All treated uniformly
    
    public void feedAnimals() {
        for (Animal animal : animals) {
            animal.eat();  // Each eats its own food
        }
    }
    
    public void makeAllSpeak() {
        for (Animal animal : animals) {
            animal.speak();  // Dog barks, Cat meows, Bird chirps
        }
    }
}
```

---

## 7. Interview Questions

### Q1: Explain the difference between Encapsulation and Abstraction

```text
Answer:
"Encapsulation and Abstraction are related but different:

ENCAPSULATION:
- Bundles data + methods into a single unit (class)
- Controls ACCESS to that data (private fields, public methods)
- HOW something is implemented
- Example: Making balance private, providing deposit/withdraw methods

ABSTRACTION:
- Hides COMPLEXITY, shows only essential features
- Defines WHAT something does, not how
- Uses interfaces and abstract classes
- Example: PaymentGateway interface - you know it can processPayment(),
  you don't know if it's Stripe or PayPal underneath

They work together:
- Abstraction decides what to show (the interface)
- Encapsulation decides how to hide (the implementation)"
```

### Q2: When would you use inheritance vs composition?

```text
Answer:
"My default is composition. I use inheritance only when:

USE INHERITANCE when:
1. True IS-A relationship
   - Dog IS-A Animal (makes sense)
   - Manager IS-A Employee (makes sense)

2. You want to be substitutable (Liskov)
   - Can use subclass anywhere parent is used

3. You want polymorphic behavior
   - Different implementations of same method

USE COMPOSITION when:
1. HAS-A relationship
   - Car HAS-A Engine (not IS-A Engine!)

2. Need flexibility to change at runtime
   - Can swap out composed objects

3. Need multiple 'inheritance'
   - Java allows only single inheritance
   - Can compose multiple behaviors

4. Avoiding tight coupling
   - Changes to parent break children

Example:
❌ class Car extends Engine  // Wrong!
✅ class Car { private Engine engine; }  // Right!

Rule: 'Favor composition over inheritance'"
```

### Q3: What is polymorphism? Give a real-world example.

```text
Answer:
"Polymorphism means 'many forms'. Same interface, different behaviors.

Real-world example - Payment Processing:

interface PaymentMethod {
    void processPayment(double amount);
}

class CreditCard implements PaymentMethod {
    void processPayment(double amount) {
        // Charge card, verify CVV, etc.
    }
}

class PayPal implements PaymentMethod {
    void processPayment(double amount) {
        // Redirect to PayPal, handle OAuth
    }
}

class Crypto implements PaymentMethod {
    void processPayment(double amount) {
        // Generate wallet address, wait for confirmation
    }
}

// Checkout code doesn't care which payment type!
class Checkout {
    void complete(PaymentMethod payment, double amount) {
        payment.processPayment(amount);  // Works for any payment type!
    }
}

Benefits:
1. Open for extension (add Apple Pay without changing Checkout)
2. Single responsibility (each payment type handles itself)
3. Clean code (no switch statements on payment type)"
```

### Q4: Why is encapsulation important? What could go wrong without it?

```text
Answer:
"Encapsulation protects object integrity. Without it:

PROBLEM 1: INVALID STATE
public class Account {
    public double balance;  // Anyone can set!
}

account.balance = -1000;  // Invalid state!
account.balance = null;   // Boom!

PROBLEM 2: SCATTERED LOGIC
// Every place that modifies balance needs validation
if (amount > 0 && account.balance >= amount) {
    account.balance -= amount;
}
// Repeated in 50 places, one forgets validation...

PROBLEM 3: CAN'T CHANGE IMPLEMENTATION
// If balance is public and stored as double
// You can't change to store as long (cents) without breaking everyone

PROBLEM 4: NO THREAD SAFETY
// Multiple threads can set balance simultaneously
// Race conditions, lost updates

WITH ENCAPSULATION:
- Private balance
- Public withdraw(amount) that validates
- Change to cents internally without breaking clients
- Add synchronized if needed
- Single source of truth for all rules"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│                        OOP CHEAT SHEET                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ ENCAPSULATION:                                                        │
│ ├── Private fields + Public methods                                   │
│ ├── "Tell, don't ask"                                                │
│ ├── Protects invariants                                               │
│ └── Enables implementation changes                                    │
│                                                                       │
│ ABSTRACTION:                                                          │
│ ├── Interface/Abstract class defines WHAT                             │
│ ├── Implementation defines HOW                                        │
│ ├── Hide complexity                                                   │
│ └── Program to interface, not implementation                          │
│                                                                       │
│ INHERITANCE:                                                          │
│ ├── IS-A relationship                                                 │
│ ├── Code reuse through hierarchy                                      │
│ ├── Enables polymorphism                                              │
│ └── Use sparingly - can be fragile                                    │
│                                                                       │
│ COMPOSITION:                                                          │
│ ├── HAS-A relationship                                                │
│ ├── More flexible than inheritance                                    │
│ ├── Swap behavior at runtime                                          │
│ └── PREFER over inheritance                                           │
│                                                                       │
│ POLYMORPHISM:                                                         │
│ ├── Compile-time: Method overloading                                  │
│ ├── Runtime: Method overriding                                        │
│ ├── Same interface, different behavior                                │
│ └── Enables extensibility                                             │
│                                                                       │
│ QUICK RULES:                                                          │
│ ├── Data: Private                                                     │
│ ├── Access: Through methods                                           │
│ ├── Inheritance: Only for true IS-A                                   │
│ ├── Composition: Default choice for sharing code                      │
│ └── Polymorphism: Program to interfaces                               │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Next:** [4. Design Patterns Deep Dive →](./design-patterns-advanced)
