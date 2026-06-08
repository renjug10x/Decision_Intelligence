FROM nginx:stable-alpine

# Define build argument for Nginx configuration (defaults to local configuration)
ARG NGINX_CONF=nginx.local.conf

# Remove default configuration
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy selected configuration to conf.d/default.conf
COPY ${NGINX_CONF} /etc/nginx/conf.d/default.conf

# Create directory for Certbot challenges
RUN mkdir -p /var/www/certbot

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
