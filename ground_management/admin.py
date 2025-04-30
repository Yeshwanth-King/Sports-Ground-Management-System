from django.contrib import admin
from .models import Ground, Slot, CustomUser, Booking, Payment

# Register Ground model
@admin.register(Ground)
class GroundAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'sport_type', 'rating')
    list_filter = ('sport_type', 'location')
    search_fields = ('name', 'location')

# Register Slot model
@admin.register(Slot)
class SlotAdmin(admin.ModelAdmin):
    list_display = ('ground', 'date', 'start_time', 'end_time', 'price_per_slot', 'availability_status')
    list_filter = ('ground', 'date', 'availability_status')
    search_fields = ('ground__name',)
    date_hierarchy = 'date'

# Register CustomUser model
@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone_number', 'address')
    search_fields = ('user__username', 'user__email', 'phone_number')

# Register Booking model
@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'slot', 'booking_date', 'status')
    list_filter = ('status', 'booking_date')
    search_fields = ('user__username', 'slot__ground__name')
    date_hierarchy = 'booking_date'

# Register Payment model
@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('booking', 'payment_date', 'amount', 'payment_method', 'payment_status')
    list_filter = ('payment_status', 'payment_method', 'payment_date')
    search_fields = ('booking__user__username',)
    date_hierarchy = 'payment_date'
