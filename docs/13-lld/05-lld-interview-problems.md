---
title: 5. LLD Interview Problems
sidebar_position: 5
description: Practice complete LLD interview problems - Elevator System, BookMyShow, Splitwise, Snake & Ladder, Vending Machine with full code.
keywords: [lld interview, elevator system, bookmyshow, splitwise, snake ladder, vending machine]
---

# LLD Interview Problems

:::info Interview Format ⭐⭐⭐⭐⭐
LLD interviews typically last 45-60 minutes. You're expected to design classes, interfaces, and relationships, then write working code. These problems test your OOP skills, design pattern knowledge, and coding ability.
:::

## Interview Approach

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    LLD INTERVIEW FRAMEWORK                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ 1. CLARIFY REQUIREMENTS (5 min)                                      │
│    ├── What are the core use cases?                                  │
│    ├── What entities are involved?                                   │
│    ├── Any constraints? (scale, concurrency)                         │
│    └── Out of scope features?                                        │
│                                                                      │
│ 2. IDENTIFY OBJECTS & RELATIONSHIPS (5 min)                          │
│    ├── Nouns → Classes                                               │
│    ├── Verbs → Methods                                               │
│    ├── Has-A, Is-A relationships                                     │
│    └── Draw simple class diagram                                     │
│                                                                      │
│ 3. DEFINE INTERFACES & ENUMS (5 min)                                 │
│    ├── Define key interfaces                                         │
│    ├── Create enums for states                                       │
│    └── Plan for extensibility                                        │
│                                                                      │
│ 4. IMPLEMENT CORE CLASSES (25-30 min)                                │
│    ├── Start with main entities                                      │
│    ├── Implement key methods                                         │
│    ├── Apply design patterns                                         │
│    └── Handle edge cases                                             │
│                                                                      │
│ 5. DISCUSS EXTENSIONS (5 min)                                        │
│    ├── How to add new features?                                      │
│    ├── Concurrency considerations                                    │
│    └── Testing approach                                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Elevator System

### Requirements

```text
Design an elevator system for a building:
- Multiple elevators in a building
- Users can request elevator from any floor
- Users can select destination floor inside elevator
- Optimize for minimum wait time
- Handle multiple concurrent requests
```

### Key Entities

```text
Building
├── floors: List<Floor>
├── elevators: List<Elevator>
└── controller: ElevatorController

Elevator
├── id
├── currentFloor
├── direction: UP/DOWN/IDLE
├── state: MOVING/STOPPED/MAINTENANCE
├── destinationQueue: PriorityQueue
└── capacity

ElevatorController (Strategy Pattern)
├── schedules which elevator serves which request
└── different algorithms possible (FCFS, SCAN, LOOK)
```

### Implementation

