FROM rust:latest

WORKDIR /app

COPY . .

RUN cargo build --bin timetable-reader --release

EXPOSE 3000

CMD ["/app/target/release/timetable-reader"]
