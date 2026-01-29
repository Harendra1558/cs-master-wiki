---
title: 4. Design Patterns Advanced
sidebar_position: 4
description: Master advanced design patterns - Proxy, Facade, State, Command, Template Method, and Spring Framework integration.
keywords: [design patterns, proxy, facade, state, command, template method, spring patterns]
---

# Design Patterns Advanced

:::info Interview Importance ⭐⭐⭐⭐
Beyond basic patterns, knowing Proxy, Facade, State, and Command patterns differentiates strong candidates. Understanding how Spring uses these patterns is essential for Java interviews.
:::

## 1. Additional Structural Patterns

### Proxy Pattern

```text
PROXY = Stand-in for another object
      = Controls access to the real object
      = Same interface as the real object

Use cases:
├── LAZY LOADING: Load heavy object only when needed
├── ACCESS CONTROL: Check permissions before forwarding
├── LOGGING: Log all method calls
├── CACHING: Cache results
└── REMOTE: Represent remote object locally
```

```java
// Interface
public interface Image {
    void display();
}

// Real (heavy) object
public class HighResImage implements Image {
    private String filename;
    private byte[] imageData;
    
    public HighResImage(String filename) {
        this.filename = filename;
        loadFromDisk();  // Expensive operation!
    }
    
    private void loadFromDisk() {
        System.out.println("Loading high-res image: " + filename);
        // Simulates loading large file
        this.imageData = new byte[10_000_000];
    }
    
    @Override
    public void display() {
        System.out.println("Displaying: " + filename);
    }
}

// Proxy - delays loading until display() is called
public class ImageProxy implements Image {
    private String filename;
    private HighResImage realImage;  // Created lazily
    
    public ImageProxy(String filename) {
        this.filename = filename;
        // NOT loading the heavy image yet!
    }
    
    @Override
    public void display() {
        if (realImage == null) {
            realImage = new HighResImage(filename);  // Load on first use
        }
        realImage.display();
    }
}

// Usage
List<Image> gallery = new ArrayList<>();
gallery.add(new ImageProxy("photo1.jpg"));  // Fast - no loading
gallery.add(new ImageProxy("photo2.jpg"));  // Fast
gallery.add(new ImageProxy("photo3.jpg"));  // Fast

// Only loads when displayed
gallery.get(0).display();  // NOW it loads photo1.jpg
```

### Proxy for Access Control

```java
public interface Document {
    void read();
    void write(String content);
    void delete();
}

public class SecureDocumentProxy implements Document {
    private Document realDocument;
    private User currentUser;
    
    public SecureDocumentProxy(Document document, User user) {
        this.realDocument = document;
        this.currentUser = user;
    }
    
    @Override
    public void read() {
        if (currentUser.hasPermission("READ")) {
            realDocument.read();
        } else {
            throw new AccessDeniedException("No read permission");
        }
    }
    
    @Override
    public void write(String content) {
        if (currentUser.hasPermission("WRITE")) {
            realDocument.write(content);
        } else {
            throw new AccessDeniedException("No write permission");
        }
    }
    
    @Override
    public void delete() {
        if (currentUser.hasPermission("DELETE") && currentUser.isAdmin()) {
            realDocument.delete();
        } else {
            throw new AccessDeniedException("No delete permission");
        }
    }
}
```

### Facade Pattern

```text
FACADE = Simple interface to complex subsystem
       = Hides complexity from clients
       = Single entry point

Common in:
├── Library wrappers
├── Legacy system integration
├── Complex initialization
└── API simplification
```

