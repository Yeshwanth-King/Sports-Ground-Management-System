from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.contrib import messages
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.http import HttpResponseForbidden
from .models import Ground, Slot, CustomUser, Booking, Payment, BOOKING_STATUSES
from .forms import (
    GroundForm, SlotForm, CustomUserForm, ExtendedUserCreationForm,
    BookingForm, PaymentForm, DateFilterForm, BookingStatusUpdateForm
)
from datetime import datetime, timedelta
import decimal

# Helper function to check if user is admin
def is_admin(user):
    return user.is_staff

# Public views
def home(request):
    # Get few featured grounds (highest rated or recently added)
    featured_grounds = Ground.objects.all().order_by('-rating')[:3]
    return render(request, 'ground_management/home.html', {
        'featured_grounds': featured_grounds
    })

def ground_list(request):
    # Get filter parameters
    sport_type = request.GET.get('sport_type', '')
    location = request.GET.get('location', '')
    
    # Filter grounds
    grounds = Ground.objects.all()
    
    if sport_type:
        grounds = grounds.filter(sport_type=sport_type)
    
    if location:
        grounds = grounds.filter(location__icontains=location)
    
    # Get all sport types and locations for filter dropdowns
    sport_types = Ground.objects.values_list('sport_type', flat=True).distinct()
    locations = Ground.objects.values_list('location', flat=True).distinct()
    
    return render(request, 'ground_management/ground_list.html', {
        'grounds': grounds,
        'sport_types': sport_types,
        'locations': locations,
        'selected_sport': sport_type,
        'selected_location': location
    })

def ground_detail(request, ground_id):
    ground = get_object_or_404(Ground, pk=ground_id)
    
    # Get available dates for the next 7 days
    today = timezone.now().date()
    date_list = [today + timedelta(days=i) for i in range(7)]
    
    # Get the selected date (default to today)
    selected_date = request.GET.get('date', today.strftime('%Y-%m-%d'))
    try:
        selected_date = datetime.strptime(selected_date, '%Y-%m-%d').date()
    except ValueError:
        selected_date = today
    
    # Get available slots for the selected date
    available_slots = Slot.objects.filter(
        ground=ground,
        date=selected_date,
        availability_status='Available'
    ).order_by('start_time')
    
    return render(request, 'ground_management/ground_detail.html', {
        'ground': ground,
        'date_list': date_list,
        'selected_date': selected_date,
        'available_slots': available_slots
    })

def register(request):
    if request.method == 'POST':
        user_form = ExtendedUserCreationForm(request.POST)
        profile_form = CustomUserForm(request.POST)
        
        if user_form.is_valid() and profile_form.is_valid():
            # Save user
            user = user_form.save()
            
            # Save profile
            profile = profile_form.save(commit=False)
            profile.user = user
            profile.save()
            
            messages.success(request, 'Registration successful! You can now log in.')
            return redirect('login')
    else:
        user_form = ExtendedUserCreationForm()
        profile_form = CustomUserForm()
    
    return render(request, 'ground_management/register.html', {
        'user_form': user_form,
        'profile_form': profile_form
    })

# User views
@login_required
def user_profile(request):
    try:
        profile = request.user.profile
    except CustomUser.DoesNotExist:
        # If profile doesn't exist, create a blank one
        profile = CustomUser(user=request.user)
        profile.save()
    
    return render(request, 'ground_management/user_profile.html', {
        'profile': profile
    })

@login_required
def book_ground(request, ground_id):
    ground = get_object_or_404(Ground, pk=ground_id)
    
    if request.method == 'POST':
        form = BookingForm(request.POST)
        
        if form.is_valid():
            booking = form.save(commit=False)
            booking.user = request.user
            booking.save()
            
            # Update slot availability
            slot = booking.slot
            slot.availability_status = 'Booked'
            slot.save()
            
            messages.success(request, 'Booking successful! Please proceed to payment.')
            return redirect('payment', booking_id=booking.id)
    else:
        # Get date filter
        date_filter = DateFilterForm(request.GET)
        selected_date = timezone.now().date()
        
        if date_filter.is_valid():
            selected_date = date_filter.cleaned_data['date']
        
        # Create booking form with available slots
        form = BookingForm(ground_id=ground_id, date=selected_date)
    
    return render(request, 'ground_management/book_ground.html', {
        'form': form,
        'ground': ground,
        'date_filter': date_filter if 'date_filter' in locals() else DateFilterForm(),
        'selected_date': selected_date
    })

