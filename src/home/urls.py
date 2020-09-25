from django.urls import path, include
from .views import LoginView, SignUpView, SearchView, LogoutView
from django.views.decorators.cache import cache_page

#from rest_framework import routers

app_name = 'home'

urlpatterns = [
    path('login/', LoginView.as_view(), name='login_view' ),
    path('signup/', SignUpView.as_view(), name='signup_view'),
    path('search/', cache_page(None)(SearchView.as_view()), name='search_view'),
    path('logout/', LogoutView.as_view(), name='logout_view'),
]
