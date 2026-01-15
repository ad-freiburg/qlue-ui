# ---- Stage 1: Build the app ----
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

ARG BASE_URL
ARG GIT_COMMIT
ENV VITE_API_URL=${BASE_URL}
ENV VITE_GIT_COMMIT=${GIT_COMMIT}

COPY . .
RUN npm run build

# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
