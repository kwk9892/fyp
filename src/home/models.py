from django.db import models
from django.contrib.auth.models import User
from django.db.models import Avg, Max
import random
<<<<<<< HEAD
from django.urls import reverse
=======
>>>>>>> b5ae9fa1b230c2110589694cb7ae0ea230526ef1
# Create your models here.

class Profile(models.Model):
    profile_id = models.AutoField(primary_key=True)
    profile_username = models.CharField(max_length=255, unique=True)
    profile_metrics = models.TextField(null=True)
    profile_interests = models.CharField(max_length=255, null=False, blank=True)

    def __str__(self):
        return self.profile_username

<<<<<<< HEAD
    def get_absolute_url(self):
        return reverse('instagram_profile_view', args=[self.profile_username])
=======
>>>>>>> b5ae9fa1b230c2110589694cb7ae0ea230526ef1

class ProfileStatsManager(models.Manager):
    def get_random_profiles(self, n=5):
        profile_ids = (
            self.order_by('-profile_username__profile_id')
                .values('profile_username')
                .annotate(latest_id=Max('profile_stats_id'))
                .distinct()
        )
        profiles = list(self.filter(profile_stats_id__in=[profile['latest_id'] for profile in profile_ids]))[:50]
        random_items = random.sample(profiles, n)
        return random_items

<<<<<<< HEAD
=======

>>>>>>> b5ae9fa1b230c2110589694cb7ae0ea230526ef1
class ProfileStats(models.Model):

    IS_VERIFIED = (
        (0 , 'unverified'),
        (1 , 'verified')
    )
    IS_BIZ_ACC = (
        (0 , 'non-business account'),
        (1 , 'business account')
    )

    profile_stats_id = models.AutoField(primary_key=True)
    profile_username = models.ForeignKey(Profile, to_field='profile_username', on_delete=models.CASCADE)
    profile_name = models.CharField(max_length=255, blank=True)
    profile_bio = models.TextField(blank=True)
    profile_website = models.TextField(null=False, blank=True)
    profile_business_category = models.CharField(max_length=255, blank=True)
    profile_is_verified = models.IntegerField(default=0, choices=IS_VERIFIED)
    profile_is_business_account = models.IntegerField(default=0, choices=IS_BIZ_ACC)
    profile_pic = models.TextField()
    profile_followers = models.IntegerField(default=0)
    profile_followings = models.IntegerField(default=0)
    profile_date = models.DateField(auto_now_add=True)
    objects = ProfileStatsManager()

    def __str__(self):
        return self.profile_username

<<<<<<< HEAD
    def get_absolute_url(self):
        return reverse('instagram_profile_view', args=[self.profile_username])

=======
>>>>>>> b5ae9fa1b230c2110589694cb7ae0ea230526ef1
    class Meta():
        ordering = ['-profile_stats_id']


class Post(models.Model):
    post_id = models.AutoField(primary_key=True)
    profile_username = models.ForeignKey(Profile, to_field='profile_username', on_delete=models.CASCADE)
    post_shortcode = models.CharField(max_length=255)
    post_comments_count = models.IntegerField(default=0)
    post_likes_count = models.IntegerField(default=0)
    post_image_category = models.TextField()
    post_er = models.FloatField(default=0.0)
    post_date = models.DateField(auto_now_add=True)
    post_image = models.TextField()
    post_desc = models.TextField()

    def __str__(self):
        return self.post_shortcode

    class Meta:
        unique_together = ('post_id', 'profile_username')