```java
// Enums
public enum Direction { UP, DOWN, IDLE }
public enum ElevatorState { MOVING, STOPPED, MAINTENANCE }

// Request
public class ElevatorRequest {
    private final int fromFloor;
    private final int toFloor;
    private final Direction direction;
    private final long timestamp;
    
    public ElevatorRequest(int fromFloor, int toFloor) {
        this.fromFloor = fromFloor;
        this.toFloor = toFloor;
        this.direction = toFloor > fromFloor ? Direction.UP : Direction.DOWN;
        this.timestamp = System.currentTimeMillis();
    }
    
    // Getters
}

// Elevator
public class Elevator {
    private final int id;
    private int currentFloor;
    private Direction direction;
    private ElevatorState state;
    private final int capacity;
    private int currentLoad;
    
    // Destinations sorted by direction
    private final TreeSet<Integer> upStops;
    private final TreeSet<Integer> downStops;
    
    public Elevator(int id, int capacity) {
        this.id = id;
        this.capacity = capacity;
        this.currentFloor = 0;
        this.direction = Direction.IDLE;
        this.state = ElevatorState.STOPPED;
        this.upStops = new TreeSet<>();
        this.downStops = new TreeSet<>(Collections.reverseOrder());
    }
    
    public void addDestination(int floor) {
        if (floor > currentFloor) {
            upStops.add(floor);
        } else if (floor < currentFloor) {
            downStops.add(floor);
        }
        // Determine direction if idle
        if (direction == Direction.IDLE) {
            direction = floor > currentFloor ? Direction.UP : Direction.DOWN;
        }
    }
    
    public void move() {
        if (state == ElevatorState.MAINTENANCE) return;
        
        if (direction == Direction.UP) {
            if (!upStops.isEmpty()) {
                currentFloor++;
                checkAndStop(upStops);
            } else {
                direction = downStops.isEmpty() ? Direction.IDLE : Direction.DOWN;
            }
        } else if (direction == Direction.DOWN) {
            if (!downStops.isEmpty()) {
                currentFloor--;
                checkAndStop(downStops);
            } else {
                direction = upStops.isEmpty() ? Direction.IDLE : Direction.UP;
            }
        }
    }
    
    private void checkAndStop(TreeSet<Integer> stops) {
        if (stops.contains(currentFloor)) {
            state = ElevatorState.STOPPED;
            stops.remove(currentFloor);
            openDoors();
            closeDoors();
            state = ElevatorState.MOVING;
        }
    }
    
    public boolean canAccept(int floor) {
        if (state == ElevatorState.MAINTENANCE) return false;
        if (currentLoad >= capacity) return false;
        return true;
    }
    
    // Calculate "cost" to serve a request (for scheduling)
    public int getCost(int floor, Direction requestDir) {
        if (state == ElevatorState.MAINTENANCE) return Integer.MAX_VALUE;
        
        int distance = Math.abs(currentFloor - floor);
        
        // Prefer elevator already moving in right direction
        if (direction == Direction.IDLE) {
            return distance;
        } else if (direction == requestDir) {
            if ((direction == Direction.UP && floor >= currentFloor) ||
                (direction == Direction.DOWN && floor <= currentFloor)) {
                return distance;  // On the way
            }
        }
        // Would need to reverse direction
        return distance + 10;  // Penalty for reverse
    }
    
    private void openDoors() {
        System.out.println("Elevator " + id + " opening doors at floor " + currentFloor);
    }
    
    private void closeDoors() {
        System.out.println("Elevator " + id + " closing doors at floor " + currentFloor);
    }
    
    // Getters
    public int getId() { return id; }
    public int getCurrentFloor() { return currentFloor; }
    public Direction getDirection() { return direction; }
    public boolean isIdle() { return direction == Direction.IDLE; }
}

// Scheduling Strategy (Strategy Pattern)
public interface ElevatorSchedulingStrategy {
    Elevator selectElevator(List<Elevator> elevators, ElevatorRequest request);
}

// LOOK Algorithm - common elevator scheduling
public class LookSchedulingStrategy implements ElevatorSchedulingStrategy {
    @Override
    public Elevator selectElevator(List<Elevator> elevators, ElevatorRequest request) {
        Elevator best = null;
        int minCost = Integer.MAX_VALUE;
        
        for (Elevator elevator : elevators) {
            int cost = elevator.getCost(request.getFromFloor(), request.getDirection());
            if (cost < minCost) {
                minCost = cost;
                best = elevator;
            }
        }
        
        return best;
    }
}

// Controller
public class ElevatorController {
    private final List<Elevator> elevators;
    private final ElevatorSchedulingStrategy strategy;
    private final Queue<ElevatorRequest> pendingRequests;
    
    public ElevatorController(int numElevators, ElevatorSchedulingStrategy strategy) {
        this.elevators = new ArrayList<>();
        for (int i = 0; i < numElevators; i++) {
            elevators.add(new Elevator(i, 10));
        }
        this.strategy = strategy;
        this.pendingRequests = new LinkedList<>();
    }
    
    public void requestElevator(int fromFloor, int toFloor) {
        ElevatorRequest request = new ElevatorRequest(fromFloor, toFloor);
        
        Elevator selected = strategy.selectElevator(elevators, request);
        
        if (selected != null && selected.canAccept(fromFloor)) {
            selected.addDestination(fromFloor);
            selected.addDestination(toFloor);
            System.out.println("Elevator " + selected.getId() + 
                " assigned for request from " + fromFloor + " to " + toFloor);
        } else {
            pendingRequests.add(request);
        }
    }
    
    // Simulation loop
    public void step() {
        for (Elevator elevator : elevators) {
            elevator.move();
        }
        processPendingRequests();
    }
    
    private void processPendingRequests() {
        Iterator<ElevatorRequest> it = pendingRequests.iterator();
        while (it.hasNext()) {
            ElevatorRequest request = it.next();
            Elevator selected = strategy.selectElevator(elevators, request);
            if (selected != null && selected.canAccept(request.getFromFloor())) {
                selected.addDestination(request.getFromFloor());
                selected.addDestination(request.getToFloor());
                it.remove();
            }
        }
    }
}

// Building (Facade)
public class Building {
    private final ElevatorController controller;
    private final int numFloors;
    
    public Building(int numFloors, int numElevators) {
        this.numFloors = numFloors;
        this.controller = new ElevatorController(numElevators, new LookSchedulingStrategy());
    }
    
    public void callElevator(int fromFloor, int toFloor) {
        if (fromFloor < 0 || fromFloor >= numFloors || 
            toFloor < 0 || toFloor >= numFloors) {
            throw new IllegalArgumentException("Invalid floor");
        }
        controller.requestElevator(fromFloor, toFloor);
    }
}
```

---

## 2. BookMyShow (Movie Ticket Booking)

### Requirements

```text
Design a movie ticket booking system:
- Multiple theaters and screens
- Shows at different times
- Seat selection and booking
- Handle concurrent bookings (no double booking)
- Support different seat types and pricing
```

### Key Entities

```text
Theater
├── screens: List<Screen>
└── address, name

Screen
├── seats: List<Seat>
└── shows: List<Show>

Show
├── movie
├── screen
├── startTime
└── seatAvailability: Map<Seat, Boolean>

Booking
├── show
├── seats: List<Seat>
├── user
├── totalAmount
└── status: PENDING/CONFIRMED/CANCELLED
```

### Implementation

