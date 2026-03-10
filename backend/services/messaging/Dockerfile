FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY ../../pkg ./pkg
COPY services/messaging/go.mod services/messaging/go.sum ./services/messaging/
WORKDIR /app/services/messaging
RUN go mod download

COPY services/messaging/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o /messaging ./cmd/main.go

FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /messaging .

EXPOSE 8014 50064

CMD ["./messaging"]
