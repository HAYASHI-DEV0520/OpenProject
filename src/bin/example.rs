use timetable_reader::TimetableService;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    let api_urls = TimetableService::get_default_api_urls()?;
    let timetable = TimetableService::create(api_urls).await?;

    println!("\n=== 線路のリスト ===");
    let railways = timetable.get_railways();
    println!("利用可能な線路: {}個", railways.len());
    for railway in railways.iter().take(5) {
        println!("  - {railway}");
    }
    if railways.len() > 5 {
        println!("  ... 他 {}個", railways.len() - 5);
    }

    let railway = railways.get(1).cloned().unwrap_or_default();
    println!("\n=== {railway} のカレンダータイプ ===");
    let calendars = timetable.get_calendars(&railway);
    for calendar in &calendars {
        println!("  - {calendar}");
    }

    let calendar = calendars.get(1).cloned().unwrap_or_default();
    println!("\n=== {railway} / {calendar} の方向 ===");
    let directions = timetable.get_directions(&railway, &calendar);
    for direction in &directions {
        println!("  - {direction}");
    }

    let direction = directions.first().cloned().unwrap_or_default();
    println!("\n=== {railway} / {calendar} / {direction} の情報 ===");
    let destination = timetable
        .get_destination_station(&railway, &calendar, &direction)
        .unwrap_or_default();
    println!("終着駅: {destination}");

    let stations = timetable.get_stations(&railway, &calendar, &direction);
    println!("\n停車駅 ({}駅):", stations.len());
    for station in stations.iter().take(5) {
        println!("  - {station}");
    }
    if stations.len() > 5 {
        println!("  ... 他 {}駅", stations.len() - 5);
    }

    let first_station = stations.first().cloned().unwrap_or_default();
    println!("\n=== {first_station} での到着列車 ===");
    let trains_at_station =
        timetable.get_trains_arriving_at_station(&first_station, None, None, None);
    for train in trains_at_station.iter().take(5) {
        println!(
            "  列車 {}: {} ({} {})",
            train.train_number, train.arrival_time, train.railway, train.calendar
        );
    }
    if trains_at_station.len() > 5 {
        println!("  ... 他 {}本", trains_at_station.len() - 5);
    }

    if let Some(first_train_number) = trains_at_station
        .first()
        .map(|train| train.train_number.clone())
    {
        println!("\n=== 列車 {first_train_number} の全ルート ===");
        if let Some(train_timetable) = timetable.get_train_timetable(&first_train_number) {
            println!("線路: {}", train_timetable.railway);
            println!("カレンダー: {}", train_timetable.calendar);
            println!("方向: {}", train_timetable.direction);
            println!("起点: {}", train_timetable.origin_station);
            println!("終点: {}", train_timetable.destination_station);
            println!("\n停車駅:");
            for stop in train_timetable.stops {
                let time = stop
                    .departure_time
                    .or(stop.arrival_time)
                    .unwrap_or_else(|| "---".to_string());
                println!("  {:>2}: {} {}", stop.order, time, stop.station);
            }
        }

        if let Some(test_station) = stations.get(1) {
            let arrival_time = timetable
                .get_train_arrival_time_at_station(&first_train_number, test_station)
                .unwrap_or_default();
            println!(
                "\n列車 {} が {} に到着する時間: {}",
                first_train_number, test_station, arrival_time
            );
        }
    }

    Ok(())
}
