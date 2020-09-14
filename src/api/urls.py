from django.urls import path, include
from . import views
from django.views.decorators.cache import cache_page

#from rest_framework import routers

app_name = 'api'

urlpatterns = [
    #path('', include(router.urls)),
    path('api-auth/', include('rest_framework.urls')),
    #path('stats/profile/<str:username>', views.get_profile_stats),
    #path('stats/post/<str:shortcode>', views.get_post_stats),
    path('profile/', views.ProfilesAPI.as_view()),
    path('post/', views.PostsAPI.as_view()),
    path('classification/', cache_page(None)(views.ImageAPI.as_view())),
]
