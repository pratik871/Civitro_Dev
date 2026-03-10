FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY pkg/ ./pkg/
COPY services/notifications/ ./services/notifications/
WORKDIR /app/services/notifications
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/notifications ./cmd/main.go

FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/bin/notifications .
EXPOSE 8017 50067
CMD ["./notifications"]
