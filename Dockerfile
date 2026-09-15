# Match package.json's supported Node 22 range (>=22.23.1) while retaining the
# minimum required by the Cognite CLI.
FROM node:22.23.1-bookworm

RUN npm install -g npm@11.10.0

WORKDIR /workspace
