FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY pkg/ ./pkg/
COPY services/rating/go.mod services/rating/go.sum ./services/rating/
WORKDIR /app/services/rating
RUN go mod download

COPY services/rating/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o /rating ./cmd/main.go

FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /rating .

EXPOSE 8007 50057

CMD ["./rating"]
