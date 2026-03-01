FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

# Build the TypeScript code so the "dist" directory is created!
RUN npm run build

EXPOSE 8080

# Run the production start script (which now migrates DB, then starts Node)
CMD ["npm", "start"]