```java
// Complex subsystem classes
public class VideoDecoder {
    public VideoFile decode(String filename) {
        System.out.println("Decoding video: " + filename);
        return new VideoFile();
    }
}

public class AudioExtractor {
    public AudioTrack extract(VideoFile video) {
        System.out.println("Extracting audio");
        return new AudioTrack();
    }
}

public class AudioNormalizer {
    public AudioTrack normalize(AudioTrack audio) {
        System.out.println("Normalizing audio levels");
        return audio;
    }
}

public class VideoEncoder {
    public File encode(VideoFile video, AudioTrack audio, String format) {
        System.out.println("Encoding to " + format);
        return new File("output." + format);
    }
}

// Without Facade - Client needs to know all details
VideoDecoder decoder = new VideoDecoder();
AudioExtractor extractor = new AudioExtractor();
AudioNormalizer normalizer = new AudioNormalizer();
VideoEncoder encoder = new VideoEncoder();

VideoFile video = decoder.decode("input.avi");
AudioTrack audio = extractor.extract(video);
audio = normalizer.normalize(audio);
File output = encoder.encode(video, audio, "mp4");

// ════════════════════════════════════════════════════════════════════

// FACADE - Simple interface
public class VideoConversionFacade {
    private final VideoDecoder decoder = new VideoDecoder();
    private final AudioExtractor extractor = new AudioExtractor();
    private final AudioNormalizer normalizer = new AudioNormalizer();
    private final VideoEncoder encoder = new VideoEncoder();
    
    public File convert(String inputFile, String outputFormat) {
        VideoFile video = decoder.decode(inputFile);
        AudioTrack audio = extractor.extract(video);
        audio = normalizer.normalize(audio);
        return encoder.encode(video, audio, outputFormat);
    }
}

// Client code - Simple!
VideoConversionFacade converter = new VideoConversionFacade();
File output = converter.convert("input.avi", "mp4");
```

### Facade in Real Applications

```java
// E-commerce Checkout Facade
public class CheckoutFacade {
    private final CartService cartService;
    private final InventoryService inventoryService;
    private final PaymentService paymentService;
    private final ShippingService shippingService;
    private final NotificationService notificationService;
    private final OrderRepository orderRepository;
    
    public Order checkout(String userId, PaymentDetails payment, Address address) {
        // Complex process hidden behind simple method
        
        // 1. Get cart
        Cart cart = cartService.getCart(userId);
        
        // 2. Verify inventory
        for (CartItem item : cart.getItems()) {
            if (!inventoryService.isAvailable(item.getProductId(), item.getQuantity())) {
                throw new OutOfStockException(item.getProductId());
            }
        }
        
        // 3. Reserve inventory
        inventoryService.reserve(cart);
        
        try {
            // 4. Process payment
            PaymentResult paymentResult = paymentService.charge(payment, cart.getTotal());
            
            if (!paymentResult.isSuccess()) {
                inventoryService.releaseReservation(cart);
                throw new PaymentFailedException(paymentResult.getError());
            }
            
            // 5. Create order
            Order order = Order.create(cart, paymentResult, address);
            orderRepository.save(order);
            
            // 6. Schedule shipping
            shippingService.scheduleDelivery(order);
            
            // 7. Notify user
            notificationService.sendOrderConfirmation(order);
            
            // 8. Clear cart
            cartService.clear(userId);
            
            return order;
            
        } catch (Exception e) {
            inventoryService.releaseReservation(cart);
            throw e;
        }
    }
}

// Controller - Simple!
@PostMapping("/checkout")
public Order checkout(@RequestBody CheckoutRequest request) {
    return checkoutFacade.checkout(
        request.getUserId(),
        request.getPayment(),
        request.getAddress()
    );
}
```

---

## 2. Behavioral Patterns (Advanced)

### State Pattern

```text
STATE = Object changes behavior based on internal state
      = Each state is a separate class
      = Eliminates complex if-else chains

Use when:
├── Object behavior depends on state
├── Many conditional statements based on state
├── State transitions have complex rules
```