```java
// Enums
public enum SeatType { REGULAR, PREMIUM, VIP }
public enum BookingStatus { PENDING, CONFIRMED, CANCELLED }

// Movie
public class Movie {
    private final String id;
    private final String title;
    private final int durationMinutes;
    private final String genre;
    
    public Movie(String id, String title, int durationMinutes, String genre) {
        this.id = id;
        this.title = title;
        this.durationMinutes = durationMinutes;
        this.genre = genre;
    }
    // Getters
}

// Seat
public class Seat {
    private final String id;
    private final int row;
    private final int number;
    private final SeatType type;
    
    public Seat(String id, int row, int number, SeatType type) {
        this.id = id;
        this.row = row;
        this.number = number;
        this.type = type;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Seat seat = (Seat) o;
        return id.equals(seat.id);
    }
    
    @Override
    public int hashCode() {
        return id.hashCode();
    }
}

// Screen
public class Screen {
    private final String id;
    private final String name;
    private final List<Seat> seats;
    
    public Screen(String id, String name, int rows, int seatsPerRow) {
        this.id = id;
        this.name = name;
        this.seats = new ArrayList<>();
        initializeSeats(rows, seatsPerRow);
    }
    
    private void initializeSeats(int rows, int seatsPerRow) {
        for (int r = 1; r <= rows; r++) {
            for (int s = 1; s <= seatsPerRow; s++) {
                SeatType type = (r <= 2) ? SeatType.VIP : 
                               (r <= rows/2) ? SeatType.PREMIUM : SeatType.REGULAR;
                seats.add(new Seat(id + "-" + r + "-" + s, r, s, type));
            }
        }
    }
    
    public List<Seat> getSeats() { return new ArrayList<>(seats); }
}

// Show - represents a movie screening
public class Show {
    private final String id;
    private final Movie movie;
    private final Screen screen;
    private final LocalDateTime startTime;
    private final Map<Seat, Boolean> seatAvailability;
    private final Map<SeatType, BigDecimal> pricing;
    private final Object lock = new Object();
    
    public Show(String id, Movie movie, Screen screen, LocalDateTime startTime) {
        this.id = id;
        this.movie = movie;
        this.screen = screen;
        this.startTime = startTime;
        this.seatAvailability = new ConcurrentHashMap<>();
        this.pricing = new HashMap<>();
        
        // Initialize all seats as available
        for (Seat seat : screen.getSeats()) {
            seatAvailability.put(seat, true);
        }
        
        // Default pricing
        pricing.put(SeatType.REGULAR, new BigDecimal("10.00"));
        pricing.put(SeatType.PREMIUM, new BigDecimal("15.00"));
        pricing.put(SeatType.VIP, new BigDecimal("25.00"));
    }
    
    public List<Seat> getAvailableSeats() {
        return seatAvailability.entrySet().stream()
            .filter(Map.Entry::getValue)
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
    }
    
    public boolean areSeatsAvailable(List<Seat> seats) {
        synchronized (lock) {
            return seats.stream()
                .allMatch(seat -> seatAvailability.getOrDefault(seat, false));
        }
    }
    
    // Atomic operation - lock and book
    public boolean lockSeats(List<Seat> seats) {
        synchronized (lock) {
            if (!areSeatsAvailable(seats)) {
                return false;
            }
            for (Seat seat : seats) {
                seatAvailability.put(seat, false);
            }
            return true;
        }
    }
    
    public void releaseSeats(List<Seat> seats) {
        synchronized (lock) {
            for (Seat seat : seats) {
                seatAvailability.put(seat, true);
            }
        }
    }
    
    public BigDecimal calculatePrice(List<Seat> seats) {
        return seats.stream()
            .map(seat -> pricing.get(seat.getType()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    
    // Getters
    public String getId() { return id; }
    public Movie getMovie() { return movie; }
}

// Booking
public class Booking {
    private final String id;
    private final User user;
    private final Show show;
    private final List<Seat> seats;
    private final BigDecimal totalAmount;
    private BookingStatus status;
    private final LocalDateTime bookingTime;
    
    public Booking(String id, User user, Show show, List<Seat> seats) {
        this.id = id;
        this.user = user;
        this.show = show;
        this.seats = new ArrayList<>(seats);
        this.totalAmount = show.calculatePrice(seats);
        this.status = BookingStatus.PENDING;
        this.bookingTime = LocalDateTime.now();
    }
    
    public void confirm() {
        this.status = BookingStatus.CONFIRMED;
    }
    
    public void cancel() {
        this.status = BookingStatus.CANCELLED;
        show.releaseSeats(seats);
    }
    
    // Getters
}

// Theater
public class Theater {
    private final String id;
    private final String name;
    private final String address;
    private final List<Screen> screens;
    private final List<Show> shows;
    
    public Theater(String id, String name, String address) {
        this.id = id;
        this.name = name;
        this.address = address;
        this.screens = new ArrayList<>();
        this.shows = new ArrayList<>();
    }
    
    public void addScreen(Screen screen) {
        screens.add(screen);
    }
    
    public void addShow(Show show) {
        shows.add(show);
    }
    
    public List<Show> getShowsForMovie(String movieId) {
        return shows.stream()
            .filter(show -> show.getMovie().getId().equals(movieId))
            .collect(Collectors.toList());
    }
}

// Booking Service
public class BookingService {
    private final Map<String, Booking> bookings;
    private final AtomicLong bookingIdGenerator;
    private final ScheduledExecutorService scheduler;
    
    public BookingService() {
        this.bookings = new ConcurrentHashMap<>();
        this.bookingIdGenerator = new AtomicLong(1);
        this.scheduler = Executors.newScheduledThreadPool(1);
    }
    
    public Booking createBooking(User user, Show show, List<Seat> seats) {
        // Try to lock seats
        if (!show.lockSeats(seats)) {
            throw new SeatNotAvailableException("Selected seats are not available");
        }
        
        String bookingId = "BK" + bookingIdGenerator.getAndIncrement();
        Booking booking = new Booking(bookingId, user, show, seats);
        bookings.put(bookingId, booking);
        
        // Schedule expiry for unpaid bookings (10 minutes)
        scheduler.schedule(() -> {
            if (booking.getStatus() == BookingStatus.PENDING) {
                booking.cancel();
                bookings.remove(bookingId);
                System.out.println("Booking " + bookingId + " expired");
            }
        }, 10, TimeUnit.MINUTES);
        
        return booking;
    }
    
    public void confirmBooking(String bookingId, PaymentDetails payment) {
        Booking booking = bookings.get(bookingId);
        if (booking == null) {
            throw new BookingNotFoundException("Booking not found");
        }
        
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new InvalidBookingStateException("Booking is not pending");
        }
        
        // Process payment (simplified)
        if (processPayment(payment, booking.getTotalAmount())) {
            booking.confirm();
        } else {
            booking.cancel();
            throw new PaymentFailedException("Payment failed");
        }
    }
    
    public void cancelBooking(String bookingId) {
        Booking booking = bookings.get(bookingId);
        if (booking != null) {
            booking.cancel();
        }
    }
    
    private boolean processPayment(PaymentDetails payment, BigDecimal amount) {
        // Payment gateway integration
        return true;
    }
}

// Movie Ticket Booking System (Facade)
public class MovieTicketBookingSystem {
    private final Map<String, Theater> theaters;
    private final Map<String, Movie> movies;
    private final BookingService bookingService;
    
    public MovieTicketBookingSystem() {
        this.theaters = new HashMap<>();
        this.movies = new HashMap<>();
        this.bookingService = new BookingService();
    }
    
    public List<Show> searchShows(String movieId, String city, LocalDate date) {
        return theaters.values().stream()
            .filter(t -> t.getAddress().contains(city))
            .flatMap(t -> t.getShowsForMovie(movieId).stream())
            .filter(s -> s.getStartTime().toLocalDate().equals(date))
            .collect(Collectors.toList());
    }
    
    public List<Seat> getAvailableSeats(String showId) {
        // Find show and return available seats
        // Simplified - would need showId to Show mapping
        return new ArrayList<>();
    }
    
    public Booking bookTickets(User user, Show show, List<Seat> seats) {
        return bookingService.createBooking(user, show, seats);
    }
}
```

