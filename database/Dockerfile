FROM mongo:6.0-alpine

# Optional: Add initialization scripts
COPY init.js /docker-entrypoint-initdb.d/

EXPOSE 27017

# You can add custom MongoDB configuration if needed
# COPY mongod.conf /etc/mongod.conf

CMD ["mongod"]