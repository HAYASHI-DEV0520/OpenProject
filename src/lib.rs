use std::{
    collections::{HashMap, HashSet},
    env,
    time::Duration,
};

use reqwest::{Client, Url};
use serde::{Deserialize, Serialize};

const TIMETABLE_API_BASE: &str = "https://api.odpt.org/api/v4/odpt:TrainTimetable";
const DEFAULT_RAILWAYS: [&str; 5] = [
    "odpt.Railway:Toei.Arakawa",
    "odpt.Railway:Toei.Asakusa",
    "odpt.Railway:Toei.Mita",
    "odpt.Railway:Toei.Shinjuku",
    "odpt.Railway:Toei.NipporiToneri",
];

#[derive(Clone)]
pub struct TimetableService {
    data: Vec<TimetableRecord>,
    indexed_data: IndexedData,
    localization: Localization,
    client: Client,
}

#[derive(Clone, Default)]
struct IndexedData {
    railways: Vec<String>,
    calendar_map: HashMap<String, HashSet<String>>,
    direction_map: HashMap<String, HashSet<String>>,
    station_map: HashMap<String, Vec<ArrivalRecord>>,
    train_map: HashMap<String, TimetableRecord>,
}

#[derive(Clone, Default)]
struct Localization {
    railways: HashMap<String, String>,
    stations: HashMap<String, String>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct TimetableRecord {
    #[serde(rename = "odpt:railway")]
    railway: String,
    #[serde(rename = "odpt:calendar")]
    calendar: String,
    #[serde(rename = "odpt:railDirection")]
    rail_direction: String,
    #[serde(rename = "odpt:trainNumber")]
    train_number: String,
    #[serde(rename = "odpt:destinationStation", default)]
    destination_station: Vec<String>,
    #[serde(rename = "odpt:originStation", default)]
    origin_station: Vec<String>,
    #[serde(rename = "odpt:trainTimetableObject", default)]
    train_timetable_object: Vec<TrainStop>,
}

#[derive(Clone, Debug, Deserialize)]
struct TrainStop {
    #[serde(rename = "odpt:arrivalStation")]
    arrival_station: Option<String>,
    #[serde(rename = "odpt:departureStation")]
    departure_station: Option<String>,
    #[serde(rename = "odpt:arrivalTime")]
    arrival_time: Option<String>,
    #[serde(rename = "odpt:departureTime")]
    departure_time: Option<String>,
    #[serde(rename = "odpt:platformNumber")]
    platform_number: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RailwayMetadata {
    #[serde(rename = "dc:title")]
    dc_title: Option<String>,
    #[serde(rename = "odpt:railwayTitle")]
    railway_title: Option<LocalizedTitle>,
    #[serde(rename = "odpt:stationOrder", default)]
    station_order: Vec<StationOrder>,
}

#[derive(Debug, Deserialize)]
struct StationOrder {
    #[serde(rename = "odpt:station")]
    station: Option<String>,
    #[serde(rename = "odpt:stationTitle")]
    station_title: Option<LocalizedTitle>,
}

#[derive(Debug, Deserialize)]
struct LocalizedTitle {
    ja: Option<String>,
    en: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalizedItem {
    pub id: String,
    pub name_ja: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArrivalRecord {
    pub railway: String,
    pub calendar: String,
    pub direction: String,
    pub train_number: String,
    pub destination: String,
    pub arrival_time: String,
    pub stop_index: usize,
    pub railway_name_ja: String,
    pub destination_name_ja: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrainTimetableResponse {
    pub train_number: String,
    pub railway: String,
    pub railway_name_ja: String,
    pub calendar: String,
    pub direction: String,
    pub origin_station: String,
    pub destination_station: String,
    pub origin_station_name_ja: String,
    pub destination_station_name_ja: String,
    pub stops: Vec<TrainStopResponse>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrainStopResponse {
    pub order: usize,
    pub station: String,
    pub arrival_time: Option<String>,
    pub departure_time: Option<String>,
    pub platform_number: Option<String>,
}

impl TimetableService {
    pub fn get_default_api_urls() -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let consumer_key = env::var("ODPT_CONSUMER_KEY")
            .map_err(|_| "Missing required env var: ODPT_CONSUMER_KEY")?;

        Ok(DEFAULT_RAILWAYS
            .iter()
            .map(|railway_id| {
                format!(
                    "{TIMETABLE_API_BASE}?acl:consumerKey={}&odpt:railway={}",
                    urlencoding::encode(&consumer_key),
                    urlencoding::encode(railway_id)
                )
            })
            .collect())
    }

    pub async fn create(sources: Vec<String>) -> Result<Self, Box<dyn std::error::Error>> {
        let client = Client::builder()
            .timeout(Duration::from_secs(20))
            .user_agent("TimetableService/1.0")
            .build()?;

        let mut service = Self {
            data: Vec::new(),
            indexed_data: IndexedData::default(),
            localization: Localization::default(),
            client,
        };

        let mut results = Vec::with_capacity(sources.len());
        for source in &sources {
            results.push(
                service
                    .load_from_url::<Vec<TimetableRecord>>(source)
                    .await?,
            );
        }

        service.data = results.into_iter().flatten().collect();
        service.load_localization_data_from_sources(&sources).await;
        println!(
            "✓ Loaded {} timetable records from {} railways",
            service.data.len(),
            sources.len()
        );
        service.build_indexes();

        Ok(service)
    }

    pub fn record_count(&self) -> usize {
        self.data.len()
    }

    pub fn get_railways_localized(&self) -> Vec<LocalizedItem> {
        self.get_railways()
            .into_iter()
            .map(|id| LocalizedItem {
                name_ja: self.get_railway_name_ja(&id),
                id,
            })
            .collect()
    }

    pub fn get_stations_localized(
        &self,
        railway: &str,
        calendar: &str,
        direction: &str,
    ) -> Vec<LocalizedItem> {
        self.get_stations(railway, calendar, direction)
            .into_iter()
            .map(|id| LocalizedItem {
                name_ja: self.get_station_name_ja(&id),
                id,
            })
            .collect()
    }

    pub fn get_destination_station_localized(
        &self,
        railway: &str,
        calendar: &str,
        direction: &str,
    ) -> Option<LocalizedItem> {
        self.get_destination_station(railway, calendar, direction)
            .map(|id| LocalizedItem {
                name_ja: self.get_station_name_ja(&id),
                id,
            })
    }

    pub fn get_railways(&self) -> Vec<String> {
        self.indexed_data.railways.clone()
    }

    pub fn get_calendars(&self, railway: &str) -> Vec<String> {
        let Some(values) = self.indexed_data.calendar_map.get(railway) else {
            eprintln!("Railway not found: {railway}");
            return Vec::new();
        };

        let mut result = values.iter().cloned().collect::<Vec<_>>();
        result.sort();
        result
    }

    pub fn get_directions(&self, railway: &str, calendar: &str) -> Vec<String> {
        let key = format!("{railway}_{calendar}");
        let Some(values) = self.indexed_data.direction_map.get(&key) else {
            eprintln!("Calendar not found: {key}");
            return Vec::new();
        };

        let mut result = values.iter().cloned().collect::<Vec<_>>();
        result.sort();
        result
    }

    pub fn get_destination_station(
        &self,
        railway: &str,
        calendar: &str,
        direction: &str,
    ) -> Option<String> {
        let Some(first) = self
            .data
            .iter()
            .find(|item| {
                item.railway == railway
                    && item.calendar == calendar
                    && item.rail_direction == direction
            })
        else {
            eprintln!("Direction not found: {railway} {calendar} {direction}");
            return None;
        };

        first.destination_station.first().cloned()
    }

    pub fn get_stations(&self, railway: &str, calendar: &str, direction: &str) -> Vec<String> {
        let Some(first_timetable) = self
            .data
            .iter()
            .filter(|item| {
                item.railway == railway
                    && item.calendar == calendar
                    && item.rail_direction == direction
            })
            .max_by_key(|item| item.train_timetable_object.len())
        else {
            eprintln!("Direction not found: {railway} {calendar} {direction}");
            return Vec::new();
        };

        let mut stations = Vec::new();
        for stop in &first_timetable.train_timetable_object {
            if let Some(station) = &stop.departure_station {
                stations.push(station.clone());
            } else if let Some(station) = &stop.arrival_station {
                stations.push(station.clone());
            }
        }

        let mut seen = HashSet::new();
        stations
            .into_iter()
            .filter(|station| seen.insert(station.clone()))
            .collect()
    }

    pub fn get_trains_arriving_at_station(
        &self,
        station: &str,
        railway: Option<&str>,
        calendar: Option<&str>,
        direction: Option<&str>,
    ) -> Vec<ArrivalRecord> {
        let Some(records) = self.indexed_data.station_map.get(station) else {
            eprintln!("Station not found: {station}");
            return Vec::new();
        };

        let mut trains = records
            .iter()
            .filter(|record| railway.is_none_or(|value| record.railway == value))
            .filter(|record| calendar.is_none_or(|value| record.calendar == value))
            .filter(|record| direction.is_none_or(|value| record.direction == value))
            .cloned()
            .collect::<Vec<_>>();

        trains.sort_by(|a, b| a.arrival_time.cmp(&b.arrival_time));
        trains
    }

    pub fn get_train_arrival_time_at_station(
        &self,
        train_number: &str,
        station: &str,
    ) -> Option<String> {
        let trains = self.get_trains_arriving_at_station(station, None, None, None);
        let Some(train) = trains
            .into_iter()
            .find(|item| item.train_number == train_number)
        else {
            eprintln!("Train {train_number} does not arrive at {station}");
            return None;
        };

        Some(train.arrival_time)
    }

    pub fn get_train_timetable(&self, train_number: &str) -> Option<TrainTimetableResponse> {
        let Some(timetable) = self.indexed_data.train_map.get(train_number) else {
            eprintln!("Train not found: {train_number}");
            return None;
        };

        let stops = timetable
            .train_timetable_object
            .iter()
            .enumerate()
            .map(|(index, stop)| TrainStopResponse {
                order: index,
                station: stop
                    .departure_station
                    .clone()
                    .or_else(|| stop.arrival_station.clone())
                    .unwrap_or_default(),
                arrival_time: stop.arrival_time.clone(),
                departure_time: stop.departure_time.clone(),
                platform_number: stop.platform_number.clone(),
            })
            .collect();

        let origin_station = timetable
            .origin_station
            .first()
            .cloned()
            .unwrap_or_default();
        let destination_station = timetable
            .destination_station
            .first()
            .cloned()
            .unwrap_or_default();

        Some(TrainTimetableResponse {
            train_number: timetable.train_number.clone(),
            railway: timetable.railway.clone(),
            railway_name_ja: self.get_railway_name_ja(&timetable.railway),
            calendar: timetable.calendar.clone(),
            direction: timetable.rail_direction.clone(),
            origin_station_name_ja: self.get_station_name_ja(&origin_station),
            destination_station_name_ja: self.get_station_name_ja(&destination_station),
            origin_station,
            destination_station,
            stops,
        })
    }

    async fn load_localization_data_from_sources(&mut self, sources: &[String]) {
        let mut railway_ids = HashSet::new();
        let mut consumer_key = None;

        for source in sources {
            if let Ok(source_url) = Url::parse(source) {
                if let Some(railway_id) = source_url
                    .query_pairs()
                    .find_map(|(key, value)| (key == "odpt:railway").then(|| value.into_owned()))
                {
                    railway_ids.insert(railway_id);
                }

                if consumer_key.is_none() {
                    consumer_key = source_url.query_pairs().find_map(|(key, value)| {
                        (key == "acl:consumerKey").then(|| value.into_owned())
                    });
                }
            }
        }

        let Some(consumer_key) = consumer_key else {
            return;
        };

        if railway_ids.is_empty() {
            return;
        }

        for railway_id in railway_ids {
            let metadata_url = format!(
                "https://api.odpt.org/api/v4/odpt:Railway?acl:consumerKey={}&owl:sameAs={}",
                urlencoding::encode(&consumer_key),
                urlencoding::encode(&railway_id)
            );

            match self
                .load_from_url::<Vec<RailwayMetadata>>(&metadata_url)
                .await
            {
                Ok(records) if !records.is_empty() => {
                    let railway = &records[0];
                    let railway_title = railway
                        .dc_title
                        .clone()
                        .or_else(|| {
                            railway
                                .railway_title
                                .as_ref()
                                .and_then(|value| value.ja.clone())
                        })
                        .unwrap_or_else(|| railway_id.clone());
                    self.localization
                        .railways
                        .insert(railway_id.clone(), railway_title);

                    for station_info in &railway.station_order {
                        let Some(station_id) = &station_info.station else {
                            continue;
                        };

                        let station_title = station_info
                            .station_title
                            .as_ref()
                            .and_then(|value| value.ja.clone().or_else(|| value.en.clone()));

                        if let Some(title) = station_title {
                            self.localization.stations.insert(station_id.clone(), title);
                        }
                    }
                }
                Ok(_) => {}
                Err(err) => {
                    eprintln!("Failed to load localization for {railway_id}: {err}");
                }
            }
        }
    }

    async fn load_from_url<T>(&self, url: &str) -> Result<T, Box<dyn std::error::Error>>
    where
        T: for<'de> Deserialize<'de>,
    {
        let response = self.client.get(url).send().await?;
        let status = response.status();

        if !status.is_success() {
            return Err(format!("Request Failed. Status Code: {status}").into());
        }

        Ok(response.json::<T>().await?)
    }

    fn build_indexes(&mut self) {
        let mut railway_set = HashSet::new();
        let mut calendar_map = HashMap::new();
        let mut direction_map = HashMap::new();
        let mut station_map: HashMap<String, Vec<ArrivalRecord>> = HashMap::new();
        let mut train_map = HashMap::new();

        for timetable in &self.data {
            railway_set.insert(timetable.railway.clone());

            calendar_map
                .entry(timetable.railway.clone())
                .or_insert_with(HashSet::new)
                .insert(timetable.calendar.clone());

            let key = format!("{}_{}", timetable.railway, timetable.calendar);
            direction_map
                .entry(key)
                .or_insert_with(HashSet::new)
                .insert(timetable.rail_direction.clone());

            train_map.insert(timetable.train_number.clone(), timetable.clone());

            let destination = timetable
                .destination_station
                .first()
                .cloned()
                .unwrap_or_default();

            for (index, stop) in timetable.train_timetable_object.iter().enumerate() {
                if let (Some(station), Some(arrival_time)) =
                    (&stop.arrival_station, &stop.arrival_time)
                {
                    station_map
                        .entry(station.clone())
                        .or_default()
                        .push(ArrivalRecord {
                            railway: timetable.railway.clone(),
                            calendar: timetable.calendar.clone(),
                            direction: timetable.rail_direction.clone(),
                            train_number: timetable.train_number.clone(),
                            destination: destination.clone(),
                            arrival_time: arrival_time.clone(),
                            stop_index: index,
                            railway_name_ja: self.get_railway_name_ja(&timetable.railway),
                            destination_name_ja: self.get_station_name_ja(&destination),
                        });
                }
            }
        }

        let mut railways = railway_set.into_iter().collect::<Vec<_>>();
        railways.sort();

        self.indexed_data = IndexedData {
            railways,
            calendar_map,
            direction_map,
            station_map,
            train_map,
        };
    }

    fn get_railway_name_ja(&self, railway_id: &str) -> String {
        self.localization
            .railways
            .get(railway_id)
            .cloned()
            .unwrap_or_else(|| railway_id.to_string())
    }

    fn get_station_name_ja(&self, station_id: &str) -> String {
        self.localization
            .stations
            .get(station_id)
            .cloned()
            .unwrap_or_else(|| station_id.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn service_from_records(records: Vec<TimetableRecord>) -> TimetableService {
        let client = Client::builder().build().expect("client");
        let mut service = TimetableService {
            data: records,
            indexed_data: IndexedData::default(),
            localization: Localization {
                railways: HashMap::from([(
                    "odpt.Railway:Toei.Asakusa".to_string(),
                    "都営浅草線".to_string(),
                )]),
                stations: HashMap::from([
                    (
                        "odpt.Station:Toei.Asakusa.Sengakuji".to_string(),
                        "泉岳寺".to_string(),
                    ),
                    (
                        "odpt.Station:Toei.Asakusa.Daimon".to_string(),
                        "大門".to_string(),
                    ),
                    (
                        "odpt.Station:Toei.Asakusa.NishiMagome".to_string(),
                        "西馬込".to_string(),
                    ),
                ]),
            },
            client,
        };
        service.build_indexes();
        service
    }

    fn sample_record(train_number: &str, arrival_time: &str) -> TimetableRecord {
        serde_json::from_value(json!({
            "odpt:railway": "odpt.Railway:Toei.Asakusa",
            "odpt:calendar": "odpt.Calendar:Weekday",
            "odpt:railDirection": "odpt.RailDirection:Southbound",
            "odpt:trainNumber": train_number,
            "odpt:originStation": ["odpt.Station:Toei.Asakusa.Sengakuji"],
            "odpt:destinationStation": ["odpt.Station:Toei.Asakusa.NishiMagome"],
            "odpt:trainTimetableObject": [
                {
                    "odpt:departureStation": "odpt.Station:Toei.Asakusa.Sengakuji",
                    "odpt:departureTime": "07:00"
                },
                {
                    "odpt:arrivalStation": "odpt.Station:Toei.Asakusa.Daimon",
                    "odpt:arrivalTime": arrival_time,
                    "odpt:departureTime": "07:11",
                    "odpt:platformNumber": "1"
                }
            ]
        }))
        .expect("sample record")
    }

    #[test]
    fn builds_indexes_and_localized_queries() {
        let service = service_from_records(vec![
            sample_record("726T", "07:10"),
            sample_record("730T", "07:30"),
        ]);

        assert_eq!(
            service.get_railways_localized(),
            vec![LocalizedItem {
                id: "odpt.Railway:Toei.Asakusa".to_string(),
                name_ja: "都営浅草線".to_string(),
            }]
        );
        assert_eq!(
            service.get_calendars("odpt.Railway:Toei.Asakusa"),
            vec!["odpt.Calendar:Weekday".to_string()]
        );
        assert_eq!(
            service.get_directions("odpt.Railway:Toei.Asakusa", "odpt.Calendar:Weekday"),
            vec!["odpt.RailDirection:Southbound".to_string()]
        );
        assert_eq!(
            service.get_destination_station_localized(
                "odpt.Railway:Toei.Asakusa",
                "odpt.Calendar:Weekday",
                "odpt.RailDirection:Southbound"
            ),
            Some(LocalizedItem {
                id: "odpt.Station:Toei.Asakusa.NishiMagome".to_string(),
                name_ja: "西馬込".to_string(),
            })
        );
    }

    #[test]
    fn returns_station_trains_and_timetable() {
        let service = service_from_records(vec![
            sample_record("730T", "07:30"),
            sample_record("726T", "07:10"),
        ]);

        let trains = service.get_trains_arriving_at_station(
            "odpt.Station:Toei.Asakusa.Daimon",
            Some("odpt.Railway:Toei.Asakusa"),
            Some("odpt.Calendar:Weekday"),
            Some("odpt.RailDirection:Southbound"),
        );
        assert_eq!(trains.len(), 2);
        assert_eq!(trains[0].train_number, "726T");
        assert_eq!(trains[0].arrival_time, "07:10");
        assert_eq!(trains[0].destination_name_ja, "西馬込");

        let stations = service.get_stations(
            "odpt.Railway:Toei.Asakusa",
            "odpt.Calendar:Weekday",
            "odpt.RailDirection:Southbound",
        );
        assert_eq!(
            stations,
            vec![
                "odpt.Station:Toei.Asakusa.Sengakuji".to_string(),
                "odpt.Station:Toei.Asakusa.Daimon".to_string()
            ]
        );

        assert_eq!(
            service.get_train_arrival_time_at_station("726T", "odpt.Station:Toei.Asakusa.Daimon"),
            Some("07:10".to_string())
        );

        let timetable = service.get_train_timetable("726T").expect("timetable");
        assert_eq!(timetable.origin_station_name_ja, "泉岳寺");
        assert_eq!(timetable.destination_station_name_ja, "西馬込");
        assert_eq!(timetable.stops.len(), 2);
        assert_eq!(
            timetable.stops[1].station,
            "odpt.Station:Toei.Asakusa.Daimon"
        );
    }
}
