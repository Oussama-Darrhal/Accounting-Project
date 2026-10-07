FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js jsconfig.json ./
COPY vite ./vite
COPY public ./public
COPY src ./src
RUN npm run build

FROM nginx:1.27-alpine
ENV API_UPSTREAM=api:8000
ENV NGINX_ENVSUBST_FILTER=API_UPSTREAM
COPY docker/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
