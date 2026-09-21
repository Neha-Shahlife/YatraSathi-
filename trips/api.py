from django.http import JsonResponse
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.views.decorators.csrf import csrf_exempt
import json
from .models import Profile, AuthToken, TravelPlan, Destination, Notification, JoinRequest


# ---------- HELPERS ----------

def get_user_from_token(request):
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token_key = auth_header.replace('Bearer ', '').strip()
        try:
            return AuthToken.objects.get(key=token_key).user
        except AuthToken.DoesNotExist:
            return None
    return None


def build_user_json(user):
    profile, created = Profile.objects.get_or_create(user=user, defaults={'age': None, 'travel_type': 'solo'})
    ...
    return {
        'id': str(user.id),
        'role': 'admin' if user.is_staff else 'traveler',
        'name': user.first_name or user.username,
        'email': user.email,
        'age': profile.age,
        'type': profile.get_travel_type_display(),
        'bio': profile.bio,
        'avatar': profile.photo.url if profile.photo else '',
        'joined': str(user.date_joined.date()),
    }


def trip_to_json(plan):
    return {
        'id': str(plan.id),
        'title': plan.title,
        'dest': plan.destination.get_name_display(),
        'date': str(plan.travel_date),
        'days': plan.duration_days,
        'type': plan.get_travel_type_display(),
        'spots': plan.open_spots,
        'desc': plan.description,
        'owner': plan.owner.first_name or plan.owner.username,
        'ownerId': str(plan.owner.id),
        'published': plan.published,
    }


def request_to_json(r):
    return {
        'id': str(r.id),
        'tripId': str(r.travel_plan.id),
        'tripTitle': r.travel_plan.title,
        'userId': str(r.requester.id),
        'user': r.requester.first_name or r.requester.username,
        'phone': r.phone_number,
        'spots': r.spots_requested,
        'message': r.message,
        'status': r.status,
        'created': str(r.created_at.date()),
    }


def notification_to_json(n):
    return {
        'id': str(n.id),
        'text': n.message,
        'href': '#',
        'read': n.is_read,
        'created': str(n.created_at.date()),
    }


def destination_to_json(d):
    trip_count = TravelPlan.objects.filter(destination=d, published=True).count()
    return {
        'id': str(d.id),
        'name': d.get_name_display(),
        'imageKey': d.name,
        'badge': '',
        'badgeStyle': '',
        'heading': d.get_name_display(),
        'desc': d.description,
        'tags': [],
        'tripCount': trip_count,
        'createdBy': str(d.created_by.id),
    }


# ---------- AUTH ----------

@csrf_exempt
def api_register(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'POST request required'}, status=405)

    body = json.loads(request.body)
    name = body.get('name')
    email = body.get('email')
    age = body.get('age')
    password = body.get('password')
    travel_type = (body.get('type') or 'solo').lower()

    if User.objects.filter(email=email).exists():
        return JsonResponse({'message': 'An account with this email already exists.'}, status=409)

    user = User.objects.create_user(username=email, email=email, password=password, first_name=name)
    Profile.objects.create(user=user, age=age, travel_type=travel_type)
    token = AuthToken.objects.create(user=user)

    return JsonResponse({'token': token.key, 'user': build_user_json(user)}, status=201)


@csrf_exempt
def api_login(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'POST request required'}, status=405)

    body = json.loads(request.body)
    email = body.get('email')
    password = body.get('password')

    try:
        user_obj = User.objects.get(email=email)
    except User.DoesNotExist:
        return JsonResponse({'message': 'Incorrect email or password.'}, status=401)

    user = authenticate(request, username=user_obj.username, password=password)
    if user is None:
        return JsonResponse({'message': 'Incorrect email or password.'}, status=401)

    token, created = AuthToken.objects.get_or_create(user=user)
    return JsonResponse({'token': token.key, 'user': build_user_json(user)})


@csrf_exempt
def api_logout(request):
    user = get_user_from_token(request)
    if user:
        AuthToken.objects.filter(user=user).delete()
    return JsonResponse({'ok': True})


def api_me(request):
    user = get_user_from_token(request)
    if user is None:
        return JsonResponse({'message': 'Not authenticated'}, status=401)
    return JsonResponse(build_user_json(user))


# ---------- TRIPS ----------

def api_trips_list(request):
    plans = TravelPlan.objects.filter(published=True).order_by('-created_at')

    dest = request.GET.get('dest')
    if dest:
        plans = plans.filter(destination__name__iexact=dest)

    travel_type = request.GET.get('type')
    if travel_type:
        plans = plans.filter(travel_type__iexact=travel_type)

    from_date = request.GET.get('from_date')
    if from_date:
        plans = plans.filter(travel_date__gte=from_date)

    owner_id = request.GET.get('owner_id')
    if owner_id:
        plans = plans.filter(owner__id=owner_id)

    data = [trip_to_json(p) for p in plans]
    return JsonResponse(data, safe=False)


