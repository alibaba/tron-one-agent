FROM alibaba-cloud-linux-3-registry.cn-hangzhou.cr.aliyuncs.com/alinux3/alinux3
LABEL MAINTAINER=tron

EXPOSE 8080

RUN yum install -y java-17-openjdk

RUN mkdir /app
WORKDIR /app

COPY bootstrap/target/tron-java-bootstrap-1.0-SNAPSHOT.jar /app
COPY skills /app/skills

ENV TZ="Asia/Shanghai"
ENV ENV=PROD

USER root
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/tron-java-bootstrap-1.0-SNAPSHOT.jar"]