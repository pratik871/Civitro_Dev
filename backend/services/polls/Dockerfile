FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY pkg/ ./pkg/
COPY services/polls/go.mod services/polls/go.sum ./services/polls/
WORKDIR /app/services/polls
RUN go mod download

COPY services/polls/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o /polls ./cmd/main.go

FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /polls .

EXPOSE 8013 50063

CMD ["./polls"]
