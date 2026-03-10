FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY pkg/ ./pkg/
COPY services/party/ ./services/party/
WORKDIR /app/services/party
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/party ./cmd/main.go

FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/bin/party .
EXPOSE 8019 50069
CMD ["./party"]
