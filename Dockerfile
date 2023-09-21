# Generates the required models from the openapi json file
FROM openapitools/openapi-generator-cli:v6.6.0 as api-generator
WORKDIR /generator
COPY ./react-app/resources/bff.json /generator
RUN ["java", "-jar", "/opt/openapi-generator/modules/openapi-generator-cli/target/openapi-generator-cli.jar", "generate", "-i", "bff.json", "-g", "typescript-fetch", "-o", "./generated", "--additional-properties=typescriptThreePlus=true"]

# Build the application using the generated api
FROM node:20.4.0-alpine as build
WORKDIR /app
COPY ./react-app /app
COPY --from=api-generator /generator/generated ./src/generated 
RUN npm install
RUN npm run build

# Download and build our environment injector
FROM golang:1.19.3-alpine3.16 as go-downloader
RUN apk update && apk upgrade && apk add --no-cache bash git openssh
RUN go install github.com/lithictech/runtime-js-env@latest

# Copy the built application into Nginx for serving
FROM nginx:alpine3.17
COPY --from=build /app/build /usr/share/nginx/html
COPY --from=go-downloader /go/bin/runtime-js-env /
COPY ./react-app/nginx/nginx.conf /usr/share/nginx/nginx.conf
COPY ./react-app/nginx/mime.types /usr/share/nginx/mime.types
RUN rm /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh
RUN mkdir -p /var/cache/nginx/
RUN chmod 777 /var/cache/nginx/
EXPOSE 80
CMD /runtime-js-env -i usr/share/nginx/html/index.html && \
    chmod 777 /usr/share/nginx/html/index.html &&\
    envsubst  '$REACT_APP_BFF_BASE_URL' < /usr/share/nginx/nginx.conf > /tmp/nginx.conf &&\
    mv /tmp/nginx.conf /usr/share/nginx/nginx.conf &&\
    cp -R /usr/share/nginx/* /etc/nginx/ &&\
    nginx -g "daemon off;"
