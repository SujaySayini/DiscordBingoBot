FROM node:current-buster
WORKDIR /usr/src/app

COPY main.js .
COPY credentials.json .
COPY squares.txt .
COPY package.json .
RUN npm install
CMD ["node", "main.js"]