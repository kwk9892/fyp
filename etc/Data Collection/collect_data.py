from selenium.webdriver import Firefox
import time
import os
import json
import requests
import random
import numpy as np
import asyncio
import httpx

# AWS_ENDPOINT = 'https://ouxr4pirb3.execute-api.us-east-1.amazonaws.com/dev/get/data'
AWS_ENDPOINT = 'http://127.0.0.1:8000/data/'
INSTAGRAM_API_URL = 'https://instagram.com/{}/?__a=1'
UPLOAD_PROFILE_ENDPOINT = 'http://127.0.0.1:8000/api/profile/'
UPLOAD_POST_ENDPOINT = 'http://127.0.0.1:8000/api/post/'
INSTAGRAM_USERNAME = 'testacc_0023'
INSTAGRAM_PASSWORD = 'Testing@123'


def get_image_data(image_url):
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


def clean_profile_data(data, demographic_data):
    demographic_data = json.loads(demographic_data)
    interests = json.dumps(demographic_data['interests'])
    demographic_data = json.dumps(demographic_data)

    if not data:
        print("No Data")
        return {}

    profile_username = data['graphql']['user']['username']
    profile_metrics = demographic_data
    profile_interests = interests
    profile_name = data['graphql']['user']['full_name']
    profile_bio = data['graphql']['user']['biography']
    profile_website = data['graphql']['user']['external_url']
    profile_business_category = data['graphql']['user']['business_category_name']
    profile_is_verified = data['graphql']['user']['is_verified']
    profile_is_business_account = data['graphql']['user']['is_business_account']
    profile_pic = data['graphql']['user']['profile_pic_url_hd']
    profile_followers = data['graphql']['user']['edge_followed_by']['count']
    profile_followings = data['graphql']['user']['edge_follow']['count']
    profile_data = {
        "api_key": 'qweqweqwe',
        "profile_username": profile_username,
        'profile_metrics': profile_metrics,
        "profile_interests": profile_interests,
        "profile_name": profile_name,
        "profile_bio": profile_bio,
        "profile_website": profile_website,
        "profile_business_category": profile_business_category,
        "profile_is_verified": 1 if profile_is_verified else 0,
        "profile_is_business_account": 1 if profile_is_business_account else 0,
        "profile_pic": profile_pic,
        "profile_followers": profile_followers,
        "profile_followings": profile_followings,
    }
    print("Collected: ", profile_username)
    return profile_data


def clean_post_data(post_details, profile_data, index):
    post_shortcode = post_details[index]['node']['shortcode']
    post_image = post_details[index]['node']['display_url']
    try:
        post_desc = post_details[index]['node']['edge_media_to_caption']['edges'][0]['node']['text']
    except IndexError:
        post_desc = ''
    post_comments_count = post_details[index]['node']['edge_media_to_comment']['count']
    post_likes_count = post_details[index]['node']['edge_liked_by']['count']
    post_data = {
        'api_key': 'qweqweqwe',
        "profile_username": profile_data['profile_username'],
        'post_shortcode': post_shortcode,
        'post_image': post_image,
        'post_desc': post_desc if post_desc else 'No desc',
        'post_comments_count': post_comments_count,
        'post_likes_count': post_likes_count,
    }
    #post_data = json.dumps(post_data)
    return post_data

def get_ig_cookies():
    driver = Firefox(executable_path="geckodriver.exe")
    driver.implicitly_wait(20)
    driver.get("https://instagram.com")
    driver.find_element_by_xpath('//input[@name="username"]').send_keys(INSTAGRAM_USERNAME)
    driver.find_element_by_xpath('//input[@name="password"]').send_keys(INSTAGRAM_PASSWORD)
    driver.find_element_by_xpath('//button[@type="submit"]').click()
    time.sleep(3)
    driver.get('https://instagram.com/natgeotravel/?__a=1')
    cookies = {cookie['name']: cookie['value'] for cookie in driver.get_cookies() }
    #driver.close()
    return cookies, driver


def close_browser(driver):
    driver.close()

async def get_instagram_profile_data(username, client=None):
    resp = await client.get(INSTAGRAM_API_URL.format(username))
    data = resp.json()
    return data

import json
import random
import numpy as np

def endpoint(event=0, context=0):
    body = {}
    data, interest = gen_data()
    body = {
        "data": data,
        "interest": interest
    }

    response = {
        "statusCode": 200,
        "body": body
    }

    return response['body']

