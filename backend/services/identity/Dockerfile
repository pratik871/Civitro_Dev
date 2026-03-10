# Stage 1: Build
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Copy shared packages
COPY pkg/ /app/pkg/

# Copy service source
COPY services/identity/ /app/services/identity/

WORKDIR /app/services/identity

RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /identity ./cmd/main.go

# Stage 2: Run
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /identity /usr/local/bin/identity

EXPOSE 8001 50051

ENTRYPOINT ["identity"]
