---
name: build
description: Build the deployable Spring Boot jar, skipping tests for speed.
---

Build the backend project for deployment:

1. Run `cd backend_java && mvn clean package -DskipTests`
2. Verify the jar was produced at `bootstrap/target/tron-java-bootstrap-1.0-SNAPSHOT.jar`
3. Report the jar size and build result (SUCCESS/FAILURE).

If the build fails, read the Maven output, identify the compilation or packaging error, and suggest a fix.
