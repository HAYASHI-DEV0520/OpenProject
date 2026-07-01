FROM rust:latest

WORKDIR /app

COPY . .

CMD ["CMD ["/app/target/release/timetable-reader"]"]
