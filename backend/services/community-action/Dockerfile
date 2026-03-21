# Stage 1: Build
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Copy shared packages
COPY pkg/ /app/pkg/

# Copy service source
COPY services/community-action/ /app/services/community-action/

WORKDIR /app/services/community-action

RUN go mod tidy && go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /community-action ./cmd/main.go

# Stage 2: Run
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /community-action /usr/local/bin/community-action

EXPOSE 8022 50072

ENTRYPOINT ["community-action"]
