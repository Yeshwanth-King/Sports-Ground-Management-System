from django.urls import path
from . import views

urlpatterns = [
    # Home page
    path('', views.home, name='home'),
    
    # Ground related URLs
    path('grounds/', views.ground_list, name='ground_list'),
    path('grounds/<int:ground_id>/', views.ground_detail, name='ground_detail'),
    
    # Admin ground management
    path('admin/grounds/add/', views.admin_ground_add, name='admin_ground_add'),
    path('admin/grounds/edit/<int:ground_id>/', views.admin_ground_edit, name='admin_ground_edit'),
    path('admin/grounds/delete/<int:ground_id>/', views.admin_ground_delete, name='admin_ground_delete'),
    
    # Slot management
    path('admin/slots/', views.admin_slot_list, name='admin_slot_list'),
    path('admin/slots/add/', views.admin_slot_add, name='admin_slot_add'),
    path('admin/slots/edit/<int:slot_id>/', views.admin_slot_edit, name='admin_slot_edit'),
    path('admin/slots/delete/<int:slot_id>/', views.admin_slot_delete, name='admin_slot_delete'),
    
    # User registration and profile
    path('register/', views.register, name='register'),
    path('profile/', views.user_profile, name='user_profile'),
    path('profile/edit/', views.edit_profile, name='edit_profile'),
    
    # Booking related URLs
    path('book/<int:ground_id>/', views.book_ground, name='book_ground'),
    path('bookings/', views.user_bookings, name='user_bookings'),
    path('bookings/<int:booking_id>/cancel/', views.cancel_booking, name='cancel_booking'),
    
    # Admin booking management
    path('admin/bookings/', views.admin_booking_list, name='admin_booking_list'),
    path('admin/bookings/<int:booking_id>/', views.admin_booking_detail, name='admin_booking_detail'),
    
    # Payment related URLs
    path('payments/<int:booking_id>/', views.payment, name='payment'),
    path('payments/<int:booking_id>/success/', views.payment_success, name='payment_success'),
    
    # Admin reports
    path('admin/reports/revenue/', views.revenue_report, name='revenue_report'),
    path('admin/reports/occupancy/', views.occupancy_report, name='occupancy_report'),
    
    # Dashboard
    path('admin/dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('dashboard/', views.user_dashboard, name='user_dashboard'),
]