```java
// State interface
public interface OrderState {
    void next(Order order);
    void prev(Order order);
    void printStatus();
    void cancel(Order order);
}

// Concrete states
public class NewState implements OrderState {
    @Override
    public void next(Order order) {
        order.setState(new ProcessingState());
    }
    
    @Override
    public void prev(Order order) {
        System.out.println("Order is in initial state");
    }
    
    @Override
    public void printStatus() {
        System.out.println("Order created, awaiting processing");
    }
    
    @Override
    public void cancel(Order order) {
        order.setState(new CancelledState());
        System.out.println("Order cancelled");
    }
}

public class ProcessingState implements OrderState {
    @Override
    public void next(Order order) {
        order.setState(new ShippedState());
    }
    
    @Override
    public void prev(Order order) {
        order.setState(new NewState());
    }
    
    @Override
    public void printStatus() {
        System.out.println("Order is being processed");
    }
    
    @Override
    public void cancel(Order order) {
        order.setState(new CancelledState());
        // Trigger refund
    }
}

public class ShippedState implements OrderState {
    @Override
    public void next(Order order) {
        order.setState(new DeliveredState());
    }
    
    @Override
    public void prev(Order order) {
        System.out.println("Cannot go back from shipped");
    }
    
    @Override
    public void printStatus() {
        System.out.println("Order shipped");
    }
    
    @Override
    public void cancel(Order order) {
        System.out.println("Cannot cancel shipped order");
        // Maybe trigger return instead
    }
}

public class DeliveredState implements OrderState {
    @Override
    public void next(Order order) {
        System.out.println("Order already delivered");
    }
    
    @Override
    public void prev(Order order) {
        System.out.println("Cannot go back from delivered");
    }
    
    @Override
    public void printStatus() {
        System.out.println("Order delivered successfully");
    }
    
    @Override
    public void cancel(Order order) {
        System.out.println("Cannot cancel delivered order");
    }
}

// Context
public class Order {
    private OrderState state;
    private String orderId;
    
    public Order(String orderId) {
        this.orderId = orderId;
        this.state = new NewState();  // Initial state
    }
    
    public void setState(OrderState state) {
        this.state = state;
    }
    
    public void nextState() {
        state.next(this);
    }
    
    public void previousState() {
        state.prev(this);
    }
    
    public void printStatus() {
        state.printStatus();
    }
    
    public void cancel() {
        state.cancel(this);
    }
}

// Usage - No if-else needed!
Order order = new Order("ORD-123");
order.printStatus();  // "Order created, awaiting processing"
order.nextState();    // Move to Processing
order.printStatus();  // "Order is being processed"
order.nextState();    // Move to Shipped
order.cancel();       // "Cannot cancel shipped order"
```

### Command Pattern

```text
COMMAND = Encapsulate request as an object
        = Decouple sender from receiver
        = Support undo/redo, queuing, logging

Components:
├── Command: Interface with execute()
├── ConcreteCommand: Implements execute(), holds receiver
├── Receiver: Does actual work
├── Invoker: Executes commands
└── Client: Creates commands
```

```java
// Command interface
public interface Command {
    void execute();
    void undo();
}

// Receiver
public class TextEditor {
    private StringBuilder content = new StringBuilder();
    
    public void insertText(String text, int position) {
        content.insert(position, text);
    }
    
    public void deleteText(int start, int length) {
        content.delete(start, start + length);
    }
    
    public String getContent() {
        return content.toString();
    }
}

// Concrete commands
public class InsertTextCommand implements Command {
    private TextEditor editor;
    private String text;
    private int position;
    
    public InsertTextCommand(TextEditor editor, String text, int position) {
        this.editor = editor;
        this.text = text;
        this.position = position;
    }
    
    @Override
    public void execute() {
        editor.insertText(text, position);
    }
    
    @Override
    public void undo() {
        editor.deleteText(position, text.length());
    }
}

public class DeleteTextCommand implements Command {
    private TextEditor editor;
    private String deletedText;  // For undo
    private int position;
    private int length;
    
    public DeleteTextCommand(TextEditor editor, int position, int length) {
        this.editor = editor;
        this.position = position;
        this.length = length;
    }
    
    @Override
    public void execute() {
        // Save text before deleting (for undo)
        deletedText = editor.getContent().substring(position, position + length);
        editor.deleteText(position, length);
    }
    
    @Override
    public void undo() {
        editor.insertText(deletedText, position);
    }
}

// Invoker with undo stack
public class CommandManager {
    private final Stack<Command> history = new Stack<>();
    private final Stack<Command> redoStack = new Stack<>();
    
    public void execute(Command command) {
        command.execute();
        history.push(command);
        redoStack.clear();  // Clear redo after new command
    }
    
    public void undo() {
        if (!history.isEmpty()) {
            Command command = history.pop();
            command.undo();
            redoStack.push(command);
        }
    }
    
    public void redo() {
        if (!redoStack.isEmpty()) {
            Command command = redoStack.pop();
            command.execute();
            history.push(command);
        }
    }
}

// Usage
TextEditor editor = new TextEditor();
CommandManager manager = new CommandManager();

manager.execute(new InsertTextCommand(editor, "Hello", 0));
// Content: "Hello"

manager.execute(new InsertTextCommand(editor, " World", 5));
// Content: "Hello World"

manager.undo();
// Content: "Hello"

manager.redo();
// Content: "Hello World"
```

