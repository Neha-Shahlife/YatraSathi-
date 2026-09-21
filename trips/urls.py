from django.urls import path
from . import api

urlpatterns = [
    path('api/auth/register', api.api_register),
    path('api/auth/register/', api.api_register),
    path('api/auth/login', api.api_login),
    path('api/auth/login/', api.api_login),
    path('api/auth/logout', api.api_logout),
    path('api/auth/logout/', api.api_logout),
    path('api/auth/me', api.api_me),
    path('api/auth/me/', api.api_me),

    path('api/trips', api.api_trips_router),
    path('api/trips/', api.api_trips_router),
    path('api/trips/<int:pk>', api.api_trip_detail),
    path('api/trips/<int:pk>/', api.api_trip_detail),
    path('api/trips/<int:pk>/requests', api.api_trip_requests_create),
    path('api/trips/<int:pk>/requests/', api.api_trip_requests_create),

    path('api/destinations', api.api_destinations_router),
    path('api/destinations/', api.api_destinations_router),
    path('api/destinations/<int:pk>', api.api_destination_detail),
    path('api/destinations/<int:pk>/', api.api_destination_detail),

    path('api/requests/incoming', api.api_requests_incoming),
    path('api/requests/incoming/', api.api_requests_incoming),
    path('api/requests/sent', api.api_requests_sent),
    path('api/requests/sent/', api.api_requests_sent),
    path('api/requests/<int:pk>', api.api_request_update),
    path('api/requests/<int:pk>/', api.api_request_update),

    path('api/notifications', api.api_notifications_list),
    path('api/notifications/', api.api_notifications_list),
    path('api/notifications/read-all', api.api_notifications_read_all),
    path('api/notifications/read-all/', api.api_notifications_read_all),

    path('api/profile', api.api_profile_router),
    path('api/profile/', api.api_profile_router),

    path('api/admin/stats', api.api_admin_stats),
    path('api/admin/stats/', api.api_admin_stats),
    path('api/users', api.api_admin_users),
    path('api/users/', api.api_admin_users),
    path('api/users/<int:pk>', api.api_admin_user_delete),
    path('api/users/<int:pk>/', api.api_admin_user_delete),
    path('api/admin/plans/<int:pk>', api.api_admin_plan_delete),
    path('api/admin/plans/<int:pk>/', api.api_admin_plan_delete),

    path('api/saved', api.api_saved_list),
    path('api/saved/', api.api_saved_list),
]