try:
   import unzip_requirements
except ImportError:
   pass

import json
import random
import numpy as np

def endpoint(event, context):
    body = {}
    data, interest = gen_data()
    body = {
        "data": data,
        "interest": interest
    }

    response = {
        "statusCode": 200,
        "body": json.dumps(body)
    }

    return response

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


if __name__ == "__main__":
    endpoint('', '')