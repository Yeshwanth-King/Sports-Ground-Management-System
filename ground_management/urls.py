from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    # Public pages
    path('', views.home, name='home'),
    path('grounds/', views.ground_list, name='ground_list'),
    path('grounds/<int:ground_id>/', views.ground_detail, name='ground_detail'),
    
    # Authentication
    path('accounts/login/', auth_views.LoginView.as_view(template_name='ground_management/login.html'), name='login'),
    path('accounts/logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('accounts/register/', views.register, name='register'),
    
    # User dashboard
    path('dashboard/', views.user_dashboard, name='user_dashboard'),
    path('profile/', views.user_profile, name='user_profile'),
    path('profile/edit/', views.edit_profile, name='edit_profile'),
    path('bookings/', views.user_bookings, name='user_bookings'),
    path('bookings/cancel/<int:booking_id>/', views.cancel_booking, name='cancel_booking'),
    
    # Booking and payment
    path('book/<int:ground_id>/', views.book_ground, name='book_ground'),
    path('payment/<int:booking_id>/', views.payment, name='payment'),
    path('payment/success/<int:booking_id>/', views.payment_success, name='payment_success'),
    
    # Admin dashboard
    path('admin-dashboard/', views.admin_dashboard, name='admin_dashboard'),
    
    # Admin ground management
    path('admin/grounds/add/', views.admin_ground_add, name='admin_ground_add'),
    path('admin/grounds/edit/<int:ground_id>/', views.admin_ground_edit, name='admin_ground_edit'),
    path('admin/grounds/delete/<int:ground_id>/', views.admin_ground_delete, name='admin_ground_delete'),
    
    # Admin slot management
    path('admin/slots/', views.admin_slot_list, name='admin_slot_list'),
    path('admin/slots/add/', views.admin_slot_add, name='admin_slot_add'),
    path('admin/slots/edit/<int:slot_id>/', views.admin_slot_edit, name='admin_slot_edit'),
    path('admin/slots/delete/<int:slot_id>/', views.admin_slot_delete, name='admin_slot_delete'),
    
    # Admin booking management
    path('admin/bookings/', views.admin_booking_list, name='admin_booking_list'),
    path('admin/bookings/<int:booking_id>/', views.admin_booking_detail, name='admin_booking_detail'),
    
    # Reports
    path('admin/reports/revenue/', views.revenue_report, name='revenue_report'),
    path('admin/reports/occupancy/', views.occupancy_report, name='occupancy_report'),
]