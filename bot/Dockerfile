FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY dist/ ./dist/
USER node
CMD ["node", "--no-deprecation", "dist/bot.js"]
