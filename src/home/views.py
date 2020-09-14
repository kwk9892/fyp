from django.http import HttpResponse, JsonResponse
from django.core.paginator import Paginator
from django.shortcuts import render, redirect
from django.views import View
from django.db.models import Avg, Max
from home.models import Profile, Post, ProfileStats
from home.utils import get_random_colors
from phase.settings import USERNAME_PATH
from json import JSONDecodeError
import datetime
import json
import bleach
import requests
from django.views.decorators.cache import cache_page

#
# Domain.com
#
cache_page(None)
def index_view(request):
    profile_username = request.GET.get('username', None)
    if profile_username is None or profile_username == '':
        return redirect('instagram_profile_view', profile_username='natgeotravel')

    #usernames = [line.rstrip() for line in open(USERNAME_PATH, "r").readlines()]
    #if profile_username not in usernames:
    #    with open(USERNAME_PATH, "a") as f:
    #        f.write(profile_username)
    #        f.write('\n')
    #    return render(request, 'home/queue.html')

    profile_username = bleach.clean(profile_username)
    profile = Profile.objects.filter(profile_username=profile_username).first()
    if not profile:
        return redirect('instagram_profile_view', profile_username='natgeotravel')
    return redirect('instagram_profile_view', profile_username=profile_username)


# 
# Domain.com/instagram/<username>/
#
cache_page(None)
def instagram_profile_view(request, profile_username):
    total_post_to_filter = 12
    try:
        profiles = Profile.objects.get(profile_username=profile_username).profilestats_set.filter(profile_username=profile_username).order_by('-profile_stats_id')

    except Profile.DoesNotExist:
        return HttpResponse('<h1>404</h1>')

    profile_metrics = json.loads(Profile.objects.get(profile_username=profile_username).profile_metrics)
    posts = Post.objects.filter(profile_username=profile_username).order_by('-post_id')[:total_post_to_filter]
    random_profiles = ProfileStats.objects.get_random_profiles(n=10)

    interest_metrics = {}


    for metrics in profile_metrics['demographics']:
        for key, value in metrics['interest'].items():
            if(key in interest_metrics.keys()):
                interest_metrics[f'{key}'].append(value)
            else:
                interest_metrics[f'{key}'] = []
                interest_metrics[f'{key}'].append(value)

    colors = get_random_colors(len(interest_metrics))

    for profile in profiles:
        try:
            profile.profile_name = json.loads(profile.profile_name)
            profile.profile_bio = json.loads(profile.profile_bio)
        except JSONDecodeError:
            pass
    for random in random_profiles:
        random.profile_name = json.loads(random.profile_name)

    average_post_er = Post.objects.filter(profile_username=profile_username).order_by('-post_id')[:total_post_to_filter].aggregate(Avg('post_er'))['post_er__avg']
    average_post_likes = Post.objects.filter(profile_username=profile_username).order_by('-post_id')[:total_post_to_filter].aggregate(Avg('post_likes_count'))['post_likes_count__avg']
    average_post_comments = Post.objects.filter(profile_username=profile_username).order_by('-post_id')[:total_post_to_filter].aggregate(Avg('post_comments_count'))['post_comments_count__avg']
    average_likes_to_comment = average_post_likes / average_post_comments
    #Profile stats
    try:
        daily_growth_rate = (profiles[0].profile_followers - profiles[1].profile_followers)/profiles[1].profile_followers * 100
        daily_growth = profiles[0].profile_followers - profiles[1].profile_followers
    except IndexError:
        daily_growth_rate = 0
        daily_growth = 0

    context = {
        'daily_growth_rate': daily_growth_rate,
        'daily_growth': daily_growth,
        'average_post_er': average_post_er,
        'average_post_likes': average_post_likes,
        'average_post_comments': average_post_comments,
        'average_likes_to_comment': average_likes_to_comment,
        'posts': posts,
        'random_profiles': random_profiles,
        'profile_metrics': profile_metrics,
        'interest_metrics': interest_metrics,
        'colors': colors,
        'profiles': profiles
    }
    return render(request, "home/index.html", context=context)

#
# Domain.com/classification
#
from phase.settings import predictor
from django.core import files
from io import BytesIO
from PIL import Image 
import base64
from django.contrib.auth.mixins import LoginRequiredMixin

