from rest_framework import serializers
from home.models import Profile, Post, ProfileStats
from rest_framework.validators import UniqueTogetherValidator
import bleach
import json
class ProfileStatsSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProfileStats
        fields = '__all__'
        extra_kwargs = {
            'profile_username': {'required': True},
        }
    def validate(self, data):
        """
        Sanitize all API inputs
        """
        for key, value in data.items():
            if(type(value) is str):
                value = bleach.clean(value)
        data['profile_name'] = json.dumps(data['profile_name'])
        data['profile_bio'] = json.dumps(data['profile_bio'])
        return data


class ProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = Profile
        fields = '__all__'
        extra_kwargs = {
            'profile_username': {'required': True, 'validators': []},
        }


class PostSerializer(serializers.ModelSerializer):

    class Meta:
        model = Post
        fields = '__all__'
        extra_kwargs = {
            'post_shortcode': {'allow_null': False, 'required': True},
            'profile_username': {'allow_null': False, 'required': True},
        }


        