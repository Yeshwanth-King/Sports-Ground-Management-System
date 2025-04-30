from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.contrib import messages
from django.db.models import Sum, Count, F, Q
from django.utils import timezone
from django.http import HttpResponse

from .models import Ground, Slot, CustomUser, Booking, Payment
from datetime import datetime, timedelta

# Helper function to check if user is admin
def is_admin(user):
    return user.is_staff or user.is_superuser

# Home page view
def home(request):
    # Get all grounds for display
    grounds = Ground.objects.all()
    return render(request, 'ground_management/home.html', {'grounds': grounds})

# Ground listing view
def ground_list(request):
    # Get filter parameters from request
    sport_type = request.GET.get('sport_type', '')
    location = request.GET.get('location', '')
    
    # Start with all grounds
    grounds = Ground.objects.all()
    
    # Apply filters if provided
    if sport_type:
        grounds = grounds.filter(sport_type=sport_type)
    if location:
        grounds = grounds.filter(location__icontains=location)
        
    # Get unique sport types and locations for filter dropdowns
    sport_types = Ground.objects.values_list('sport_type', flat=True).distinct()
    locations = Ground.objects.values_list('location', flat=True).distinct()
    
    context = {
        'grounds': grounds,
        'sport_types': sport_types,
        'locations': locations,
        'selected_sport': sport_type,
        'selected_location': location,
    }
    
    return render(request, 'ground_management/ground_list.html', context)

# Ground detail view
def ground_detail(request, ground_id):
    ground = get_object_or_404(Ground, id=ground_id)
    
    # Get date from request or use today
    date_str = request.GET.get('date', timezone.now().date().isoformat())
    try:
        selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        selected_date = timezone.now().date()
    
    # Get all slots for this ground on the selected date
    slots = Slot.objects.filter(ground=ground, date=selected_date)
    
    context = {
        'ground': ground,
        'selected_date': selected_date,
        'slots': slots,
    }
    
    return render(request, 'ground_management/ground_detail.html', context)

# User registration
def register(request):
    if request.method == 'POST':
        user_form = UserCreationForm(request.POST)
        
        if user_form.is_valid():
            # Save user but don't login yet
            user = user_form.save()
            
            # Create CustomUser profile
            phone_number = request.POST.get('phone_number', '')
            address = request.POST.get('address', '')
            CustomUser.objects.create(
                user=user,
                phone_number=phone_number,
                address=address
            )
            
            messages.success(request, 'Registration successful! Please log in.')
            return redirect('login')
    else:
        user_form = UserCreationForm()
    
    return render(request, 'ground_management/register.html', {'form': user_form})

# User profile view
@login_required
def user_profile(request):
    try:
        profile = CustomUser.objects.get(user=request.user)
    except CustomUser.DoesNotExist:
        # Create profile if it doesn't exist
        profile = CustomUser.objects.create(
            user=request.user,
            phone_number='',
            address=''
        )
    
    return render(request, 'ground_management/user_profile.html', {'profile': profile})

# Book a ground
@login_required
def book_ground(request, ground_id):
    ground = get_object_or_404(Ground, id=ground_id)
    
    if request.method == 'POST':
        slot_id = request.POST.get('slot_id')
        if not slot_id:
            messages.error(request, 'Please select a valid slot.')
            return redirect('book_ground', ground_id=ground_id)
        
        slot = get_object_or_404(Slot, id=slot_id)
        
        # Check if slot is available
        if slot.availability_status != 'Available':
            messages.error(request, 'This slot is no longer available.')
            return redirect('book_ground', ground_id=ground_id)
        
        # Create booking
        booking = Booking.objects.create(
            user=request.user,
            slot=slot,
            status='Confirmed'
        )
        
        # Update slot status
        slot.availability_status = 'Booked'
        slot.save()
        
        # Redirect to payment
        return redirect('payment', booking_id=booking.id)
    
    # Get available slots for this ground
    date_str = request.GET.get('date', timezone.now().date().isoformat())
    try:
        selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        selected_date = timezone.now().date()
    
    available_slots = Slot.objects.filter(
        ground=ground,
        date=selected_date,
        availability_status='Available'
    )
    
    context = {
        'ground': ground,
        'selected_date': selected_date,
        'available_slots': available_slots,
    }
    
    return render(request, 'ground_management/book_ground.html', context)

# Simple admin dashboard
@user_passes_test(is_admin)
def admin_dashboard(request):
    # Get counts for dashboard
    total_grounds = Ground.objects.count()
    total_slots = Slot.objects.count()
    total_bookings = Booking.objects.count()
    total_users = User.objects.count()
    
    # Recent bookings
    recent_bookings = Booking.objects.order_by('-booking_date')[:5]
    
    context = {
        'total_grounds': total_grounds,
        'total_slots': total_slots,
        'total_bookings': total_bookings,
        'total_users': total_users,
        'recent_bookings': recent_bookings,
    }
    
    return render(request, 'ground_management/admin_dashboard.html', context)

# User dashboard
@login_required
def user_dashboard(request):
    # Get user's bookings
    bookings = Booking.objects.filter(user=request.user).order_by('-booking_date')
    
    # Upcoming bookings (where slot date is in the future)
    upcoming_bookings = bookings.filter(
        slot__date__gte=timezone.now().date(),
        status='Confirmed'
    )
    
    context = {
        'bookings': bookings,
        'upcoming_bookings': upcoming_bookings,
    }
    
    return render(request, 'ground_management/user_dashboard.html', context)

# Placeholder for other views
def admin_ground_add(request):
    return HttpResponse("Admin Ground Add - To be implemented")

def admin_ground_edit(request, ground_id):
    return HttpResponse(f"Admin Ground Edit {ground_id} - To be implemented")

def admin_ground_delete(request, ground_id):
    return HttpResponse(f"Admin Ground Delete {ground_id} - To be implemented")

def admin_slot_list(request):
    return HttpResponse("Admin Slot List - To be implemented")

def admin_slot_add(request):
    return HttpResponse("Admin Slot Add - To be implemented")

def admin_slot_edit(request, slot_id):
    return HttpResponse(f"Admin Slot Edit {slot_id} - To be implemented")

def admin_slot_delete(request, slot_id):
    return HttpResponse(f"Admin Slot Delete {slot_id} - To be implemented")

def edit_profile(request):
    return HttpResponse("Edit Profile - To be implemented")

def user_bookings(request):
    return HttpResponse("User Bookings - To be implemented")

def cancel_booking(request, booking_id):
    return HttpResponse(f"Cancel Booking {booking_id} - To be implemented")

def admin_booking_list(request):
    return HttpResponse("Admin Booking List - To be implemented")

def admin_booking_detail(request, booking_id):
    return HttpResponse(f"Admin Booking Detail {booking_id} - To be implemented")

def payment(request, booking_id):
    return HttpResponse(f"Payment for Booking {booking_id} - To be implemented")

def payment_success(request, booking_id):
    return HttpResponse(f"Payment Success for Booking {booking_id} - To be implemented")

def revenue_report(request):
    return HttpResponse("Revenue Report - To be implemented")

def occupancy_report(request):
    return HttpResponse("Occupancy Report - To be implemented")