---

## 3. Splitwise (Expense Sharing)

### Requirements

```text
Design an expense sharing application:
- Users can create groups
- Add expenses (split equally or by specific amounts)
- Track who owes whom
- Simplify debts (minimize transactions)
- Support different split types
```

### Key Entities

```text
User
├── id, name, email
└── balance: Map<User, BigDecimal>

Group
├── members: List<User>
└── expenses: List<Expense>

Expense
├── paidBy: User
├── amount
├── splits: List<Split>
└── splitType: EQUAL/EXACT/PERCENTAGE

Split
├── user
└── amount (their share)
```

### Implementation

```java
// Split Types (Strategy Pattern)
public interface SplitStrategy {
    Map<User, BigDecimal> calculateSplits(BigDecimal totalAmount, List<User> users, 
                                          Map<User, BigDecimal> customAmounts);
}

public class EqualSplitStrategy implements SplitStrategy {
    @Override
    public Map<User, BigDecimal> calculateSplits(BigDecimal totalAmount, 
            List<User> users, Map<User, BigDecimal> customAmounts) {
        BigDecimal perPerson = totalAmount.divide(
            BigDecimal.valueOf(users.size()), 2, RoundingMode.HALF_UP);
        
        Map<User, BigDecimal> splits = new HashMap<>();
        for (User user : users) {
            splits.put(user, perPerson);
        }
        return splits;
    }
}

public class ExactSplitStrategy implements SplitStrategy {
    @Override
    public Map<User, BigDecimal> calculateSplits(BigDecimal totalAmount,
            List<User> users, Map<User, BigDecimal> customAmounts) {
        // Validate total matches
        BigDecimal sum = customAmounts.values().stream()
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        if (sum.compareTo(totalAmount) != 0) {
            throw new IllegalArgumentException(
                "Split amounts don't add up to total");
        }
        
        return new HashMap<>(customAmounts);
    }
}

public class PercentageSplitStrategy implements SplitStrategy {
    @Override
    public Map<User, BigDecimal> calculateSplits(BigDecimal totalAmount,
            List<User> users, Map<User, BigDecimal> percentages) {
        // Validate percentages add to 100
        BigDecimal totalPercent = percentages.values().stream()
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        if (totalPercent.compareTo(new BigDecimal("100")) != 0) {
            throw new IllegalArgumentException("Percentages must add to 100");
        }
        
        Map<User, BigDecimal> splits = new HashMap<>();
        for (Map.Entry<User, BigDecimal> entry : percentages.entrySet()) {
            BigDecimal share = totalAmount.multiply(entry.getValue())
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            splits.put(entry.getKey(), share);
        }
        return splits;
    }
}

// User
public class User {
    private final String id;
    private final String name;
    private final String email;
    
    public User(String id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return id.equals(user.id);
    }
    
    @Override
    public int hashCode() {
        return id.hashCode();
    }
    
    // Getters
}

// Expense
public class Expense {
    private final String id;
    private final String description;
    private final BigDecimal amount;
    private final User paidBy;
    private final Map<User, BigDecimal> splits;
    private final LocalDateTime createdAt;
    
    public Expense(String id, String description, BigDecimal amount,
                   User paidBy, SplitStrategy strategy, 
                   List<User> participants, Map<User, BigDecimal> customValues) {
        this.id = id;
        this.description = description;
        this.amount = amount;
        this.paidBy = paidBy;
        this.splits = strategy.calculateSplits(amount, participants, customValues);
        this.createdAt = LocalDateTime.now();
    }
    
    // Getters
    public Map<User, BigDecimal> getSplits() { return new HashMap<>(splits); }
    public User getPaidBy() { return paidBy; }
}

// Group
public class Group {
    private final String id;
    private final String name;
    private final Set<User> members;
    private final List<Expense> expenses;
    
    public Group(String id, String name, User creator) {
        this.id = id;
        this.name = name;
        this.members = new HashSet<>();
        this.members.add(creator);
        this.expenses = new ArrayList<>();
    }
    
    public void addMember(User user) {
        members.add(user);
    }
    
    public void addExpense(Expense expense) {
        // Validate all participants are members
        for (User user : expense.getSplits().keySet()) {
            if (!members.contains(user)) {
                throw new IllegalArgumentException(
                    "User " + user.getName() + " is not a group member");
            }
        }
        expenses.add(expense);
    }
    
    public List<Expense> getExpenses() {
        return new ArrayList<>(expenses);
    }
}

// Balance Sheet
public class BalanceSheet {
    // Who owes whom and how much
    // balances[A][B] = amount A owes B
    private final Map<User, Map<User, BigDecimal>> balances;
    
    public BalanceSheet() {
        this.balances = new HashMap<>();
    }
    
    public void processExpense(Expense expense) {
        User paidBy = expense.getPaidBy();
        
        for (Map.Entry<User, BigDecimal> split : expense.getSplits().entrySet()) {
            User owes = split.getKey();
            BigDecimal amount = split.getValue();
            
            if (!owes.equals(paidBy)) {
                // owes money to paidBy
                addDebt(owes, paidBy, amount);
            }
        }
    }
    
    private void addDebt(User from, User to, BigDecimal amount) {
        balances.computeIfAbsent(from, k -> new HashMap<>())
                .merge(to, amount, BigDecimal::add);
    }
    
    public BigDecimal getBalance(User from, User to) {
        BigDecimal owes = balances.getOrDefault(from, Collections.emptyMap())
                                  .getOrDefault(to, BigDecimal.ZERO);
        BigDecimal owed = balances.getOrDefault(to, Collections.emptyMap())
                                  .getOrDefault(from, BigDecimal.ZERO);
        return owes.subtract(owed);
    }
    
    public Map<User, BigDecimal> getNetBalance(User user) {
        Map<User, BigDecimal> netBalance = new HashMap<>();
        
        // What user owes others
        for (Map.Entry<User, BigDecimal> entry : 
                balances.getOrDefault(user, Collections.emptyMap()).entrySet()) {
            netBalance.merge(entry.getKey(), entry.getValue().negate(), BigDecimal::add);
        }
        
        // What others owe user
        for (Map.Entry<User, Map<User, BigDecimal>> outer : balances.entrySet()) {
            BigDecimal owedByOther = outer.getValue().getOrDefault(user, BigDecimal.ZERO);
            if (owedByOther.compareTo(BigDecimal.ZERO) > 0) {
                netBalance.merge(outer.getKey(), owedByOther, BigDecimal::add);
            }
        }
        
        return netBalance;
    }
    
    // Simplify debts using greedy algorithm
    public List<Transaction> simplifyDebts() {
        Map<User, BigDecimal> netAmounts = calculateNetAmounts();
        
        List<Transaction> transactions = new ArrayList<>();
        
        PriorityQueue<Map.Entry<User, BigDecimal>> creditors = 
            new PriorityQueue<>((a, b) -> b.getValue().compareTo(a.getValue()));
        PriorityQueue<Map.Entry<User, BigDecimal>> debtors = 
            new PriorityQueue<>((a, b) -> a.getValue().compareTo(b.getValue()));
        
        for (Map.Entry<User, BigDecimal> entry : netAmounts.entrySet()) {
            if (entry.getValue().compareTo(BigDecimal.ZERO) > 0) {
                creditors.add(entry);
            } else if (entry.getValue().compareTo(BigDecimal.ZERO) < 0) {
                debtors.add(entry);
            }
        }
        
        while (!creditors.isEmpty() && !debtors.isEmpty()) {
            Map.Entry<User, BigDecimal> creditor = creditors.poll();
            Map.Entry<User, BigDecimal> debtor = debtors.poll();
            
            BigDecimal amount = creditor.getValue().min(debtor.getValue().abs());
            
            transactions.add(new Transaction(debtor.getKey(), creditor.getKey(), amount));
            
            BigDecimal newCreditorBalance = creditor.getValue().subtract(amount);
            BigDecimal newDebtorBalance = debtor.getValue().add(amount);
            
            if (newCreditorBalance.compareTo(BigDecimal.ZERO) > 0) {
                creditors.add(Map.entry(creditor.getKey(), newCreditorBalance));
            }
            if (newDebtorBalance.compareTo(BigDecimal.ZERO) < 0) {
                debtors.add(Map.entry(debtor.getKey(), newDebtorBalance));
            }
        }
        
        return transactions;
    }
    
    private Map<User, BigDecimal> calculateNetAmounts() {
        Map<User, BigDecimal> netAmounts = new HashMap<>();
        
        for (Map.Entry<User, Map<User, BigDecimal>> outer : balances.entrySet()) {
            User from = outer.getKey();
            for (Map.Entry<User, BigDecimal> inner : outer.getValue().entrySet()) {
                User to = inner.getKey();
                BigDecimal amount = inner.getValue();
                
                netAmounts.merge(from, amount.negate(), BigDecimal::add);
                netAmounts.merge(to, amount, BigDecimal::add);
            }
        }
        
        return netAmounts;
    }
}

public class Transaction {
    private final User from;
    private final User to;
    private final BigDecimal amount;
    
    public Transaction(User from, User to, BigDecimal amount) {
        this.from = from;
        this.to = to;
        this.amount = amount;
    }
    
    @Override
    public String toString() {
        return from.getName() + " pays " + to.getName() + " $" + amount;
    }
}

// Splitwise (Facade)
public class Splitwise {
    private final Map<String, User> users;
    private final Map<String, Group> groups;
    private final BalanceSheet balanceSheet;
    
    public Splitwise() {
        this.users = new HashMap<>();
        this.groups = new HashMap<>();
        this.balanceSheet = new BalanceSheet();
    }
    
    public User registerUser(String name, String email) {
        String id = "U" + (users.size() + 1);
        User user = new User(id, name, email);
        users.put(id, user);
        return user;
    }
    
    public Group createGroup(String name, User creator) {
        String id = "G" + (groups.size() + 1);
        Group group = new Group(id, name, creator);
        groups.put(id, group);
        return group;
    }
    
    public Expense addExpense(Group group, String description, BigDecimal amount, 
                              User paidBy, SplitStrategy strategy, 
                              List<User> participants, Map<User, BigDecimal> customValues) {
        String id = "E" + System.currentTimeMillis();
        Expense expense = new Expense(id, description, amount, paidBy, 
                                       strategy, participants, customValues);
        group.addExpense(expense);
        balanceSheet.processExpense(expense);
        return expense;
    }
    
    public Map<User, BigDecimal> getBalances(User user) {
        return balanceSheet.getNetBalance(user);
    }
    
    public List<Transaction> settleUp() {
        return balanceSheet.simplifyDebts();
    }
}
```

