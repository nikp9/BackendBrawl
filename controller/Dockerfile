# Use newer Go version (replace 1.24 with your required version)
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Enable Go modules
ENV GO111MODULE=on

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/main

FROM alpine:3.18
WORKDIR /app
COPY --from=builder /app/main /app/main
EXPOSE $PORT
CMD ["/app/main"]