### Template Method Pattern

```text
TEMPLATE METHOD = Define skeleton in base class
                = Let subclasses implement specific steps
                = Algorithm structure is fixed

Use when:
├── Same algorithm, different implementations
├── You want to ensure certain steps always happen
├── Hook methods for optional customization
```

```java
// Template base class
public abstract class DataMiner {
    
    // Template method - defines the skeleton
    public final void mine(String path) {
        String rawData = extractData(path);
        String parsedData = parseData(rawData);
        String analyzedData = analyzeData(parsedData);
        sendReport(analyzedData);
        cleanup();
    }
    
    // Steps that subclasses MUST implement
    protected abstract String extractData(String path);
    protected abstract String parseData(String rawData);
    
    // Common implementation (can be overridden)
    protected String analyzeData(String data) {
        System.out.println("Analyzing data...");
        return "Analyzed: " + data;
    }
    
    // Hook method - optional override
    protected void cleanup() {
        // Default: do nothing
    }
    
    // Final step - cannot be overridden
    private void sendReport(String analysis) {
        System.out.println("Sending report: " + analysis);
    }
}

// Concrete implementation for PDF
public class PDFMiner extends DataMiner {
    @Override
    protected String extractData(String path) {
        System.out.println("Extracting data from PDF: " + path);
        return "PDF content";
    }
    
    @Override
    protected String parseData(String rawData) {
        System.out.println("Parsing PDF content");
        return "Parsed PDF: " + rawData;
    }
    
    @Override
    protected void cleanup() {
        System.out.println("Closing PDF reader");
    }
}

// Concrete implementation for CSV
public class CSVMiner extends DataMiner {
    @Override
    protected String extractData(String path) {
        System.out.println("Reading CSV file: " + path);
        return "CSV content";
    }
    
    @Override
    protected String parseData(String rawData) {
        System.out.println("Parsing CSV rows");
        return "Parsed CSV: " + rawData;
    }
    // Uses default cleanup (does nothing)
}

// Usage
DataMiner pdfMiner = new PDFMiner();
pdfMiner.mine("report.pdf");

DataMiner csvMiner = new CSVMiner();
csvMiner.mine("data.csv");
```

---

## 3. Design Patterns in Spring Framework

### Spring Uses These Patterns Everywhere!

```text
┌─────────────────────────────────────────────────────────────────────┐
│                 SPRING FRAMEWORK PATTERNS                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SINGLETON → Spring Beans (default scope)                           │
│  FACTORY  → BeanFactory, ApplicationContext                         │
│  PROXY    → @Transactional, @Async, @Cacheable                      │
│  TEMPLATE → JdbcTemplate, RestTemplate, JmsTemplate                 │
│  STRATEGY → @Qualifier for switching implementations                │
│  OBSERVER → ApplicationEventPublisher                               │
│  FACADE   → Spring MVC DispatcherServlet                           │
│  ADAPTER  → HandlerAdapter in Spring MVC                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Singleton Pattern in Spring

```java
// Spring beans are singletons by default
@Service
public class UserService {
    // Only ONE instance created by Spring
}

// Same as:
@Service
@Scope("singleton")  // Default!
public class UserService { }

