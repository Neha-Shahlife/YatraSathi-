from django.db import models
from django.contrib.auth.models import User
import secrets


class Profile(models.Model):
    TRAVEL_TYPE_CHOICES = [
        ('solo', 'Solo'),
        ('adventure', 'Adventure'),
        ('safari', 'Safari'),
        ('group', 'Group Travel'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    age = models.IntegerField(null=True, blank=True)
    travel_type = models.CharField(max_length=20, choices=TRAVEL_TYPE_CHOICES, default='solo')
    bio = models.TextField(blank=True)
    photo = models.ImageField(upload_to='profile_photos/', null=True, blank=True)
    is_blocked = models.BooleanField(default=False)

    def __str__(self):
        return self.user.username


class AuthToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    key = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = secrets.token_hex(20)
        super().save(*args, **kwargs)


class Destination(models.Model):
    NEPAL_DESTINATIONS = [
        ('kathmandu', 'Kathmandu'),
        ('pokhara', 'Pokhara'),
        ('chitwan', 'Chitwan'),
        ('lumbini', 'Lumbini'),
        ('nagarkot', 'Nagarkot'),
        ('everest_base_camp', 'Everest Base Camp'),
        ('annapurna', 'Annapurna Region'),
        ('bandipur', 'Bandipur'),
        ('ilam', 'Ilam'),
        ('mustang', 'Mustang'),
    ]

    name = models.CharField(max_length=100, choices=NEPAL_DESTINATIONS, unique=True)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='destinations')

    def __str__(self):
        return self.get_name_display()


class TravelPlan(models.Model):
    TRAVEL_TYPE_CHOICES = [
        ('solo', 'Solo'),
        ('adventure', 'Adventure'),
        ('safari', 'Safari'),
        ('group', 'Group Travel'),
    ]

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='travel_plans')
    destination = models.ForeignKey(Destination, on_delete=models.CASCADE, related_name='travel_plans')
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    travel_date = models.DateField()
    duration_days = models.IntegerField(default=1)
    travel_type = models.CharField(max_length=20, choices=TRAVEL_TYPE_CHOICES, default='solo')
    open_spots = models.IntegerField(default=1)
    published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.destination.name}"


class JoinRequest(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Accepted', 'Accepted'),
        ('Rejected', 'Rejected'),
    ]

    travel_plan = models.ForeignKey(TravelPlan, on_delete=models.CASCADE, related_name='join_requests')
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_requests')
    spots_requested = models.IntegerField(default=1)
    phone_number = models.CharField(max_length=20, blank=True)
    message = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('travel_plan', 'requester')

    def __str__(self):
        return f"{self.requester.username} -> {self.travel_plan.title} ({self.status})"


class Notification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"To {self.recipient.username}: {self.message}"