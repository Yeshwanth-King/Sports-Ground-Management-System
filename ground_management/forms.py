from django import forms
from .models import Ground, Slot, CustomUser, Booking, Payment, BOOKING_STATUSES
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from django.core.exceptions import ValidationError
from datetime import datetime, timedelta

class GroundForm(forms.ModelForm):
    class Meta:
        model = Ground
        fields = ['name', 'location', 'sport_type', 'rating', 'description', 'image']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 4}),
            'rating': forms.NumberInput(attrs={'min': 0, 'max': 5, 'step': 0.1}),
        }
    
    def clean_rating(self):
        rating = self.cleaned_data.get('rating')
        if rating and (rating < 0 or rating > 5):
            raise ValidationError('Rating must be between 0 and 5.')
        return rating

class SlotForm(forms.ModelForm):
    class Meta:
        model = Slot
        fields = ['ground', 'date', 'start_time', 'end_time', 'price_per_slot', 'availability_status']
        widgets = {
            'date': forms.DateInput(attrs={'type': 'date'}),
            'start_time': forms.TimeInput(attrs={'type': 'time'}),
            'end_time': forms.TimeInput(attrs={'type': 'time'}),
        }
    
    def clean(self):
        cleaned_data = super().clean()
        start_time = cleaned_data.get('start_time')
        end_time = cleaned_data.get('end_time')
        date = cleaned_data.get('date')
        
        # Check if start time is before end time
        if start_time and end_time and start_time >= end_time:
            raise ValidationError('Start time must be before end time.')
        
        # Check if date is not in the past
        if date and date < datetime.now().date():
            raise ValidationError('Cannot create slots for past dates.')
            
        return cleaned_data

class CustomUserForm(forms.ModelForm):
    class Meta:
        model = CustomUser
        fields = ['phone_number', 'address']
        widgets = {
            'address': forms.Textarea(attrs={'rows': 3}),
            'phone_number': forms.TextInput(attrs={'placeholder': 'e.g., +1-123-456-7890'})
        }
    
    def clean_phone_number(self):
        phone = self.cleaned_data.get('phone_number')
        # Simple validation - could be expanded with regex for specific formats
        if len(phone) < 10:
            raise ValidationError('Phone number must be at least 10 digits.')
        return phone

class ExtendedUserCreationForm(UserCreationForm):
    email = forms.EmailField(required=True)
    first_name = forms.CharField(max_length=30, required=True)
    last_name = forms.CharField(max_length=30, required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password1', 'password2']
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        user.first_name = self.cleaned_data['first_name']
        user.last_name = self.cleaned_data['last_name']
        
        if commit:
            user.save()
        
        return user

class BookingForm(forms.ModelForm):
    class Meta:
        model = Booking
        fields = ['slot', 'status']
        widgets = {
            'slot': forms.Select(attrs={'class': 'form-select'}),
        }
    
    def __init__(self, *args, **kwargs):
        # Get available slots only
        ground_id = kwargs.pop('ground_id', None)
        date = kwargs.pop('date', None)
        super().__init__(*args, **kwargs)
        
        if ground_id and date:
            self.fields['slot'].queryset = Slot.objects.filter(
                ground_id=ground_id, 
                date=date,
                availability_status='Available'
            )

class PaymentForm(forms.ModelForm):
    class Meta:
        model = Payment
        fields = ['payment_method', 'amount']
        widgets = {
            'payment_method': forms.Select(attrs={'class': 'form-select'}),
        }
    
    def __init__(self, *args, **kwargs):
        # Set amount based on the booking slot price
        booking = kwargs.pop('booking', None)
        super().__init__(*args, **kwargs)
        
        if booking:
            self.fields['amount'].initial = booking.slot.price_per_slot
            self.fields['amount'].widget.attrs['readonly'] = True

class DateFilterForm(forms.Form):
    date = forms.DateField(widget=forms.DateInput(attrs={'type': 'date'}))
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Initialize with today's date
        if not kwargs.get('data'):
            self.fields['date'].initial = datetime.now().date()

class BookingStatusUpdateForm(forms.ModelForm):
    class Meta:
        model = Booking
        fields = ['status']
        widgets = {
            'status': forms.Select(attrs={'class': 'form-select'}),
        }