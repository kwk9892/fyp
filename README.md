# Final Year Project

![](https://github.com/kwk9892/fyp/workflows/Django%20Build/badge.svg?branch=master&event=push)

# Influencer Marketing Platform powered by Artificial Intelligence
[Insurtek.tech](https://insurtek.tech)

Team member
- Kong Woon Kit
- Lee Jia Shun

# Features
  - Predict product category based on search term (89% accuracy)
  - Searching for ```Monopoly``` gives you influencers in ```Games & Toys``` category
  - Detect objects present in an image (Object Detection)
  - Application Programming Interfaces (API)
  - Rss Feeds (accessible via https://insurtek.tech/rss/)
  - Sitemaps (accessible via https://insurtek.tech/sitemap_index/)
  - Automated Data Collection
  - AWS Lambda Serverless Architecture integration
  - CI/CD Pipeline (via Github Actions) is integrated
  - Logging

# Optimizations included
  - Website Speed Score https://gtmetrix.com/reports/insurtek.tech/ug36aAt8
  - Caching (API & Page)

# Setup
  - Assuming you've already cloned the repository in your local computer, if not please do so.

# Website Setup
  - Point your domain DNS A record to the IP address of your VPS
  - Install Docker and Docker-compose on your VPS/VM
  - SSH to your VPS/VM
  ```sh
  $ git clone https://github.com/kwk9892/fyp
  $ cd fyp
  # Add your domain in init-letsencrypt.sh
  # Add your domain in .env file
  $ sudo bash init-letsencrypt.sh
  ```

# Text Classification Training Model Setup
  - Navigate to ```etc/Text Classification``` and follow the README instructions

# Serverless AWS Lambda setup
  - Setup AWS credentials by following this tutorial ```https://www.serverless.com/framework/docs/providers/aws/guide/credentials/```
  - Make sure you have NPM installed
  - Install serverless by ```npm install -g serverless```
  - Navigate to ```fyp/etc/serverless```
  - Input the command ```serverless deploy -v```
  - Copy and replace the AWS endpoint at ```fyp/etc/Data Collection/collect_data.py``` 

# Data Collection Setup
  - Only works on windows.
  - Navigate to ```fyp/etc/Data Collection```
  - Install dependencies using ```python -m pip install -r requirements.txt```
  - Add your Instagram credentials in ```collect_data.py```
  - Run the python file

# What can be done to improve the project ?
- Add Testing Modules to our CI/CD pipeline
- Setup load balancers for scaling
- Handle Exceptions better
- Refactor the codes

#### in terms of.... Search Engine Optimization, we can
- Improve internal linking
- Make Visible Categories
- Perform keyword research
- Improve page speed by adding lazyloading
- Improve page title, descriptions, meta tags, etc.
- Host a blog under a subdomain ```blog.domain.com```


























