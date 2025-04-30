# Sports Ground Management System

A comprehensive Django-based system for managing sports grounds, booking slots, and handling payments.

## Features

- **Ground Management**: Add, edit, view, and delete sports grounds
- **Slot Management**: Create and manage time slots for each ground
- **User Registration and Authentication**: Secure user login and registration
- **Booking System**: Book available slots for specific grounds
- **Payment Processing**: Process payments for bookings
- **Admin Dashboard**: Comprehensive dashboard for administrators
- **User Dashboard**: User-friendly dashboard for registered users
- **Reports**: Revenue and occupancy reports for administrators

## Technologies Used

- **Backend**: Django, Python
- **Database**: PostgreSQL
- **Frontend**: HTML, CSS, Bootstrap 5
- **Form Handling**: Django Forms, Crispy Forms
- **Authentication**: Django's built-in authentication system

## Installation and Setup

1. Clone the repository
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Set up the database:
   ```
   python manage.py makemigrations
   python manage.py migrate
   ```
4. Create a superuser:
   ```
   python manage.py createsuperuser
   ```
5. Run the development server:
   ```
   python manage.py runserver
   ```

## Project Structure

- `ground_management/`: Main app containing models, views, and forms
- `sports_ground_management/`: Project settings and main URL configuration
- `templates/`: HTML templates for the web interface
- `static/`: Static files (CSS, JavaScript, images)
- `media/`: User-uploaded files (ground images)

## User Roles

1. **Admin**: Can manage grounds, slots, view bookings, and generate reports
2. **Regular User**: Can view grounds, book slots, and manage their bookings

## Database Schema

- **Ground**: Represents a sports ground with name, location, sport type, etc.
- **Slot**: Represents a time slot for a ground with date, start time, end time, etc.
- **Booking**: Represents a booking made by a user for a specific slot
- **Payment**: Represents payment information for a booking
- **CustomUser**: Extends the built-in User model with additional fields

## License

This project is created for educational purposes for a DBMS subject.