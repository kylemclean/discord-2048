FROM node:latest

# To build canvas npm package
RUN apt-get update && yes | apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

ENV NODE_ENV production

COPY package.json package-lock.json ./

RUN npm ci

RUN npm run build

COPY . .

CMD npm start