// For non-singleton:
@Scope("prototype")  // New instance each time
@Scope("request")    // One per HTTP request
@Scope("session")    // One per HTTP session
```

### Factory Pattern in Spring

```java
// Spring's ApplicationContext IS a Factory
ApplicationContext context = new AnnotationConfigApplicationContext(AppConfig.class);

// Getting beans (factory creates them)
UserService userService = context.getBean(UserService.class);

// FactoryBean for complex object creation
public class ConnectionFactoryBean implements FactoryBean<Connection> {
    @Override
    public Connection getObject() throws Exception {
        // Complex connection setup
        Connection conn = DriverManager.getConnection(url, user, pass);
        conn.setAutoCommit(false);
        return conn;
    }
    
    @Override
    public Class<?> getObjectType() {
        return Connection.class;
    }
}

// Register and use
@Bean
public ConnectionFactoryBean connectionFactory() {
    return new ConnectionFactoryBean();
}

// Spring automatically calls getObject()
@Autowired
private Connection connection;  // Gets the Connection, not the FactoryBean
```

### Proxy Pattern in Spring (AOP)

```java
// @Transactional creates a PROXY around your service
@Service
public class OrderService {
    
    @Transactional
    public void createOrder(Order order) {
        // Spring creates proxy that:
        // 1. Begins transaction
        // 2. Calls this method
        // 3. Commits or rollbacks
        orderRepository.save(order);
    }
}

// What Spring actually creates:
public class OrderServiceProxy extends OrderService {
    private OrderService target;
    private TransactionManager txManager;
    
    @Override
    public void createOrder(Order order) {
        Transaction tx = txManager.begin();
        try {
            target.createOrder(order);  // Call real method
            tx.commit();
        } catch (Exception e) {
            tx.rollback();
            throw e;
        }
    }
}

// Same with @Async
@Async
public CompletableFuture<Result> processAsync() {
    // Spring proxy submits this to thread pool
}

// Same with @Cacheable
@Cacheable("users")
public User findUser(Long id) {
    // Proxy checks cache first, calls method if miss
}
```

### Strategy Pattern in Spring

```java
// Define strategy interface
public interface PaymentStrategy {
    void pay(BigDecimal amount);
}

// Multiple implementations
@Component("creditCard")
public class CreditCardPayment implements PaymentStrategy {
    public void pay(BigDecimal amount) { /* credit card logic */ }
}

@Component("paypal")
public class PayPalPayment implements PaymentStrategy {
    public void pay(BigDecimal amount) { /* paypal logic */ }
}

@Component("crypto")
public class CryptoPayment implements PaymentStrategy {
    public void pay(BigDecimal amount) { /* crypto logic */ }
}

// Use @Qualifier to select strategy
@Service
public class CheckoutService {
    
    @Autowired
    @Qualifier("creditCard")  // Choose implementation
    private PaymentStrategy paymentStrategy;
    
    // Or inject all strategies
    @Autowired
    private Map<String, PaymentStrategy> strategies;
    
    public void checkout(String paymentType, BigDecimal amount) {
        PaymentStrategy strategy = strategies.get(paymentType);
        strategy.pay(amount);
    }
}
```

### Observer Pattern in Spring

```java
// Define event
public class OrderCreatedEvent extends ApplicationEvent {
    private final Order order;
    
    public OrderCreatedEvent(Object source, Order order) {
        super(source);
        this.order = order;
    }
    
    public Order getOrder() { return order; }
}

// Publisher
@Service
public class OrderService {
    @Autowired
    private ApplicationEventPublisher eventPublisher;
    
    public Order createOrder(OrderRequest request) {
        Order order = orderRepository.save(new Order(request));
        
        // Publish event - all listeners notified
        eventPublisher.publishEvent(new OrderCreatedEvent(this, order));
        
        return order;
    }
}

// Listeners (Observers)
@Component
public class InventoryListener {
    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        // Reduce inventory
        inventoryService.reduce(event.getOrder().getItems());
    }
}

@Component
public class NotificationListener {
    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        // Send confirmation email
        emailService.sendConfirmation(event.getOrder());
    }
}

