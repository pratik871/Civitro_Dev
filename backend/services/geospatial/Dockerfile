# Stage 1: Build
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Copy shared packages
COPY pkg/ /app/pkg/

# Copy service source
COPY services/geospatial/ /app/services/geospatial/

WORKDIR /app/services/geospatial

RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /geospatial ./cmd/main.go

# Stage 2: Run
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /geospatial /usr/local/bin/geospatial

EXPOSE 8002 50052

ENTRYPOINT ["geospatial"]
