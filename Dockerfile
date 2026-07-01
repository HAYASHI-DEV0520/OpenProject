FROM rust:latest

WORKDIR /app

COPY . .

CMD ["/app/target/release/timetable-reader"]
