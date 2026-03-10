# Stage 1: Build
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Copy shared packages
COPY pkg/ /app/pkg/

# Copy service source
COPY services/issues/ /app/services/issues/

WORKDIR /app/services/issues

RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /issues ./cmd/main.go

# Stage 2: Run
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /issues /usr/local/bin/issues

EXPOSE 8005 50055

ENTRYPOINT ["issues"]