@csrf_exempt
def api_trips_create(request):
    user = get_user_from_token(request)
    if user is None:
        return JsonResponse({'message': 'Not authenticated'}, status=401)

    body = json.loads(request.body)
    title = body.get('title')
    dest_name = body.get('dest', '').lower()
    date = body.get('date')
    days = body.get('days', 1)
    travel_type = body.get('type', 'solo').lower()
    spots = body.get('spots', 1)
    desc = body.get('desc', '')

    try:
        destination = Destination.objects.get(name__iexact=dest_name)
    except Destination.DoesNotExist:
        return JsonResponse({'message': f'Destination "{dest_name}" not found.'}, status=400)

    plan = TravelPlan.objects.create(
        owner=user, destination=destination, title=title, description=desc,
        travel_date=date, duration_days=days, travel_type=travel_type, open_spots=spots,
    )
    Notification.objects.create(recipient=user, message='Your travel plan was published.')
    return JsonResponse(trip_to_json(plan), status=201)


@csrf_exempt
def api_trips_router(request):
    if request.method == 'GET':
        return api_trips_list(request)
    elif request.method == 'POST':
        return api_trips_create(request)
    return JsonResponse({'message': 'Method not allowed'}, status=405)


def api_trip_detail(request, pk):
    try:
        plan = TravelPlan.objects.get(pk=pk)
    except TravelPlan.DoesNotExist:
        return JsonResponse({'message': 'Trip not found.'}, status=404)
    return JsonResponse(trip_to_json(plan))


# ---------- DESTINATIONS ----------

def api_destinations_list(request):
    destinations = Destination.objects.all()
    data = [destination_to_json(d) for d in destinations]
    return JsonResponse(data, safe=False)


@csrf_exempt
def api_destinations_router(request):
    if request.method == 'GET':
        return api_destinations_list(request)
    elif request.method == 'POST':
        return api_destinations_create(request)
    return JsonResponse({'message': 'Method not allowed'}, status=405)


@csrf_exempt
def api_destinations_create(request):
    user = get_user_from_token(request)
    if user is None:
        return JsonResponse({'message': 'Not authenticated'}, status=401)

    body = json.loads(request.body)
    name = body.get('name', '').lower()
    desc = body.get('desc', '')

    valid_codes = [code for code, label in Destination.NEPAL_DESTINATIONS]
    if name not in valid_codes:
        return JsonResponse({'message': f'"{name}" is not a recognized destination.'}, status=400)

    if Destination.objects.filter(name=name).exists():
        return JsonResponse({'message': 'This destination already exists.'}, status=409)

    destination = Destination.objects.create(name=name, description=desc, created_by=user)
    return JsonResponse(destination_to_json(destination), status=201)


