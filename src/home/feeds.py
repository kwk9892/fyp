from django.contrib.syndication.views import Feed
from django.utils.feedgenerator import Rss201rev2Feed, DefaultFeed
from .models import Profile, ProfileStats
from django.db.models import Max

class RssFeedGenerator(Rss201rev2Feed):
    content_type = 'application/xml; charset=utf-8'
    def rss_attributes(self):
        attrs = super(RssFeedGenerator, self).rss_attributes()
        attrs['xmlns:dc'] = "http://purl.org/dc/elements/1.1/"
        attrs['xmlns:media'] = 'http://search.yahoo.com/mrss/'
        return attrs
 
    def add_item_elements(self, handler, item):
        super(RssFeedGenerator, self).add_item_elements(handler, item)
        thumbnail = { 
            'url': item['thumbnail_url'],
            'medium' : "image"
            }
        handler.addQuickElement(u"media:content", '', thumbnail)
  

class LatestProfileFeed(Feed):
    title = 'InsurTek'
    link = 'https://www.insurtek.tech.com/en/rss'
    description = 'The rss feed'
    feed_type = RssFeedGenerator

    def items(self):
        profile_ids = (
            ProfileStats.objects.order_by('-profile_username__profile_id')
                .values('profile_username')
                .annotate(latest_id=Max('profile_stats_id'))
                .distinct()
        )
        profiles = ProfileStats.objects.filter(profile_stats_id__in=[profile['latest_id'] for profile in profile_ids]).order_by('-profile_username__profile_id')
        return profiles
        #return Profile.objects.order_by('-video_id')

    def item_title(self, item):
        return item.profile_username
        
    def item_description(self, item):
        return item.profile_bio

    def item_extra_kwargs(self, item):
        return { 'thumbnail_url': item.profile_pic }
