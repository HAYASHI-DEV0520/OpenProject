const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const TimetableService = require('./timetableService');

const API_URL = 'https://api-public.odpt.org/api/v4/odpt:TrainTimetable?odpt:operator=odpt.Operator:Toei';
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;
let timetable;

async function startServer() {
  try {
    timetable = await TimetableService.create(API_URL);
    const server = http.createServer(requestHandler);
    server.listen(PORT, () => {
      console.log(`Web server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

function requestHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === '/' || pathname === '/index.html') {
    return serveStatic('index.html', res);
  }

  if (pathname.startsWith('/api/')) {
    return handleApiRequest(url, res);
  }

  return serveStatic(pathname.slice(1), res);
}

function serveStatic(relativePath, res) {
  const filePath = path.join(PUBLIC_DIR, relativePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendText(res, 400, 'Invalid path');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      return sendText(res, 404, 'Not found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = mimeType(ext);
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

function mimeType(ext) {
  switch (ext) {
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.html': return 'text/html; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

async function handleApiRequest(url, res) {
  try {
    const pathname = url.pathname;
    const searchParams = url.searchParams;

    let result;

    switch (pathname) {
      case '/api/railways':
        result = timetable.getRailways();
        break;
      case '/api/calendars':
        result = timetable.getCalendars(searchParams.get('railway'));
        break;
      case '/api/directions':
        result = timetable.getDirections(
          searchParams.get('railway'),
          searchParams.get('calendar')
        );
        break;
      case '/api/destination':
        result = timetable.getDestinationStation(
          searchParams.get('railway'),
          searchParams.get('calendar'),
          searchParams.get('direction')
        );
        break;
      case '/api/stations':
        result = timetable.getStations(
          searchParams.get('railway'),
          searchParams.get('calendar'),
          searchParams.get('direction')
        );
        break;
      case '/api/trains':
        result = timetable.getTrainsArrivingAtStation(searchParams.get('station'));
        break;
      case '/api/train':
        result = timetable.getTrainTimetable(searchParams.get('trainNumber'));
        break;
      case '/api/trainArrival':
        result = timetable.getTrainArrivalTimeAtStation(
          searchParams.get('trainNumber'),
          searchParams.get('station')
        );
        break;
      case '/api/status':
        result = { loaded: Boolean(timetable), records: timetable?.data?.length || 0 };
        break;
      default:
        return sendText(res, 404, 'API endpoint not found');
    }

    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

startServer();
