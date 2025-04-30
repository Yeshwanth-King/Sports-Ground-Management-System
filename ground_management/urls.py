from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    # Home
    path('', views.home, name='home'),
    
    # Ground views
    path('grounds/', views.ground_list, name='ground_list'),
    path('grounds/<int:ground_id>/', views.ground_detail, name='ground_detail'),
    
    # Admin ground management
    path('admin/grounds/add/', views.admin_ground_add, name='admin_ground_add'),
    path('admin/grounds/<int:ground_id>/edit/', views.admin_ground_edit, name='admin_ground_edit'),
    path('admin/grounds/<int:ground_id>/delete/', views.admin_ground_delete, name='admin_ground_delete'),
    
    # Admin slot management
    path('admin/slots/', views.admin_slot_list, name='admin_slot_list'),
    path('admin/slots/add/', views.admin_slot_add, name='admin_slot_add'),
    path('admin/slots/<int:slot_id>/edit/', views.admin_slot_edit, name='admin_slot_edit'),
    path('admin/slots/<int:slot_id>/delete/', views.admin_slot_delete, name='admin_slot_delete'),
    
    # User authentication & profile
    path('register/', views.register, name='register'),
    path('profile/', views.user_profile, name='user_profile'),
    path('profile/edit/', views.edit_profile, name='edit_profile'),
    
    # Booking
    path('book/<int:ground_id>/', views.book_ground, name='book_ground'),
    path('bookings/', views.user_bookings, name='user_bookings'),
    path('bookings/<int:booking_id>/cancel/', views.cancel_booking, name='cancel_booking'),
    
    # Admin booking management
    path('admin/bookings/', views.admin_booking_list, name='admin_booking_list'),
    path('admin/bookings/<int:booking_id>/', views.admin_booking_detail, name='admin_booking_detail'),
    
    # Payment
    path('payment/<int:booking_id>/', views.payment, name='payment'),
    path('payment/<int:booking_id>/success/', views.payment_success, name='payment_success'),
    
    # Reports
    path('admin/reports/revenue/', views.revenue_report, name='revenue_report'),
    path('admin/reports/occupancy/', views.occupancy_report, name='occupancy_report'),
    
    # Dashboards
    path('admin/dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('dashboard/', views.user_dashboard, name='user_dashboard'),
    
    # Authentication
    path('login/', auth_views.LoginView.as_view(), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='home'), name='logout'),
]