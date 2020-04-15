FROM node:10

# Create app directory
WORKDIR /usr/src/meet-queue

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

#RUN npm install
RUN npm ci --only=production
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . /usr/src/meet-queue

RUN npm run tsc

EXPOSE 80:3000

CMD [ "node", "./dist/bin/www.js" ]

#tsc && node dist/bin/www.js