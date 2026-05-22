FROM node:20-alpine

# Cài đặt Python (cần thiết cho yt-dlp) và ffmpeg (để xử lý audio)
RUN apk add --no-cache python3 py3-pip ffmpeg curl

# Tải yt-dlp binary mới nhất
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Cài đặt thư mục làm việc
WORKDIR /app

# Copy package.json và cài đặt dependencies (nếu có)
COPY package*.json ./
RUN npm install --omit=dev

# Copy mã nguồn
COPY proxy-server.js .

# Mở port
EXPOSE 3001

# Lệnh khởi chạy server
CMD ["npm", "start"]
