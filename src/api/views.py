from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes, renderer_classes
from django.contrib.auth.models import User
from django.db.utils import IntegrityError
from api.serializers import *
from home.models import *
import bleach
import json
# Create your views here.

API_KEY = 'qweqweqwe'


#domain.com/api/profile/
class ProfilesAPI(APIView):
    """
    View to list all users in the system.

    * Requires token authentication.
    * Only admin users are able to access this view.
    """
    def get(self, request, format=None):
        response = {}
        profile = Profile.objects.all()
        response['data'] = ProfileSerializer(profile, many=True, context={'request': request}).data
        return Response(response)

    def post(self, request, format=None):

        response = {}
        post_data = json.loads(json.dumps(request.data.dict(), ensure_ascii=False))
        profile_serializer = ProfileSerializer(data=post_data)
        profile_stats_serializer = ProfileStatsSerializer(data=post_data)

        if(not profile_serializer.is_valid()):
            response['msg'] = profile_serializer.errors
            return Response(response)
        
        profile, created = Profile.objects.update_or_create(
            profile_username=profile_serializer.validated_data.get('profile_username'),
            defaults=profile_serializer.validated_data)

        if(not profile_stats_serializer.is_valid()):
            response['msg'] = profile_serializer.errors
            return Response(response)

        try:
            profile_stats_serializer.save()

        #Remember add unique=True in models.py
        except IntegrityError:
            response['msg'] =  'Today \'s record already exists'
            response['data'] = profile_serializer.data
            return Response(response)

        response['msg'] = 'Profile created, Stats added'
        response['data'] = profile_serializer.data
        return Response(response)

class PostsAPI(APIView):
    """
    View to list all users in the system.

    * Requires token authentication.
    * Only admin users are able to access this view.
    """

    def get(self, request, format=None):
        response = {}
        post = Post.objects.all()
        response['data'] = PostSerializer(post, many=True, context={'request': request}).data
        return Response(response)

    def post(self, request, format=None):
        response = {}
        post_data = request.data.dict()
        
        if (post_data.get('post_er', None) is None):
            try:
                prof = ProfileStats.objects.filter(profile_username=post_data['profile_username']).latest('profile_stats_id')
                prof_followers = prof.profile_followers
                post_likes = post_data['post_likes_count']
                post_comments = post_data['post_comments_count']
                post_data['post_er'] =  float(post_likes+post_comments)/float(prof_followers) # Post_er (likes + comments)/Total followers
            except ProfileStats.DoesNotExist:
                pass

        post_serializer = PostSerializer(data=post_data)
        if(not post_serializer.is_valid()):
            return Response(post_serializer.errors)

        try:
            post_serializer.save()
        except IntegrityError:
            response['msg'] = 'Today\'s record already exists'
            response['data'] = post_serializer.data
            return Response(response)
        response['msg'] = 'Post created, Stats added'
        response['data'] = post_serializer.data
        return Response(response)

import requests
from phase.settings import predictor
from django.core import files
from io import BytesIO
from PIL import Image 
import base64

class ImageAPI(APIView):
    def post(self, request):
        image_url = request.POST.get('image_url', None)
        response = {}
        
        if image_url is None or image_url == '':
            response['msg'] = 'error'
            return Response(response)

        try:
            r = requests.get(image_url)
        except:
            response['msg'] = 'error'
            return Response(response)
        # In-memory processing
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

        return Response(response)
