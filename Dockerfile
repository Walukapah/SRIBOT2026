FROM node:22-alpine

# Install system dependencies including git
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    ffmpeg \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    git

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .

EXPOSE 8000
CMD ["npm", "start"]
