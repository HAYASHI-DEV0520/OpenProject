use std::{env, net::SocketAddr, path::PathBuf, sync::Arc};

use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::StatusCode,
    response::{Html, IntoResponse},
    routing::get,
};
use tower_http::services::ServeDir;

use timetable_reader::TimetableService;

#[derive(Clone)]
struct AppState {
    timetable: Arc<TimetableService>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    let api_urls = TimetableService::get_default_api_urls()?;
    let timetable = Arc::new(TimetableService::create(api_urls).await?);
    let state = AppState { timetable };

    let public_dir = PathBuf::from("app/public");
    let serve_dir = ServeDir::new(public_dir);

    let app = Router::new()
        .route("/", get(index))
        .route("/api/status", get(status))
        .route("/api/railways", get(railways))
        .route("/api/calendars", get(calendars))
        .route("/api/directions", get(directions))
        .route("/api/destination", get(destination))
        .route("/api/stations", get(stations))
        .route("/api/trains", get(trains))
        .route("/api/train", get(train))
        .route("/api/trainArrival", get(train_arrival))
        .route("/api/{*path}", get(api_not_found))
        .fallback_service(serve_dir)
        .with_state(state);

    let port = env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(3000);
    let address = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(address).await?;

    println!("Web server running at http://0.0.0.0:{port}");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };

    #[cfg(unix)]
    let terminate = async {
        use tokio::signal::unix::{SignalKind, signal};

        if let Ok(mut stream) = signal(SignalKind::terminate()) {
            let _ = stream.recv().await;
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}

async fn index() -> impl IntoResponse {
    match tokio::fs::read("app/public/index.html").await {
        Ok(contents) => (
            StatusCode::OK,
            [(axum::http::header::CONTENT_TYPE, "text/html; charset=utf-8")],
            Html(String::from_utf8_lossy(&contents).into_owned()),
        )
            .into_response(),
        Err(_) => (StatusCode::NOT_FOUND, "Not found").into_response(),
    }
}

async fn status(State(state): State<AppState>) -> impl IntoResponse {
    Json(serde_json::json!({
        "loaded": true,
        "records": state.timetable.record_count()
    }))
}

async fn railways(State(state): State<AppState>) -> impl IntoResponse {
    Json(state.timetable.get_railways_localized())
}

async fn calendars(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    Json(
        state.timetable.get_calendars(
            params
                .get("railway")
                .map(String::as_str)
                .unwrap_or_default(),
        ),
    )
}

async fn directions(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    Json(
        state.timetable.get_directions(
            params
                .get("railway")
                .map(String::as_str)
                .unwrap_or_default(),
            params
                .get("calendar")
                .map(String::as_str)
                .unwrap_or_default(),
        ),
    )
}

async fn destination(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    Json(
        state.timetable.get_destination_station_localized(
            params
                .get("railway")
                .map(String::as_str)
                .unwrap_or_default(),
            params
                .get("calendar")
                .map(String::as_str)
                .unwrap_or_default(),
            params
                .get("direction")
                .map(String::as_str)
                .unwrap_or_default(),
        ),
    )
}

async fn stations(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    Json(
        state.timetable.get_stations_localized(
            params
                .get("railway")
                .map(String::as_str)
                .unwrap_or_default(),
            params
                .get("calendar")
                .map(String::as_str)
                .unwrap_or_default(),
            params
                .get("direction")
                .map(String::as_str)
                .unwrap_or_default(),
        ),
    )
}

async fn trains(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    Json(
        state.timetable.get_trains_arriving_at_station(
            params
                .get("station")
                .map(String::as_str)
                .unwrap_or_default(),
            params.get("railway").map(String::as_str),
            params.get("calendar").map(String::as_str),
            params.get("direction").map(String::as_str),
        ),
    )
}

async fn train(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    Json(
        state.timetable.get_train_timetable(
            params
                .get("trainId")
                .map(String::as_str)
                .unwrap_or_default(),
        ),
    )
}

async fn train_arrival(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    Json(
        state.timetable.get_train_arrival_time_at_station(
            params
                .get("trainId")
                .map(String::as_str)
                .unwrap_or_default(),
            params
                .get("station")
                .map(String::as_str)
                .unwrap_or_default(),
        ),
    )
}

async fn api_not_found(Path(_): Path<String>) -> impl IntoResponse {
    (StatusCode::NOT_FOUND, "API endpoint not found")
}
