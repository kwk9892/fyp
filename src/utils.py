
import json
from json.decoder import JSONDecodeError
from phase.settings import USERNAME_PATH
import requests

usernames = [line.rstrip() for line in open(USERNAME_PATH, "r").readlines()]

headers = {
    'content_type': 'application/json'
}
def get_post_data(image_url):
    url = 'https://insurtek.tech/api/classification/'
    data = {'image_url': image_url}
    try:
        r = requests.post(url, data).json()
    except ValueError:
        return 'Cannot classify'
    detections = r['detections']
    if not detections:
        return 'Cannot classify'
    b = {x['name']:x for x in detections}.values()
    a = []
    for ab in b:
        for k, v in ab.items():
            if k == 'name':
                a.append(v)
    return ','.join(a)
for username in usernames:

    data = requests.get(f'https://instagram.com/{username}/?__a=1').json()
    if len(data) == 0:
        usernames.remove(username)
        continue
    if(data['graphql']['user']['is_private']):
        usernames.remove(username)
        continue
    try:
        profile_username = data['graphql']['user']['username']
        profile_name = data['graphql']['user']['full_name']
        profile_bio = data['graphql']['user']['biography']
        profile_website = data['graphql']['user']['external_url']
        profile_business_category = data['graphql']['user']['business_category_name']
        profile_is_verified = data['graphql']['user']['is_verified']
        profile_is_business_account = data['graphql']['user']['is_business_account']
        profile_profile_pic = data['graphql']['user']['profile_pic_url_hd']
        profile_followers = data['graphql']['user']['edge_followed_by']['count']
        profile_followings = data['graphql']['user']['edge_follow']['count']
        profile_data = {
            "api_key": 'qweqweqwe',
            "profile_username": profile_username,
            "profile_name": profile_name,
            "profile_bio": profile_bio,
            "profile_website": profile_website,
            "profile_business_category": profile_business_category,
            "profile_is_verified": 1 if profile_is_verified else 0,
            "profile_is_business_account": 1 if profile_is_business_account else 0,
            "profile_pic": profile_profile_pic,
            "profile_followers": profile_followers,
            "profile_followings": profile_followings,
        }   

        r = requests.post('https://insurtek.tech/api/add/profile/', data=profile_data, headers=headers)
        print(r.json()['msg'])
    except:
        print('Account is private')
        continue

        
    post_details = data['graphql']['user']['edge_owner_to_timeline_media']['edges']
    for i in range(len(post_details) -1 , -1, -1):
        try:
            post_shortcode = post_details[i]['node']['shortcode']
            post_image = post_details[i]['node']['display_url']
            post_desc = post_details[i]['node']['edge_media_to_caption']['edges'][0]['node']['text']
            post_comments_count = post_details[i]['node']['edge_media_to_comment']['count']
            post_likes_count = post_details[i]['node']['edge_liked_by']['count']
            post_image_category = get_post_data(post_image)
            print(post_image_category)
            post_data = {
                'api_key': 'qweqweqwe',
                "profile_username": profile_username,
                'post_shortcode': post_shortcode,
                'post_image': post_image,
                'post_desc': post_desc,
                'post_comments_count': post_comments_count,
                'post_likes_count': post_likes_count,
                'post_image_category': post_image_category,
            }
            r = requests.post('https://insurtek.tech/api/add/post/', data=post_data, headers=headers)
            print(r.json()['msg'])
        except KeyError:
            print('KeyError occured')
        except IndexError:
            print('Index error')
    
with open(USERNAME_PATH, "w") as f:
    for username in usernames:
        f.write(username)
        f.write('\n')


