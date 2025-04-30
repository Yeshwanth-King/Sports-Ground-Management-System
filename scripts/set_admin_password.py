import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sports_ground_management.settings')
django.setup()

from django.contrib.auth.models import User

# Get the admin user
try:
    admin = User.objects.get(username='admin')
    # Set the password to 'admin123'
    admin.set_password('admin123')
    admin.save()
    print(f"Password for user '{admin.username}' has been set to 'admin123'")
except User.DoesNotExist:
    print("Admin user does not exist")