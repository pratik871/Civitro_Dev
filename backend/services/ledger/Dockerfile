FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY ../../pkg ./pkg
COPY services/ledger/go.mod services/ledger/go.sum ./services/ledger/
WORKDIR /app/services/ledger
RUN go mod download

COPY services/ledger/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o /ledger ./cmd/main.go

FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /ledger .

EXPOSE 8006 50056

CMD ["./ledger"]
