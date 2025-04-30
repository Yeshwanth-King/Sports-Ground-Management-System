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
# Admin ground management views
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
        'title': 'Add New Ground',
        'is_add': True
    })

@user_passes_test(is_admin)
def admin_ground_edit(request, ground_id):
    ground = get_object_or_404(Ground, id=ground_id)
    
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
        'ground': ground,
        'title': 'Edit Ground',
        'is_add': False
    })

@user_passes_test(is_admin)
def admin_ground_delete(request, ground_id):
    ground = get_object_or_404(Ground, id=ground_id)
    
    if request.method == 'POST':
        ground.delete()
        messages.success(request, f'Ground "{ground.name}" deleted successfully!')
        return redirect('admin_dashboard')
    
    return render(request, 'ground_management/admin_confirm_delete.html', {
        'object': ground,
        'title': 'Delete Ground',
        'object_name': ground.name,
        'cancel_url': 'admin_dashboard'
    })

# Admin slot management views
@user_passes_test(is_admin)
def admin_slot_list(request):
    # Get filter parameters
    ground_id = request.GET.get('groundId')
    date_str = request.GET.get('date')
    
    # Start with all slots
    slots = Slot.objects.all().order_by('date', 'start_time')
    
    # Apply filters if provided
    if ground_id:
        slots = slots.filter(ground_id=ground_id)
    
    if date_str:
        try:
            filter_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            slots = slots.filter(date=filter_date)
        except ValueError:
            pass
    
    # Get all grounds for the filter dropdown
    grounds = Ground.objects.all()
    
    return render(request, 'ground_management/admin_slot_list.html', {
        'slots': slots,
        'grounds': grounds,
        'selected_ground_id': int(ground_id) if ground_id else None,
        'selected_date': date_str
    })

@user_passes_test(is_admin)
def admin_slot_add(request):
    if request.method == 'POST':
        form = SlotForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Slot added successfully!')
            return redirect('admin_slot_list')
    else:
        # Pre-fill the ground if provided in GET parameters
        ground_id = request.GET.get('groundId')
        initial_data = {}
        
        if ground_id:
            try:
                ground = Ground.objects.get(id=ground_id)
                initial_data['ground'] = ground
            except Ground.DoesNotExist:
                pass
        
        form = SlotForm(initial=initial_data)
    
    return render(request, 'ground_management/admin_slot_form.html', {
        'form': form,
        'title': 'Add New Slot',
        'is_add': True
    })

@user_passes_test(is_admin)
def admin_slot_edit(request, slot_id):
    slot = get_object_or_404(Slot, id=slot_id)
    
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
        'slot': slot,
        'title': 'Edit Slot',
        'is_add': False
    })

@user_passes_test(is_admin)
def admin_slot_delete(request, slot_id):
    slot = get_object_or_404(Slot, id=slot_id)
    
    if request.method == 'POST':
        slot.delete()
        messages.success(request, 'Slot deleted successfully!')
        return redirect('admin_slot_list')
    
    return render(request, 'ground_management/admin_confirm_delete.html', {
        'object': slot,
        'title': 'Delete Slot',
        'object_name': f'Slot on {slot.date} ({slot.start_time} - {slot.end_time})',
        'cancel_url': 'admin_slot_list'
    })

# User profile management
@login_required
def edit_profile(request):
    try:
        profile = CustomUser.objects.get(user=request.user)
    except CustomUser.DoesNotExist:
        profile = CustomUser.objects.create(user=request.user, phone_number='', address='')
    
    if request.method == 'POST':
        user_form = UserCreationForm(request.POST, instance=request.user)
        profile_form = CustomUserForm(request.POST, instance=profile)
        
        if user_form.is_valid() and profile_form.is_valid():
            user_form.save()
            profile_form.save()
            messages.success(request, 'Your profile was updated successfully!')
            return redirect('user_profile')
    else:
        user_form = UserCreationForm(instance=request.user)
        profile_form = CustomUserForm(instance=profile)
    
    return render(request, 'ground_management/edit_profile.html', {
        'user_form': user_form,
        'profile_form': profile_form
    })

# User booking management
@login_required
def user_bookings(request):
    bookings = Booking.objects.filter(user=request.user).order_by('-booking_date')
    
    # Group bookings by status
    upcoming_bookings = bookings.filter(
        slot__date__gte=timezone.now().date(),
        status='Confirmed'
    )
    
    past_bookings = bookings.filter(
        Q(slot__date__lt=timezone.now().date()) | 
        Q(status='Completed') | 
        Q(status='Cancelled')
    )
    
    return render(request, 'ground_management/user_bookings.html', {
        'upcoming_bookings': upcoming_bookings,
        'past_bookings': past_bookings
    })

@login_required
def cancel_booking(request, booking_id):
    booking = get_object_or_404(Booking, id=booking_id, user=request.user)
    
    # Check if booking can be cancelled (only if it's confirmed and in the future)
    if booking.status != 'Confirmed' or booking.slot.date < timezone.now().date():
        messages.error(request, 'This booking cannot be cancelled.')
        return redirect('user_bookings')
    
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

