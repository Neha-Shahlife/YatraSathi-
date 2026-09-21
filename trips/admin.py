from django.contrib import admin
from .models import Profile, Destination, TravelPlan, JoinRequest, Notification

admin.site.register(Profile)
admin.site.register(Destination)
admin.site.register(TravelPlan)
admin.site.register(JoinRequest)
admin.site.register(Notification)