@login_required
def admin_dashboard(request):
    if not is_admin(request.user):
        return HttpResponseForbidden("You don't have permission to access this page.")
    
    # Get counts for dashboard
    grounds_count = Ground.objects.count()
    slots_count = Slot.objects.count()
    bookings_count = Booking.objects.count()
    users_count = User.objects.filter(is_staff=False).count()
    
    # Get recent bookings
    recent_bookings = Booking.objects.all().order_by('-booking_date')[:5]
    
    # Get revenue data
    total_revenue = Payment.objects.filter(payment_status='Paid').aggregate(Sum('amount'))['amount__sum'] or 0
    
    return render(request, 'ground_management/admin_dashboard.html', {
        'grounds_count': grounds_count,
        'slots_count': slots_count,
        'bookings_count': bookings_count,
        'users_count': users_count,
        'recent_bookings': recent_bookings,
        'total_revenue': total_revenue
    })

@login_required
def user_dashboard(request):
    # Get user's upcoming bookings
    upcoming_bookings = Booking.objects.filter(
        user=request.user,
        slot__date__gte=timezone.now().date(),
        status__in=['Confirmed', 'Pending']
    ).order_by('slot__date', 'slot__start_time')[:3]
    
    # Get total bookings count
    total_bookings = Booking.objects.filter(user=request.user).count()
    
    return render(request, 'ground_management/user_dashboard.html', {
        'upcoming_bookings': upcoming_bookings,
        'total_bookings': total_bookings
    })

# Admin Ground Management
@login_required
@user_passes_test(is_admin)
def admin_ground_add(request):
    if request.method == 'POST':
        form = GroundForm(request.POST, request.FILES)
        
        if form.is_valid():
            form.save()
            messages.success(request, 'Ground added successfully!')
            return redirect('admin_dashboard')
    else:
        form = GroundForm()
    
    return render(request, 'ground_management/admin_ground_form.html', {
        'form': form,
        'title': 'Add New Ground'
    })

@login_required
@user_passes_test(is_admin)
def admin_ground_edit(request, ground_id):
    ground = get_object_or_404(Ground, pk=ground_id)
    
    if request.method == 'POST':
        form = GroundForm(request.POST, request.FILES, instance=ground)
        
        if form.is_valid():
            form.save()
            messages.success(request, 'Ground updated successfully!')
            return redirect('admin_dashboard')
    else:
        form = GroundForm(instance=ground)
    
    return render(request, 'ground_management/admin_ground_form.html', {
        'form': form,
        'title': 'Edit Ground',
        'ground': ground
    })

@login_required
@user_passes_test(is_admin)
def admin_ground_delete(request, ground_id):
    ground = get_object_or_404(Ground, pk=ground_id)
    
    if request.method == 'POST':
        ground.delete()
        messages.success(request, 'Ground deleted successfully!')
        return redirect('admin_dashboard')
    
    return render(request, 'ground_management/admin_confirm_delete.html', {
        'title': 'Delete Ground',
        'object_name': ground.name,
        'cancel_url': 'admin_dashboard'
    })

# Admin Slot Management
@login_required
@user_passes_test(is_admin)
def admin_slot_list(request):
    # Get filter parameters
    ground_id = request.GET.get('groundId', '')
    date = request.GET.get('date', '')
    
    # Filter slots
    slots = Slot.objects.all().order_by('date', 'start_time')
    
    if ground_id:
        slots = slots.filter(ground_id=ground_id)
    
    if date:
        slots = slots.filter(date=date)
    
    # Get all grounds for filter dropdown
    grounds = Ground.objects.all()
    
    return render(request, 'ground_management/admin_slot_list.html', {
        'slots': slots,
        'grounds': grounds,
        'selected_ground_id': int(ground_id) if ground_id.isdigit() else None,
        'selected_date': date
    })

