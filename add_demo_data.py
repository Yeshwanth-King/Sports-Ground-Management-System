"""
This script populates the database with demo data for testing the application.
"""

import os
import sys
import django
import datetime
from decimal import Decimal

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sports_ground_management.settings')
sys.path.append('.')  # Add current directory to path
django.setup()

from django.contrib.auth.models import User
from ground_management.models import Ground, Slot, CustomUser

# Create superuser if it doesn't exist
try:
    admin = User.objects.get(username='admin')
    # Update admin password
    admin.set_password('admin123')
    admin.save()
    print("Updated admin password to 'admin123'")
except User.DoesNotExist:
    admin = User.objects.create_superuser(
        username='admin',
        email='admin@example.com',
        password='admin123'
    )
    # Create profile for admin
    CustomUser.objects.create(
        user=admin,
        phone_number='9876543210',
        address='Admin Office, Sports Ground Management'
    )
    print("Created admin user")

# Create regular user
try:
    user = User.objects.get(username='user')
    # Update user password
    user.set_password('user123')
    user.save()
    print("Updated regular user password to 'user123'")
except User.DoesNotExist:
    user = User.objects.create_user(
        username='user',
        email='user@example.com',
        password='user123',
        first_name='Regular',
        last_name='User'
    )
    # Create profile for user
    CustomUser.objects.create(
        user=user,
        phone_number='1234567890',
        address='123 Main St, User City'
    )
    print("Created regular user")

# Create demo grounds
demo_grounds = [
    {
        'name': 'Green Field Cricket Ground',
        'location': 'Downtown Sports Complex',
        'sport_type': 'Cricket',
        'rating': 4.5,
        'description': 'A well-maintained cricket ground with lush green outfield and a professional pitch. Perfect for cricket matches and practice sessions.'
    },
    {
        'name': 'Victory Football Stadium',
        'location': 'North Sports City',
        'sport_type': 'Football',
        'rating': 4.2,
        'description': 'Full-size football ground with artificial turf. Includes floodlights for evening matches and changing rooms.'
    },
    {
        'name': 'Elite Basketball Court',
        'location': 'Central Recreation Center',
        'sport_type': 'Basketball',
        'rating': 4.0,
        'description': 'Indoor basketball court with professional flooring and equipment. Air-conditioned facility available throughout the year.'
    },
    {
        'name': 'Ace Tennis Center',
        'location': 'East End Sports Club',
        'sport_type': 'Tennis',
        'rating': 4.8,
        'description': 'Premium tennis courts with clay and hard court options. Coaching services available upon request.'
    },
    {
        'name': 'Olympic Swimming Pool',
        'location': 'Aquatic Sports Center',
        'sport_type': 'Swimming',
        'rating': 4.6,
        'description': 'Olympic-sized swimming pool with temperature control. Separate lanes for professional swimmers and beginners.'
    }
]

# Create or update grounds
for ground_data in demo_grounds:
    try:
        ground = Ground.objects.get(name=ground_data['name'])
        # Update ground data
        for key, value in ground_data.items():
            setattr(ground, key, value)
        ground.save()
        print(f"Updated ground: {ground.name}")
    except Ground.DoesNotExist:
        Ground.objects.create(**ground_data)
        print(f"Created ground: {ground_data['name']}")

# Create slots for each ground
# We'll create slots for the next 7 days
today = datetime.date.today()
slot_times = [
    # Morning slots
    {'start': '06:00', 'end': '08:00', 'price': '500.00'},
    {'start': '08:00', 'end': '10:00', 'price': '800.00'},
    # Afternoon slots
    {'start': '12:00', 'end': '14:00', 'price': '1000.00'},
    {'start': '14:00', 'end': '16:00', 'price': '1000.00'},
    # Evening slots
    {'start': '18:00', 'end': '20:00', 'price': '1200.00'},
    {'start': '20:00', 'end': '22:00', 'price': '1000.00'},
]

# Delete existing future slots to avoid duplicates
Slot.objects.filter(date__gte=today).delete()
print("Cleared existing future slots")

# Create new slots for each ground
for ground in Ground.objects.all():
    for day_offset in range(7):
        slot_date = today + datetime.timedelta(days=day_offset)
        for slot_time in slot_times:
            Slot.objects.create(
                ground=ground,
                date=slot_date,
                start_time=slot_time['start'],
                end_time=slot_time['end'],
                price_per_slot=Decimal(slot_time['price']),
                availability_status='Available'
            )
    print(f"Created slots for {ground.name}")

print("\nDemo data has been successfully added to the database.")
print("\nYou can log in with the following credentials:")
print("Admin user: username=admin, password=admin123")
print("Regular user: username=user, password=user123")