cache_page(None)
class ClassificationView(LoginRequiredMixin, View):
    login_url = '/home/login/'
    def get(self, request):
        response = {}
        image_url = request.GET.get('image_url', None)
        if image_url is None or image_url == '':
            return render(request, 'home/classification.html', response)
            #return HttpResponse("<h1>Params: image_url is empty</h1>")
        #response = self.get_post_data(image_url)
        try:
            r = requests.get(image_url)
        except:
            response['msg'] = 'We ran into some error.....'
            return render(request, 'home/classification.html', response)
        fp = BytesIO()
        img = Image.open(BytesIO(r.content))
        img = img.resize((500,500))
        img.save(fp, format='JPEG')

        input_image_64 = base64.b64encode(fp.getvalue()).decode('ascii')
        response['input'] = f'data:image/jpg;base64,{input_image_64}'

        returned_image, detections = predictor.detectObjectsFromImage(input_image=files.File(fp),
        input_type='stream',
        output_type='array',
        minimum_percentage_probability=30,
        thread_safe=True)

        img = Image.fromarray(returned_image, 'RGB')
        data = BytesIO()
        img.save(data, format='jpeg')
        output_image_64 = base64.b64encode(data.getvalue()).decode('ascii')

        response['output'] = f'data:image/jpg;base64,{output_image_64}'
        response['detections'] = detections
        response['msg'] = 'ok'

        return render(request, 'home/classification.html', response)

    #def get_post_data(self, image_url):
    #    url = f"https://insurtek.tech/api/classification/"
    #    data = {"image_url": image_url}
    #    return requests.post(url, data).json()

import numpy as np
from phase.settings import text_class
from tensorflow.keras.backend import set_session
from tensorflow.keras.preprocessing.sequence import pad_sequences

cache_page(None)
class SearchView(View):
    template_name = 'home/search.html'

    def get(self, request):
        search_term = bleach.clean(request.GET.get('query', ''))
        if(search_term == None or search_term == ''):
            return render(request, 'home/index.html')

        
        model = text_class.get_model()
        labels = text_class.get_encoder_classes()
        tokenizer = text_class.get_tokenizer()

        search_input = [search_term]

        sequences_input = tokenizer.texts_to_sequences(search_input)

        padded_input = pad_sequences(
            sequences_input,
            maxlen=250,
            padding='post',
            truncating='post'
           )
        
        with text_class.get_graph.as_default():
            set_session(text_class.get_session())
            prediction = model.predict(padded_input)
            predicted_label = labels[np.argmax(prediction)]

        profile_ids = (
            ProfileStats.objects
                .filter(profile_username__profile_interests__icontains=predicted_label)
                .order_by()
                .values('profile_username')
                .annotate(latest_id=Max('profile_stats_id'))
                .distinct()
        )
        profiles = ProfileStats.objects.filter(profile_stats_id__in=[profile['latest_id'] for profile in profile_ids])

        for profile in profiles:
            profile.profile_name = json.loads(profile.profile_name)

        paginator = Paginator(profiles, 20)
        page_number = request.GET.get('page')
        profile_obj = paginator.get_page(page_number)

        context = {
            'search_term': search_term,
            'predicted_label': predicted_label,
            'profile_obj': profile_obj
        }

        return render(request, self.template_name, context)

from home.utils import send_email
class LoginView(View):
    login_url = '/home/login/'
    redirect_field_name = 'index_view'
    template_name = 'home/login.html'
    def get(self, request):
        if not request.user.is_authenticated:
            return render(request, self.template_name)
        return redirect(self.redirect_field_name)

    def post(self, request):
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(username=username, password=password)
        if user is not None:
            login(request, user)
            send_email(request)
            return redirect(self.redirect_field_name)
        return self.get(request)

from django.contrib.auth import logout
class LogoutView(View):
    redirect_field_name = 'index_view'

    def get(self, request):
        if not request.user.is_authenticated:
            return redirect(self.redirect_field_name)
        logout(request)
        return redirect(self.redirect_field_name)

from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import UserCreationForm

class SignUpView(View):
    redirect_field_name = 'index_view'
    template_name = 'home/signup.html'
    def get(self, request):
        if not request.user.is_authenticated:
            form = UserCreationForm()
            context = {'form': form}
            return render(request, self.template_name, context)
        return redirect(self.redirect_field_name)

    def post(self, request):
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password1')
            user = authenticate(username=username, password=password)
            login(request, user)
            return redirect(self.redirect_field_name)
        form = UserCreationForm()
        context = {'form': form}
        return render(request, self.template_name, context)