@login_required
@user_passes_test(is_admin)
def admin_slot_add(request):
    if request.method == 'POST':
        form = SlotForm(request.POST)
        
        if form.is_valid():
            form.save()
            messages.success(request, 'Slot added successfully!')
            return redirect('admin_slot_list')
    else:
        form = SlotForm()
    
    return render(request, 'ground_management/admin_slot_form.html', {
        'form': form,
        'title': 'Add New Slot'
    })

@login_required
@user_passes_test(is_admin)
def admin_slot_edit(request, slot_id):
    slot = get_object_or_404(Slot, pk=slot_id)
    
    if request.method == 'POST':
        form = SlotForm(request.POST, instance=slot)
        
        if form.is_valid():
            form.save()
            messages.success(request, 'Slot updated successfully!')
            return redirect('admin_slot_list')
    else:
        form = SlotForm(instance=slot)
    
    return render(request, 'ground_management/admin_slot_form.html', {
        'form': form,
        'title': 'Edit Slot',
        'slot': slot
    })

@login_required
@user_passes_test(is_admin)
def admin_slot_delete(request, slot_id):
    slot = get_object_or_404(Slot, pk=slot_id)
    
    if request.method == 'POST':
        slot.delete()
        messages.success(request, 'Slot deleted successfully!')
        return redirect('admin_slot_list')
    
    return render(request, 'ground_management/admin_confirm_delete.html', {
        'title': 'Delete Slot',
        'object_name': f"{slot.ground.name} - {slot.date} ({slot.start_time} to {slot.end_time})",
        'cancel_url': 'admin_slot_list'
    })

# User profile management
@login_required
def edit_profile(request):
    try:
        profile = request.user.profile
    except CustomUser.DoesNotExist:
        # If profile doesn't exist, create a blank one
        profile = CustomUser(user=request.user)
        profile.save()
    
    if request.method == 'POST':
        form = CustomUserForm(request.POST, instance=profile)
        
        if form.is_valid():
            form.save()
            messages.success(request, 'Profile updated successfully!')
            return redirect('user_profile')
    else:
        form = CustomUserForm(instance=profile)
    
    return render(request, 'ground_management/edit_profile.html', {
        'form': form
    })

# Booking management
@login_required
def user_bookings(request):
    today = timezone.now().date()
    
    # Get upcoming bookings (today or future date)
    upcoming_bookings = Booking.objects.filter(
        user=request.user,
        slot__date__gte=today
    ).order_by('slot__date', 'slot__start_time')
    
    # Get past bookings
    past_bookings = Booking.objects.filter(
        user=request.user,
        slot__date__lt=today
    ).order_by('-slot__date')
    
    return render(request, 'ground_management/user_bookings.html', {
        'upcoming_bookings': upcoming_bookings,
        'past_bookings': past_bookings
    })

@login_required
def cancel_booking(request, booking_id):
    booking = get_object_or_404(Booking, pk=booking_id)
    
    # Ensure user owns the booking
    if booking.user != request.user:
        return HttpResponseForbidden("You don't have permission to cancel this booking.")
    
    if request.method == 'POST':
        # Update booking status
        booking.status = 'Cancelled'
        booking.save()
        
        # Update slot availability
        slot = booking.slot
        slot.availability_status = 'Available'
        slot.save()
        
        messages.success(request, 'Booking cancelled successfully!')
        return redirect('user_bookings')
    
    return render(request, 'ground_management/confirm_cancel_booking.html', {
        'booking': booking
    })

@login_required
@user_passes_test(is_admin)
def admin_booking_list(request):
    # Get filter parameters
    status = request.GET.get('status', '')
    
    # Filter bookings
    bookings = Booking.objects.all().order_by('-booking_date')
    
    if status:
        bookings = bookings.filter(status=status)
    
    return render(request, 'ground_management/admin_booking_list.html', {
        'bookings': bookings,
        'booking_statuses': BOOKING_STATUSES,
        'selected_status': status
    })