---

## 4. Snake and Ladder Game

### Requirements

```text
Design Snake and Ladder game:
- Multiple players take turns
- Roll dice, move on board
- Snakes move player down
- Ladders move player up
- First to reach 100 wins
```

### Implementation

```java
// Board elements
public abstract class BoardElement {
    protected int start;
    protected int end;
    
    public BoardElement(int start, int end) {
        this.start = start;
        this.end = end;
    }
    
    public int getStart() { return start; }
    public int getEnd() { return end; }
}

public class Snake extends BoardElement {
    public Snake(int head, int tail) {
        super(head, tail);
        if (tail >= head) {
            throw new IllegalArgumentException("Snake tail must be below head");
        }
    }
}

public class Ladder extends BoardElement {
    public Ladder(int bottom, int top) {
        super(bottom, top);
        if (top <= bottom) {
            throw new IllegalArgumentException("Ladder top must be above bottom");
        }
    }
}

// Dice (Strategy Pattern for different dice types)
public interface Dice {
    int roll();
}

public class StandardDice implements Dice {
    private final Random random = new Random();
    private final int sides;
    
    public StandardDice() {
        this.sides = 6;
    }
    
    public StandardDice(int sides) {
        this.sides = sides;
    }
    
    @Override
    public int roll() {
        return random.nextInt(sides) + 1;
    }
}

public class CrookedDice implements Dice {
    private final Random random = new Random();
    
    @Override
    public int roll() {
        // Only even numbers
        return (random.nextInt(3) + 1) * 2;
    }
}

// Player
public class Player {
    private final String name;
    private int position;
    
    public Player(String name) {
        this.name = name;
        this.position = 0;  // Start outside board
    }
    
    public String getName() { return name; }
    public int getPosition() { return position; }
    
    public void setPosition(int position) {
        this.position = position;
    }
}

// Board
public class Board {
    private final int size;
    private final Map<Integer, Integer> snakes;  // head -> tail
    private final Map<Integer, Integer> ladders; // bottom -> top
    
    public Board(int size) {
        this.size = size;
        this.snakes = new HashMap<>();
        this.ladders = new HashMap<>();
    }
    
    public void addSnake(int head, int tail) {
        validatePosition(head);
        validatePosition(tail);
        if (tail >= head) {
            throw new IllegalArgumentException("Invalid snake");
        }
        if (snakes.containsKey(head) || ladders.containsKey(head)) {
            throw new IllegalArgumentException("Position already occupied");
        }
        snakes.put(head, tail);
    }
    
    public void addLadder(int bottom, int top) {
        validatePosition(bottom);
        validatePosition(top);
        if (top <= bottom) {
            throw new IllegalArgumentException("Invalid ladder");
        }
        if (snakes.containsKey(bottom) || ladders.containsKey(bottom)) {
            throw new IllegalArgumentException("Position already occupied");
        }
        ladders.put(bottom, top);
    }
    
    public int getFinalPosition(int currentPosition, int diceValue) {
        int newPosition = currentPosition + diceValue;
        
        // Can't go beyond board
        if (newPosition > size) {
            return currentPosition;
        }
        
        // Check for snake or ladder at new position
        if (snakes.containsKey(newPosition)) {
            System.out.println("  Oops! Snake at " + newPosition + 
                              " → Slide down to " + snakes.get(newPosition));
            return snakes.get(newPosition);
        }
        
        if (ladders.containsKey(newPosition)) {
            System.out.println("  Yay! Ladder at " + newPosition + 
                              " → Climb up to " + ladders.get(newPosition));
            return ladders.get(newPosition);
        }
        
        return newPosition;
    }
    
    public boolean isWinningPosition(int position) {
        return position == size;
    }
    
    public int getSize() { return size; }
    
    private void validatePosition(int position) {
        if (position < 1 || position > size) {
            throw new IllegalArgumentException("Position out of board");
        }
    }
}

// Game
public class SnakeAndLadderGame {
    private final Board board;
    private final Dice dice;
    private final Queue<Player> players;
    private Player winner;
    private boolean gameOver;
    
    public SnakeAndLadderGame(Board board, Dice dice, List<Player> players) {
        this.board = board;
        this.dice = dice;
        this.players = new LinkedList<>(players);
        this.gameOver = false;
    }
    
    public void play() {
        System.out.println("Game started!");
        
        while (!gameOver) {
            playTurn();
        }
        
        System.out.println("Game Over! Winner: " + winner.getName());
    }
    
    private void playTurn() {
        Player currentPlayer = players.poll();
        int currentPosition = currentPlayer.getPosition();
        int diceValue = dice.roll();
        
        System.out.println(currentPlayer.getName() + " rolled " + diceValue);
        
        int newPosition = board.getFinalPosition(currentPosition, diceValue);
        currentPlayer.setPosition(newPosition);
        
        System.out.println(currentPlayer.getName() + " moved from " + 
                          currentPosition + " to " + newPosition);
        
        if (board.isWinningPosition(newPosition)) {
            winner = currentPlayer;
            gameOver = true;
        } else {
            players.add(currentPlayer);  // Add back to queue
        }
    }
    
    public Player getWinner() {
        return winner;
    }
}

// Game Builder
public class SnakeAndLadderGameBuilder {
    private Board board;
    private Dice dice;
    private List<Player> players;
    
    public SnakeAndLadderGameBuilder() {
        this.board = new Board(100);
        this.dice = new StandardDice();
        this.players = new ArrayList<>();
    }
    
    public SnakeAndLadderGameBuilder withBoardSize(int size) {
        this.board = new Board(size);
        return this;
    }
    
    public SnakeAndLadderGameBuilder addSnake(int head, int tail) {
        board.addSnake(head, tail);
        return this;
    }
    
    public SnakeAndLadderGameBuilder addLadder(int bottom, int top) {
        board.addLadder(bottom, top);
        return this;
    }
    
    public SnakeAndLadderGameBuilder addPlayer(String name) {
        players.add(new Player(name));
        return this;
    }
    
    public SnakeAndLadderGameBuilder withDice(Dice dice) {
        this.dice = dice;
        return this;
    }
    
    public SnakeAndLadderGame build() {
        if (players.size() < 2) {
            throw new IllegalStateException("Need at least 2 players");
        }
        return new SnakeAndLadderGame(board, dice, players);
    }
}

// Usage
public class Main {
    public static void main(String[] args) {
        SnakeAndLadderGame game = new SnakeAndLadderGameBuilder()
            .withBoardSize(100)
            .addSnake(99, 7)
            .addSnake(95, 75)
            .addSnake(62, 19)
            .addLadder(4, 14)
            .addLadder(9, 31)
            .addLadder(21, 42)
            .addPlayer("Alice")
            .addPlayer("Bob")
            .build();
        
        game.play();
    }
}
```

