FROM rust:latest

WORKDIR /app

COPY . .

RUN cargo build --bin timetable-reader --release

CMD ["/app/target/release/timetable-reader"]