@csrf_exempt
def api_destination_detail(request, pk):
    try:
        destination = Destination.objects.get(pk=pk)
    except Destination.DoesNotExist:
        return JsonResponse({'message': 'Destination not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse(destination_to_json(destination))

    user = get_user_from_token(request)
    if user is None:
        return JsonResponse({'message': 'Not authenticated'}, status=401)

    if destination.created_by != user and not user.is_staff:
        return JsonResponse({'message': 'You can only edit your own destinations.'}, status=403)

    if request.method == 'PATCH':
        body = json.loads(request.body)
        if 'desc' in body:
            destination.description = body['desc']
        destination.save()
        return JsonResponse(destination_to_json(destination))

    elif request.method == 'DELETE':
        destination.delete()
        return JsonResponse({'ok': True})

    return JsonResponse({'message': 'Method not allowed'}, status=405)


# ---------- JOIN REQUESTS ----------

@csrf_exempt
def api_trip_requests_create(request, pk):
    user = get_user_from_token(request)
    if user is None:
        return JsonResponse({'message': 'Not authenticated'}, status=401)

    try:
        plan = TravelPlan.objects.get(pk=pk)
    except TravelPlan.DoesNotExist:
        return JsonResponse({'message': 'Trip not found.'}, status=404)

    if plan.owner == user:
        return JsonResponse({'message': 'You cannot request to join your own trip.'}, status=400)

    if JoinRequest.objects.filter(travel_plan=plan, requester=user).exists():
        return JsonResponse({'message': 'You already requested to join this trip.'}, status=409)

    body = json.loads(request.body)
    spots = body.get('spots', 1)
    phone = body.get('phone', '')
    message = body.get('message', '')

    join_request = JoinRequest.objects.create(
        travel_plan=plan, requester=user, spots_requested=spots,
        phone_number=phone, message=message,
    )
    Notification.objects.create(
        recipient=plan.owner,
        message=f"{user.first_name or user.username} wants to join '{plan.title}'."
    )
    return JsonResponse(request_to_json(join_request), status=201)


def api_requests_incoming(request):
    user = get_user_from_token(request)
    if user is None:
        return JsonResponse({'message': 'Not authenticated'}, status=401)

    requests_qs = JoinRequest.objects.filter(travel_plan__owner=user).order_by('-created_at')
    return JsonResponse([request_to_json(r) for r in requests_qs], safe=False)


def api_requests_sent(request):
    user = get_user_from_token(request)
    if user is None:
        return JsonResponse({'message': 'Not authenticated'}, status=401)

    requests_qs = JoinRequest.objects.filter(requester=user).order_by('-created_at')
    return JsonResponse([request_to_json(r) for r in requests_qs], safe=False)


@csrf_exempt
def api_request_update(request, pk):
    if request.method != 'PATCH':
        return JsonResponse({'message': 'PATCH request required'}, status=405)

    user = get_user_from_token(request)
    if user is None:
        return JsonResponse({'message': 'Not authenticated'}, status=401)

    try:
        join_request = JoinRequest.objects.get(pk=pk)
    except JoinRequest.DoesNotExist:
        return JsonResponse({'message': 'Request not found.'}, status=404)

    if join_request.travel_plan.owner != user:
        return JsonResponse({'message': 'Not allowed.'}, status=403)

    body = json.loads(request.body)
    new_status = body.get('status')
    if new_status not in ['Accepted', 'Rejected']:
        return JsonResponse({'message': 'Invalid status.'}, status=400)

    join_request.status = new_status
    join_request.save()

    Notification.objects.create(
        recipient=join_request.requester,
        message=f"Your request to join '{join_request.travel_plan.title}' was {new_status.lower()}."
    )
    return JsonResponse(request_to_json(join_request))


# ---------- NOTIFICATIONS ----------

def api_notifications_list(request):
    user = get_user_from_token(request)
    if user is None:
        return JsonResponse({'message': 'Not authenticated'}, status=401)

    notifications = Notification.objects.filter(recipient=user).order_by('-created_at')
    return JsonResponse([notification_to_json(n) for n in notifications], safe=False)


@csrf_exempt
def api_notifications_read_all(request):
    user = get_user_from_token(request)
    if user is None:
        return JsonResponse({'message': 'Not authenticated'}, status=401)

    Notification.objects.filter(recipient=user, is_read=False).update(is_read=True)
    return JsonResponse({'ok': True})


# ---------- PROFILE ----------

@csrf_exempt
def api_profile_router(request):
    if request.method == 'PATCH':
        return api_profile_update(request)
    elif request.method == 'DELETE':
        return api_profile_delete(request)
    return JsonResponse({'message': 'Method not allowed'}, status=405)


@csrf_exempt
def api_profile_update(request):
    if request.method != 'PATCH':
        return JsonResponse({'message': 'PATCH request required'}, status=405)

    user = get_user_from_token(request)
    if user is None:
        return JsonResponse({'message': 'Not authenticated'}, status=401)

    body = json.loads(request.body)
    profile = Profile.objects.get(user=user)

    if 'name' in body:
        user.first_name = body['name']
        user.save()
    if 'age' in body:
        profile.age = body['age']
    if 'type' in body:
        profile.travel_type = body['type'].lower()
    if 'bio' in body:
        profile.bio = body['bio']
    profile.save()

    return JsonResponse(build_user_json(user))


@csrf_exempt
def api_profile_delete(request):
    if request.method != 'DELETE':
        return JsonResponse({'message': 'DELETE request required'}, status=405)

    user = get_user_from_token(request)
    if user is None:
        return JsonResponse({'message': 'Not authenticated'}, status=401)

    user.delete()
    return JsonResponse({'ok': True})


def api_saved_list(request):
    return JsonResponse([], safe=False)


# ---------- ADMIN ----------

def api_admin_stats(request):
    user = get_user_from_token(request)
    if user is None or not user.is_staff:
        return JsonResponse({'message': 'Admin access required'}, status=403)

    return JsonResponse({
        'users': User.objects.count(),
        'plans': TravelPlan.objects.filter(published=True).count(),
        'requests': JoinRequest.objects.count(),
        'matches': JoinRequest.objects.filter(status='Accepted').count(),
    })


def api_admin_users(request):
    user = get_user_from_token(request)
    if user is None or not user.is_staff:
        return JsonResponse({'message': 'Admin access required'}, status=403)

    users = User.objects.all()
    data = [build_user_json(u) for u in users]
    return JsonResponse(data, safe=False)


@csrf_exempt
def api_admin_user_delete(request, pk):
    if request.method != 'DELETE':
        return JsonResponse({'message': 'DELETE request required'}, status=405)

    admin_user = get_user_from_token(request)
    if admin_user is None or not admin_user.is_staff:
        return JsonResponse({'message': 'Admin access required'}, status=403)

    try:
        target = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return JsonResponse({'message': 'User not found.'}, status=404)

    if target.is_staff and User.objects.filter(is_staff=True).count() <= 1:
        return JsonResponse({'message': 'Cannot remove the last admin.'}, status=400)

    target.delete()
    return JsonResponse({'ok': True})


@csrf_exempt
def api_admin_plan_delete(request, pk):
    if request.method != 'DELETE':
        return JsonResponse({'message': 'DELETE request required'}, status=405)

    admin_user = get_user_from_token(request)
    if admin_user is None or not admin_user.is_staff:
        return JsonResponse({'message': 'Admin access required'}, status=403)

    try:
        plan = TravelPlan.objects.get(pk=pk)
    except TravelPlan.DoesNotExist:
        return JsonResponse({'message': 'Plan not found.'}, status=404)

    plan.delete()
    return JsonResponse({'ok': True})