---

## 5. Vending Machine

### Requirements

```text
Design a vending machine:
- Multiple products with different prices
- Accept coins and notes
- Return change
- Dispense products
- Handle out-of-stock scenarios
```

### Implementation

```java
// State Pattern for Vending Machine
public interface VendingMachineState {
    void selectProduct(VendingMachine context, Product product);
    void insertMoney(VendingMachine context, Money money);
    void dispense(VendingMachine context);
    void cancel(VendingMachine context);
}

public class IdleState implements VendingMachineState {
    @Override
    public void selectProduct(VendingMachine context, Product product) {
        if (context.getInventory().isAvailable(product)) {
            context.setSelectedProduct(product);
            context.setState(new HasSelectionState());
            System.out.println("Selected: " + product.getName() + 
                              " - $" + product.getPrice());
        } else {
            System.out.println("Product out of stock");
        }
    }
    
    @Override
    public void insertMoney(VendingMachine context, Money money) {
        System.out.println("Please select a product first");
    }
    
    @Override
    public void dispense(VendingMachine context) {
        System.out.println("Please select a product and pay first");
    }
    
    @Override
    public void cancel(VendingMachine context) {
        System.out.println("No transaction to cancel");
    }
}

public class HasSelectionState implements VendingMachineState {
    @Override
    public void selectProduct(VendingMachine context, Product product) {
        context.setSelectedProduct(product);
        System.out.println("Changed selection to: " + product.getName());
    }
    
    @Override
    public void insertMoney(VendingMachine context, Money money) {
        context.addMoney(money);
        System.out.println("Inserted: " + money.getValue());
        
        if (context.getCurrentAmount().compareTo(
                context.getSelectedProduct().getPrice()) >= 0) {
            context.setState(new DispensingState());
        }
    }
    
    @Override
    public void dispense(VendingMachine context) {
        System.out.println("Please insert $" + 
            context.getSelectedProduct().getPrice().subtract(context.getCurrentAmount()) +
            " more");
    }
    
    @Override
    public void cancel(VendingMachine context) {
        context.returnMoney();
        context.reset();
        context.setState(new IdleState());
        System.out.println("Transaction cancelled");
    }
}

public class DispensingState implements VendingMachineState {
    @Override
    public void selectProduct(VendingMachine context, Product product) {
        System.out.println("Please wait, dispensing in progress");
    }
    
    @Override
    public void insertMoney(VendingMachine context, Money money) {
        System.out.println("Please wait, dispensing in progress");
    }
    
    @Override
    public void dispense(VendingMachine context) {
        Product product = context.getSelectedProduct();
        BigDecimal change = context.getCurrentAmount().subtract(product.getPrice());
        
        // Dispense product
        context.getInventory().dispense(product);
        System.out.println("Dispensing: " + product.getName());
        
        // Return change
        if (change.compareTo(BigDecimal.ZERO) > 0) {
            System.out.println("Returning change: $" + change);
        }
        
        context.reset();
        context.setState(new IdleState());
    }
    
    @Override
    public void cancel(VendingMachine context) {
        System.out.println("Cannot cancel, already dispensing");
    }
}

// Product
public class Product {
    private final String code;
    private final String name;
    private final BigDecimal price;
    
    public Product(String code, String name, BigDecimal price) {
        this.code = code;
        this.name = name;
        this.price = price;
    }
    
    // Getters
    public String getCode() { return code; }
    public String getName() { return name; }
    public BigDecimal getPrice() { return price; }
}

// Money
public enum Money {
    PENNY(new BigDecimal("0.01")),
    NICKEL(new BigDecimal("0.05")),
    DIME(new BigDecimal("0.10")),
    QUARTER(new BigDecimal("0.25")),
    DOLLAR(new BigDecimal("1.00")),
    FIVE(new BigDecimal("5.00")),
    TEN(new BigDecimal("10.00"));
    
    private final BigDecimal value;
    
    Money(BigDecimal value) {
        this.value = value;
    }
    
    public BigDecimal getValue() { return value; }
}

// Inventory
public class Inventory {
    private final Map<Product, Integer> stock;
    
    public Inventory() {
        this.stock = new HashMap<>();
    }
    
    public void addProduct(Product product, int quantity) {
        stock.merge(product, quantity, Integer::sum);
    }
    
    public boolean isAvailable(Product product) {
        return stock.getOrDefault(product, 0) > 0;
    }
    
    public void dispense(Product product) {
        if (!isAvailable(product)) {
            throw new IllegalStateException("Product not available");
        }
        stock.merge(product, -1, Integer::sum);
    }
    
    public int getQuantity(Product product) {
        return stock.getOrDefault(product, 0);
    }
}

// Vending Machine
public class VendingMachine {
    private VendingMachineState state;
    private final Inventory inventory;
    private Product selectedProduct;
    private BigDecimal currentAmount;
    private final List<Money> insertedMoney;
    
    public VendingMachine() {
        this.state = new IdleState();
        this.inventory = new Inventory();
        this.currentAmount = BigDecimal.ZERO;
        this.insertedMoney = new ArrayList<>();
    }
    
    // Delegate to state
    public void selectProduct(Product product) {
        state.selectProduct(this, product);
    }
    
    public void insertMoney(Money money) {
        state.insertMoney(this, money);
    }
    
    public void pressDispenseButton() {
        state.dispense(this);
    }
    
    public void pressCancel() {
        state.cancel(this);
    }
    
    // Internal methods
    void setState(VendingMachineState state) {
        this.state = state;
    }
    
    void setSelectedProduct(Product product) {
        this.selectedProduct = product;
    }
    
    void addMoney(Money money) {
        insertedMoney.add(money);
        currentAmount = currentAmount.add(money.getValue());
    }
    
    void returnMoney() {
        if (currentAmount.compareTo(BigDecimal.ZERO) > 0) {
            System.out.println("Returning: $" + currentAmount);
        }
    }
    
    void reset() {
        selectedProduct = null;
        currentAmount = BigDecimal.ZERO;
        insertedMoney.clear();
    }
    
    // Getters
    public Inventory getInventory() { return inventory; }
    public Product getSelectedProduct() { return selectedProduct; }
    public BigDecimal getCurrentAmount() { return currentAmount; }
}

// Usage
public class Main {
    public static void main(String[] args) {
        VendingMachine machine = new VendingMachine();
        
        // Stock products
        Product coke = new Product("A1", "Coca-Cola", new BigDecimal("1.50"));
        Product chips = new Product("B1", "Chips", new BigDecimal("1.25"));
        
        machine.getInventory().addProduct(coke, 5);
        machine.getInventory().addProduct(chips, 3);
        
        // Transaction
        machine.selectProduct(coke);        // Selected: Coca-Cola - $1.50
        machine.insertMoney(Money.DOLLAR);  // Inserted: 1.00
        machine.insertMoney(Money.QUARTER); // Inserted: 0.25
        machine.insertMoney(Money.QUARTER); // Inserted: 0.25
        machine.pressDispenseButton();       // Dispensing: Coca-Cola
    }
}
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│                  LLD INTERVIEW PROBLEMS CHEAT SHEET                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ ELEVATOR SYSTEM:                                                      │
│ ├── Strategy Pattern for scheduling                                   │
│ ├── State for elevator (MOVING, STOPPED)                              │
│ └── Direction-based priority queues                                   │
│                                                                       │
│ BOOKMYSHOW:                                                           │
│ ├── Theater → Screen → Show → Seats                                   │
│ ├── Synchronized seat locking (no double booking)                     │
│ └── Booking with expiry (scheduled cleanup)                           │
│                                                                       │
│ SPLITWISE:                                                            │
│ ├── Strategy Pattern for split types                                  │
│ ├── Balance sheet with net calculations                               │
│ └── Debt simplification algorithm                                     │
│                                                                       │
│ SNAKE & LADDER:                                                       │
│ ├── Builder pattern for game setup                                    │
│ ├── Strategy for dice (standard, crooked)                             │
│ └── Turn-based with player queue                                      │
│                                                                       │
│ VENDING MACHINE:                                                      │
│ ├── State Pattern (Idle, HasSelection, Dispensing)                    │
│ ├── Inventory management                                              │
│ └── Money handling with change                                        │
│                                                                       │
│ INTERVIEW APPROACH:                                                   │
│ 1. Clarify requirements (5 min)                                       │
│ 2. Identify entities (5 min)                                          │
│ 3. Design interfaces (5 min)                                          │
│ 4. Implement (25-30 min)                                              │
│ 5. Discuss extensions (5 min)                                         │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Back to:** [← LLD Overview](./intro)
