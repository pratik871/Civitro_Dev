FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY pkg/ ./pkg/
COPY services/admin/ ./services/admin/
WORKDIR /app/services/admin
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/admin ./cmd/main.go

FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/bin/admin .
EXPOSE 8018 50068
CMD ["./admin"]
