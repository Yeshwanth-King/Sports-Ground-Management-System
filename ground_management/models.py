from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator

# Sport type choices
SPORT_TYPES = [
    ('Cricket', 'Cricket'),
    ('Football', 'Football'),
    ('Basketball', 'Basketball'),
    ('Badminton', 'Badminton'),
    ('Tennis', 'Tennis'),
    ('Volleyball', 'Volleyball'),
    ('Hockey', 'Hockey'),
    ('Swimming', 'Swimming'),
]

# Payment method choices
PAYMENT_METHODS = [
    ('Card', 'Card'),
    ('Cash', 'Cash'),
    ('Online', 'Online'),
]

# Payment status choices
PAYMENT_STATUSES = [
    ('Paid', 'Paid'),
    ('Pending', 'Pending'),
    ('Failed', 'Failed'),
]

# Booking status choices
BOOKING_STATUSES = [
    ('Confirmed', 'Confirmed'),
    ('Cancelled', 'Cancelled'),
    ('Completed', 'Completed'),
]

# Slot availability status choices
AVAILABILITY_STATUSES = [
    ('Available', 'Available'),
    ('Booked', 'Booked'),
]

class Ground(models.Model):
    """Model representing a sports ground"""
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=200)
    sport_type = models.CharField(max_length=50, choices=SPORT_TYPES)
    rating = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(5.0)], 
        null=True, 
        blank=True
    )
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='grounds/', blank=True, null=True)
    
    def __str__(self):
        return f"{self.name} ({self.sport_type})"
    
    class Meta:
        ordering = ['name']

class Slot(models.Model):
    """Model representing a time slot for a ground"""
    ground = models.ForeignKey(Ground, on_delete=models.CASCADE, related_name='slots')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    price_per_slot = models.DecimalField(max_digits=10, decimal_places=2)
    availability_status = models.CharField(
        max_length=20, 
        choices=AVAILABILITY_STATUSES,
        default='Available'
    )
    
    def __str__(self):
        return f"{self.ground.name} - {self.date} ({self.start_time} to {self.end_time})"
    
    class Meta:
        ordering = ['date', 'start_time']
        # Ensure we don't have overlapping slots for the same ground
        constraints = [
            models.UniqueConstraint(
                fields=['ground', 'date', 'start_time'],
                name='unique_ground_slot'
            ),
        ]

class CustomUser(models.Model):
    """Model extending the built-in User model with additional fields"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(max_length=15)
    address = models.TextField()
    
    def __str__(self):
        return f"{self.user.username} Profile"

class Booking(models.Model):
    """Model representing a booking"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    slot = models.ForeignKey(Slot, on_delete=models.CASCADE, related_name='bookings')
    booking_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20, 
        choices=BOOKING_STATUSES,
        default='Confirmed'
    )
    
    def __str__(self):
        return f"Booking #{self.id} - {self.user.username} - {self.slot}"
    
    class Meta:
        ordering = ['-booking_date']

class Payment(models.Model):
    """Model representing a payment for a booking"""
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='payment')
    payment_date = models.DateTimeField(auto_now_add=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    payment_status = models.CharField(
        max_length=20, 
        choices=PAYMENT_STATUSES,
        default='Pending'
    )
    
    def __str__(self):
        return f"Payment #{self.id} for Booking #{self.booking.id}"
    
    class Meta:
        ordering = ['-payment_date']
