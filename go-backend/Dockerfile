# Build stage
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o go-backend .

# Final stage
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/go-backend .
EXPOSE 5000
CMD ["./go-backend"]