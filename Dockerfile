FROM rust:latest AS builder

WORKDIR /app
COPY . .

RUN cargo build --release --bin timetable-reader

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/timetable-reader /usr/local/bin/timetable-reader
COPY --from=builder /app/app/public ./app/public

EXPOSE 3000

CMD ["timetable-reader"]
