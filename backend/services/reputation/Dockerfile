FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY ../../pkg ./pkg
COPY services/reputation/go.mod services/reputation/go.sum ./services/reputation/
WORKDIR /app/services/reputation
RUN go mod download

COPY services/reputation/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o /reputation ./cmd/main.go

FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /reputation .

EXPOSE 8012 50062

CMD ["./reputation"]
