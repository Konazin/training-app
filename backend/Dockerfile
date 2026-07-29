FROM maven:3.9.11-eclipse-temurin-21-alpine AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline
COPY src src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S training && adduser -S training -G training
WORKDIR /app
COPY --from=build /build/target/training-api-0.1.0.jar app.jar
USER training
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar", "--spring.profiles.active=prod"]
