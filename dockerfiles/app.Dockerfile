# Use a more compatible Node.js runtime as the base image
FROM node:18-slim

# The node image includes a non-root "node" user we'll use for security.
# Set the working directory.
WORKDIR /usr/src/app

# Change ownership of the app directory to the "node" user.
RUN chown -R node:node /usr/src/app

# Switch to the non-root "node" user.
USER node

# Copy package files and install dependencies.
# This is done in a separate step to leverage Docker's layer cache.
COPY package*.json ./
RUN npm install

# Copy the rest of the application code.
COPY . .

# Expose the port the app runs on.
EXPOSE 3000

# Define the command to run the application.
CMD ["npm", "start"] 