# Admin booking management
@user_passes_test(is_admin)
def admin_booking_list(request):
    # Get filter parameters
    status = request.GET.get('status', '')
    
    # Start with all bookings
    bookings = Booking.objects.all().order_by('-booking_date')
    
    # Apply filters if provided
    if status:
        bookings = bookings.filter(status=status)
    
    return render(request, 'ground_management/admin_booking_list.html', {
        'bookings': bookings,
        'selected_status': status,
        'booking_statuses': [choice[0] for choice in BOOKING_STATUSES]
    })

@user_passes_test(is_admin)
def admin_booking_detail(request, booking_id):
    booking = get_object_or_404(Booking, id=booking_id)
    
    if request.method == 'POST':
        form = BookingStatusUpdateForm(request.POST, instance=booking)
        if form.is_valid():
            form.save()
            
            # If booking is cancelled, update slot availability
            if booking.status == 'Cancelled':
                slot = booking.slot
                slot.availability_status = 'Available'
                slot.save()
            
            messages.success(request, 'Booking status updated successfully!')
            return redirect('admin_booking_list')
    else:
        form = BookingStatusUpdateForm(instance=booking)
    
    # Get payment info if exists
    try:
        payment = Payment.objects.get(booking=booking)
    except Payment.DoesNotExist:
        payment = None
    
    return render(request, 'ground_management/admin_booking_detail.html', {
        'booking': booking,
        'payment': payment,
        'form': form
    })

# Payment processing
@login_required
def payment(request, booking_id):
    booking = get_object_or_404(Booking, id=booking_id, user=request.user)
    
    # Check if payment already exists
    try:
        payment = Payment.objects.get(booking=booking)
        messages.info(request, 'Payment has already been processed for this booking.')
        return redirect('payment_success', booking_id=booking.id)
    except Payment.DoesNotExist:
        pass
    
    if request.method == 'POST':
        form = PaymentForm(request.POST)
        if form.is_valid():
            payment = form.save(commit=False)
            payment.booking = booking
            payment.amount = booking.slot.price_per_slot  # Set amount from slot price
            payment.payment_status = 'Paid'  # Assume payment is successful
            payment.save()
            
            messages.success(request, 'Payment processed successfully!')
            return redirect('payment_success', booking_id=booking.id)
    else:
        form = PaymentForm(initial={'amount': booking.slot.price_per_slot})
    
    return render(request, 'ground_management/payment.html', {
        'booking': booking,
        'form': form
    })

@login_required
def payment_success(request, booking_id):
    booking = get_object_or_404(Booking, id=booking_id, user=request.user)
    
    try:
        payment = Payment.objects.get(booking=booking)
    except Payment.DoesNotExist:
        messages.error(request, 'No payment found for this booking.')
        return redirect('payment', booking_id=booking.id)
    
    return render(request, 'ground_management/payment_success.html', {
        'booking': booking,
        'payment': payment
    })

# Admin reports
@user_passes_test(is_admin)
def revenue_report(request):
    # Calculate revenue per ground
    grounds = Ground.objects.all()
    revenue_data = []
    
    for ground in grounds:
        total_revenue = Payment.objects.filter(
            booking__slot__ground=ground,
            payment_status='Paid'
        ).aggregate(total=Sum('amount'))
        
        revenue_data.append({
            'ground': ground,
            'total_revenue': total_revenue['total'] or 0
        })
    
    # Sort by revenue (highest first)
    revenue_data = sorted(revenue_data, key=lambda x: x['total_revenue'], reverse=True)
    
    return render(request, 'ground_management/revenue_report.html', {
        'revenue_data': revenue_data,
        'total_revenue': sum(item['total_revenue'] for item in revenue_data)
    })

@user_passes_test(is_admin)
def occupancy_report(request):
    # Calculate occupancy rate per ground
    grounds = Ground.objects.all()
    occupancy_data = []
    
    for ground in grounds:
        # Get all slots for this ground
        total_slots = Slot.objects.filter(ground=ground).count()
        
        if total_slots > 0:
            # Get booked slots
            booked_slots = Slot.objects.filter(
                ground=ground,
                availability_status='Booked'
            ).count()
            
            # Calculate occupancy rate
            occupancy_rate = (booked_slots / total_slots) * 100
        else:
            occupancy_rate = 0
        
        occupancy_data.append({
            'ground': ground,
            'total_slots': total_slots,
            'booked_slots': booked_slots if total_slots > 0 else 0,
            'occupancy_rate': occupancy_rate
        })
    
    # Sort by occupancy rate (highest first)
    occupancy_data = sorted(occupancy_data, key=lambda x: x['occupancy_rate'], reverse=True)
    
    return render(request, 'ground_management/occupancy_report.html', {
        'occupancy_data': occupancy_data
    })
