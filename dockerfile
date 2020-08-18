# pull official base image
FROM ubuntu:18.04

ADD ./ /app
RUN apt update \ 
    && apt install -y python3-pip \
    && apt-get install -y --no-install-recommends python3-dev default-libmysqlclient-dev \
    && apt-get install -y libsm6 libxext6 libxrender-dev \
    && pip3 install wheel setuptools \
    && pip3 install -r /app/config/requirements.txt \
    && apt purge -y --auto-remove $buildDeps \
    && apt install -y libmysqlclient20 \
    && apt-get install -y nano \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /root/.cache
#RUN mkdir -p /app/src
WORKDIR /app/src



# set work directory
# install dependencies
# copy project