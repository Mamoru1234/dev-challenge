FROM node:20

WORKDIR /usr/app

ADD package*.json .

RUN npm ci

ADD .eslintrc.js .prettierrc nest-cli.json tsconfig.build.json tsconfig.json .

ADD ./src ./src

ADD ./test ./test