@Component
public class AnalyticsListener {
    @Async  // Process asynchronously
    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        // Track analytics
        analytics.track("order_created", event.getOrder());
    }
}
```

### Template Pattern in Spring

```java
// JdbcTemplate - Template pattern
@Repository
public class UserRepository {
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    public User findById(Long id) {
        // JdbcTemplate handles:
        // - Get connection
        // - Create statement
        // - Execute query
        // - Map results (YOUR CODE)
        // - Close resources
        // - Handle exceptions
        return jdbcTemplate.queryForObject(
            "SELECT * FROM users WHERE id = ?",
            (rs, rowNum) -> new User(          // Only this is YOUR code
                rs.getLong("id"),
                rs.getString("name")
            ),
            id
        );
    }
}

// Create your own template
public abstract class AbstractExportTemplate<T> {
    
    // Template method
    public final File export(List<T> data, String filename) {
        File file = createFile(filename);
        writeHeader(file);
        for (T item : data) {
            writeRow(file, item);  // Abstract - subclass implements
        }
        writeFooter(file);
        return file;
    }
    
    protected abstract void writeRow(File file, T item);
    
    protected void writeHeader(File file) { }  // Hook
    protected void writeFooter(File file) { }  // Hook
    
    private File createFile(String filename) {
        return new File(filename);
    }
}

public class CSVExport extends AbstractExportTemplate<User> {
    @Override
    protected void writeHeader(File file) {
        write(file, "id,name,email");
    }
    
    @Override
    protected void writeRow(File file, User user) {
        write(file, user.getId() + "," + user.getName() + "," + user.getEmail());
    }
}
```

---

## 4. Interview Questions

### Q1: Explain Proxy pattern and how Spring uses it

```text
Answer:
"Proxy pattern provides a surrogate for another object to control 
access to it. The proxy has the same interface as the real object.

Types of proxies:
1. Virtual Proxy: Lazy loading (load heavy object on demand)
2. Protection Proxy: Access control (check permissions)
3. Remote Proxy: Represent remote objects locally
4. Logging Proxy: Log all method calls

Spring uses proxies extensively:

@Transactional creates a proxy:
- Proxy intercepts method call
- Begins transaction
- Calls real method
- Commits or rollbacks

@Cacheable creates a proxy:
- Proxy checks cache for key
- If found, returns cached value (skips method)
- If not, calls method and caches result

@Async creates a proxy:
- Proxy submits method to thread pool
- Returns immediately with Future

Spring creates proxies using:
- JDK Dynamic Proxy (for interfaces)
- CGLIB (for classes without interfaces)

Important: Self-invocation bypasses proxy!
  this.methodWithTransactional() // Won't work!
  Use self-injection or restructure code."
```

### Q2: When would you use State pattern vs Strategy pattern?

```text
Answer:
"Both encapsulate behavior, but for different purposes:

STRATEGY PATTERN:
- Different algorithms for same task
- Client CHOOSES which strategy to use
- Strategies are independent, interchangeable
- Example: Different sorting algorithms
          Different payment methods

STATE PATTERN:  
- Object behavior changes based on internal state
- STATE TRANSITIONS happen based on events
- States know about each other (transitions)
- Example: Order states (New → Processing → Shipped)
          TCP connection (Listening → Connected → Closed)

Key differences:
1. WHO decides:
   Strategy: Client chooses algorithm
   State: Object changes state internally

2. AWARENESS:
   Strategy: Algorithms don't know each other
   State: States know valid transitions

3. REPLACEMENT:
   Strategy: Replace algorithm anytime
   State: State changes based on events/conditions

Example choosing:
- 'Select payment method' → Strategy (user chooses)
- 'Order workflow' → State (order transitions through states)"
```

### Q3: Explain Command pattern with a real use case

```text
Answer:
"Command pattern encapsulates a request as an object, allowing:
- Parameterizing operations
- Queuing operations
- Undo/Redo functionality
- Logging operations

Real use case: Text Editor

interface Command {
    void execute();
    void undo();
}

