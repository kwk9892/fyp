"""phase URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include
from home.views import index_view, instagram_profile_view, ClassificationView
from django.views.decorators.cache import cache_page
from django.contrib.sitemaps import views as sitemap_view
from home.sitemaps import ProfileSitemap
from home.feeds import LatestProfileFeed

sitemaps = {
    'profiles': ProfileSitemap,
}

urlpatterns = [
    path('sitemap_index/', cache_page(None)(sitemap_view.index), {'sitemaps': sitemaps}),
    path('sitemap-<section>/', cache_page(None) (sitemap_view.sitemap), {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),

    path('', cache_page(None)(index_view), name='index_view'),
    path('accounts/', include('django.contrib.auth.urls')),
    path('admin/', admin.site.urls),
    path('rss/', LatestProfileFeed()),
    path('api/', include('api.urls', namespace='api')),
    path('home/', include('home.urls', namespace='home')),
    path('instagram/<str:profile_username>', cache_page(None)(instagram_profile_view), name='instagram_profile_view'),
    path('classification', cache_page(None)(ClassificationView.as_view()), name='classification_view'),

] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)