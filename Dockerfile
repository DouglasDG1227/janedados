FROM nginx:stable-alpine

RUN rm -rf /etc/nginx/conf.d/*

# Copia tudo, exceto a pasta dist
COPY . /usr/share/nginx/html
RUN rm -rf /usr/share/nginx/html/dist

COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