@login_required
@user_passes_test(is_admin)
def admin_booking_detail(request, booking_id):
    booking = get_object_or_404(Booking, pk=booking_id)
    
    try:
        payment = booking.payment
    except Payment.DoesNotExist:
        payment = None
    
    if request.method == 'POST':
        form = BookingStatusUpdateForm(request.POST, instance=booking)
        
        if form.is_valid():
            updated_booking = form.save()
            
            # Update slot availability if booking is cancelled
            if updated_booking.status == 'Cancelled':
                slot = updated_booking.slot
                slot.availability_status = 'Available'
                slot.save()
            
            messages.success(request, 'Booking status updated successfully!')
            return redirect('admin_booking_detail', booking_id=booking.id)
    else:
        form = BookingStatusUpdateForm(instance=booking)
    
    return render(request, 'ground_management/admin_booking_detail.html', {
        'booking': booking,
        'payment': payment,
        'form': form
    })

# Payment
@login_required
def payment(request, booking_id):
    booking = get_object_or_404(Booking, pk=booking_id)
    
    # Ensure user owns the booking
    if booking.user != request.user:
        return HttpResponseForbidden("You don't have permission to access this page.")
    
    if request.method == 'POST':
        form = PaymentForm(request.POST, booking=booking)
        
        if form.is_valid():
            payment = form.save(commit=False)
            payment.booking = booking
            payment.payment_status = 'Paid'  # In a real app, this would depend on payment gateway response
            payment.save()
            
            messages.success(request, 'Payment successful!')
            return redirect('payment_success', booking_id=booking.id)
    else:
        form = PaymentForm(booking=booking)
    
    return render(request, 'ground_management/payment.html', {
        'form': form,
        'booking': booking
    })

@login_required
def payment_success(request, booking_id):
    booking = get_object_or_404(Booking, pk=booking_id)
    
    # Ensure user owns the booking
    if booking.user != request.user:
        return HttpResponseForbidden("You don't have permission to access this page.")
    
    try:
        payment = booking.payment
    except Payment.DoesNotExist:
        return redirect('payment', booking_id=booking.id)
    
    return render(request, 'ground_management/payment_success.html', {
        'booking': booking,
        'payment': payment
    })

# Reports
@login_required
@user_passes_test(is_admin)
def revenue_report(request):
    # Calculate total revenue
    total_revenue = Payment.objects.filter(payment_status='Paid').aggregate(Sum('amount'))['amount__sum'] or 0
    
    # Get revenue by ground
    revenue_data = []
    grounds = Ground.objects.all()
    
    for ground in grounds:
        ground_revenue = Payment.objects.filter(
            booking__slot__ground=ground,
            payment_status='Paid'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        
        if ground_revenue > 0:
            revenue_data.append({
                'ground': ground,
                'total_revenue': ground_revenue
            })
    
    # Sort by revenue (highest first)
    revenue_data.sort(key=lambda x: x['total_revenue'], reverse=True)
    
    return render(request, 'ground_management/revenue_report.html', {
        'total_revenue': total_revenue,
        'revenue_data': revenue_data
    })

@login_required
@user_passes_test(is_admin)
def occupancy_report(request):
    # Get occupancy data by ground
    occupancy_data = []
    grounds = Ground.objects.all()
    
    for ground in grounds:
        # Total number of slots
        total_slots = Slot.objects.filter(ground=ground).count()
        
        if total_slots > 0:
            # Number of booked slots
            booked_slots = Slot.objects.filter(
                ground=ground,
                availability_status='Booked'
            ).count()
            
            # Calculate occupancy rate
            occupancy_rate = (booked_slots / total_slots) * 100
            
            occupancy_data.append({
                'ground': ground,
                'total_slots': total_slots,
                'booked_slots': booked_slots,
                'occupancy_rate': occupancy_rate
            })
    
    # Sort by occupancy rate (highest first)
    occupancy_data.sort(key=lambda x: x['occupancy_rate'], reverse=True)
    
    return render(request, 'ground_management/occupancy_report.html', {
        'occupancy_data': occupancy_data
    })