def gen_data():
    identifiers = [
        "18 - 24",
        "25 - 32",
        "33 - 40",
        "41 - 48",
        "49 - 56",
        "57 - 64",
        "65++"
    ]

    classes = ['Automotive', 'Beauty', 'Cell Phones and Accessories',
                'Electronics', 'Health and Personal Care', 'Home and Kitchen',
                'Pet Supplies', 'Sports and Outdoors', 'Toys and Games']
    random_cat = random.sample(classes, 5)
    # top 3 interest

    data_list = []
    for identifier in identifiers:
        normal_dist = np.random.dirichlet(np.ones(5), size=1)[0]

        normal_dist = [round(dist*100, 2) for dist in normal_dist]

        male_prob = random.uniform(25, 75)
        female_prob = 100 - male_prob
        data = {}
        data['identifier'] = identifier
        data['male'] = male_prob
        data['female'] = female_prob
        data['interest'] = { k: v for k, v in zip(random_cat, normal_dist)}
        data_list.append(data)
    interest = sorted(zip(normal_dist, random_cat), reverse=True)[:3]
    return data_list, interest

async def get_generated_data(client=None):
    resp = endpoint()
    generated_data = resp
    demo, interest = generated_data['data'], generated_data['interest']
    interests = ", ".join([category for value, category in interest])
    demographic_data = {
        'demographics': demo,
        'interests': interests
    }
    demo_data = json.dumps(demographic_data)
    return demo_data



async def upload_profile_data(profile_data:dict, client=None):
    print("Uploading: ", profile_data['profile_username'])
    profile_data = json.dumps(profile_data)
    resp = await client.post(UPLOAD_PROFILE_ENDPOINT, data=profile_data)
    return resp.json()



async def upload_post_data(post_data:dict, client=None):
    post_data = json.dumps(post_data)
    resp = await client.post(UPLOAD_POST_ENDPOINT, data=post_data)
    return resp.json()



async def gather_data(usernames, **kwargs):
    async with httpx.AsyncClient(**kwargs) as client:
        gen_data_tasks = [get_generated_data(client=client) for _ in range(len(usernames))]
        profile_data_tasks = [get_instagram_profile_data(username, client=client) for username in usernames]

        gen_data_responses = await asyncio.gather(*gen_data_tasks)
        profile_responses = await asyncio.gather(*profile_data_tasks)

    generated_data_lists = [response for response in gen_data_responses]
    profile_data_lists = [response for response in profile_responses]

    return generated_data_lists, profile_data_lists



async def upload_data(profile_post_data_lists, posts_post_data_lists, **kwargs):
    async with httpx.AsyncClient(**kwargs) as client:

        upload_profile_tasks = [upload_profile_data(profile_data, client=client) for profile_data in profile_post_data_lists]
        upload_post_tasks = [upload_post_data(post_data, client=client) for post_data in posts_post_data_lists]

        upload_profile_responses = await asyncio.gather(*upload_profile_tasks)
        upload_post_responses = await asyncio.gather(*upload_post_tasks)

    upload_profile_lists = [response for response in upload_profile_responses]
    upload_post_lists = [response for response in upload_post_responses]

    return upload_profile_lists, upload_post_lists

# get len of profiles - DONE
# get gen_data in list - DONE
# get profiles and add json to list - DONE
# loop through and construct data for profiles - DONE
# loop through and construct data for posts - DONE
user_agent = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36"
}

if __name__ == '__main__':
    usernames = [line.rstrip() for line in open("usernames.txt", "r").readlines()]
    total_profiles = len(usernames)
    print("Total profiles: %s" % total_profiles)
    PER_BATCH = 5
    i = 1
    cookies, driver = get_ig_cookies()
    print(cookies)
    while((total_profiles//i) != PER_BATCH):
        print(i)
        if(total_profiles//i) < PER_BATCH:
            break
        if(i == 1):
            batch_usernames = usernames[:PER_BATCH]
        else:
            batch_usernames = usernames[PER_BATCH*i : PER_BATCH*i+PER_BATCH]
        i += 1
        generated_data_lists, profile_data_lists = asyncio.run(gather_data(batch_usernames, cookies=cookies, headers=user_agent, timeout=60))
        print("Generated data lists: ", len(generated_data_lists))
        print("Profile data lists: ", len(profile_data_lists))
        profile_post_data_lists = []
        posts_post_data_lists = []
        for index, profile in enumerate(profile_data_lists):
            try:
                post_details = profile['graphql']['user']['edge_owner_to_timeline_media']['edges']
            except:
                continue
            profile_post_data = clean_profile_data(profile, generated_data_lists[index])
            if profile_post_data:
                profile_post_data_lists.append(profile_post_data)

            for index in range(len(post_details) -1, -1, -1):
                posts_post_data = clean_post_data(post_details, profile_post_data, index)
                posts_post_data_lists.append(posts_post_data)



        headers = {
            'Content-Type': 'application/json',
        }
        a, b = asyncio.run(upload_data(profile_post_data_lists, posts_post_data_lists, headers=headers, timeout=120))


        print('Profiles')
        for profile in a:
            print(profile['msg'])

        print('Posts')
        for posts in a:
            print(posts['msg'])

    close_browser(driver)



