FROM rust:latest

WORKDIR /app

COPY . .

RUN cargo install --path .

EXPOSE 3000

CMD ["timetable-reader"]
