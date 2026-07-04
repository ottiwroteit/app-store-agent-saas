FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY src ./src
COPY public ./public
COPY docs ./docs
COPY README.md ./

ENV NODE_ENV=production
ENV PORT=4177

EXPOSE 4177

CMD ["npm", "start"]