class InsertTextCommand implements Command {
    private Editor editor;
    private String text;
    private int position;
    
    void execute() { editor.insert(text, position); }
    void undo() { editor.delete(position, text.length()); }
}

class CommandHistory {
    Stack<Command> history;
    Stack<Command> redoStack;
    
    void execute(Command cmd) {
        cmd.execute();
        history.push(cmd);
        redoStack.clear();
    }
    
    void undo() {
        Command cmd = history.pop();
        cmd.undo();
        redoStack.push(cmd);
    }
}

Benefits:
1. UNDO/REDO: Each command knows how to undo itself
2. LOGGING: Log commands for audit/replay
3. QUEUING: Queue commands for batch processing
4. MACRO: Composite command for multiple operations

Other uses:
- Transaction systems (rollback = undo)
- Job queues (commands as jobs)
- GUI actions (toolbar buttons as commands)"
```

### Q4: How does Spring implement the Template pattern?

```text
Answer:
"Spring's Template pattern appears in JdbcTemplate, RestTemplate, 
JmsTemplate, etc. They all follow the same structure:

1. Template handles boilerplate:
   - Resource management (open/close connections)
   - Exception handling (translate to Spring exceptions)
   - Transaction coordination

2. You provide the specific logic:
   - SQL query
   - Row mapping
   - Request creation

Example with JdbcTemplate:

// Without template - lots of boilerplate
Connection conn = null;
PreparedStatement stmt = null;
ResultSet rs = null;
try {
    conn = dataSource.getConnection();
    stmt = conn.prepareStatement('SELECT * FROM users WHERE id = ?');
    stmt.setLong(1, id);
    rs = stmt.executeQuery();
    if (rs.next()) {
        return new User(rs.getLong('id'), rs.getString('name'));
    }
} finally {
    if (rs != null) rs.close();
    if (stmt != null) stmt.close();
    if (conn != null) conn.close();
}

// With JdbcTemplate - only YOUR logic
return jdbcTemplate.queryForObject(
    'SELECT * FROM users WHERE id = ?',
    (rs, rowNum) -> new User(rs.getLong('id'), rs.getString('name')),
    id
);

Template handles:
- Getting connection
- Creating statement
- Setting parameters
- Executing query
- Closing resources
- Exception translation

You provide:
- SQL
- Row mapping logic

This is the Template Method pattern with callbacks!"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│            ADVANCED DESIGN PATTERNS CHEAT SHEET                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ PROXY:                                                                │
│ ├── Same interface as real object                                     │
│ ├── Controls access (lazy load, permission, logging)                  │
│ └── Spring: @Transactional, @Async, @Cacheable                       │
│                                                                       │
│ FACADE:                                                               │
│ ├── Simple interface to complex subsystem                             │
│ ├── Single entry point                                                │
│ └── Example: CheckoutFacade handles cart, payment, shipping          │
│                                                                       │
│ STATE:                                                                │
│ ├── Behavior changes based on internal state                          │
│ ├── Each state is a class                                             │
│ └── Example: Order (New → Processing → Shipped)                      │
│                                                                       │
│ COMMAND:                                                              │
│ ├── Encapsulate request as object                                     │
│ ├── Supports undo/redo                                                │
│ └── Example: Text editor commands, job queues                        │
│                                                                       │
│ TEMPLATE METHOD:                                                      │
│ ├── Algorithm skeleton in base class                                  │
│ ├── Subclasses implement specific steps                               │
│ └── Spring: JdbcTemplate, RestTemplate                               │
│                                                                       │
│ SPRING PATTERN USAGE:                                                 │
│ ├── Singleton: @Service, @Repository (default scope)                 │
│ ├── Factory: BeanFactory, @Bean methods                              │
│ ├── Proxy: All @Transactional, @Async, AOP                          │
│ ├── Strategy: Multiple @Component + @Qualifier                       │
│ ├── Observer: ApplicationEventPublisher + @EventListener             │
│ └── Template: JdbcTemplate, RestTemplate                             │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Next:** [5. LLD Interview Problems →](./lld-interview-problems)
