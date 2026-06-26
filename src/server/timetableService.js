const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const DEFAULT_CONSUMER_KEY = process.env.ODPT_CONSUMER_KEY;
const TIMETABLE_API_BASE = 'https://api.odpt.org/api/v4/odpt:TrainTimetable';
const DEFAULT_RAILWAYS = [
  'odpt.Railway:Toei.Arakawa',
  'odpt.Railway:Toei.Asakusa',
  'odpt.Railway:Toei.Mita',
  'odpt.Railway:Toei.Shinjuku',
  'odpt.Railway:Toei.NipporiToneri'
];

class TimetableService {
  constructor(source) {
    this.source = source;
    this.data = null;
    this.indexedData = {};
    this.localization = {
      railways: {},
      stations: {}
    };
  }

  static getDefaultApiUrls() {
    const consumerKey = process.env.ODPT_CONSUMER_KEY || DEFAULT_CONSUMER_KEY;
    return DEFAULT_RAILWAYS.map(
      (railwayId) => `${TIMETABLE_API_BASE}?acl:consumerKey=${encodeURIComponent(consumerKey)}&odpt:railway=${encodeURIComponent(railwayId)}`
    );
  }

  static async create(source) {
    if (Array.isArray(source)) {
      return TimetableService.createMulti(source);
    }
    const service = new TimetableService(source);
    await service.load();
    return service;
  }

  static async createMulti(sources) {
    const service = new TimetableService(null);
    const results = await Promise.all(sources.map(s => service.loadFromUrl(s)));
    service.data = results.flat();
    await service.loadLocalizationDataFromSources(sources);
    console.log(`✓ Loaded ${service.data.length} timetable records from ${sources.length} railways`);
    service.buildIndexes();
    return service;
  }

  isRemoteSource() {
    try {
      const parsed = new URL(this.source);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (err) {
      return false;
    }
  }

  async load() {
    try {
      if (this.isRemoteSource()) {
        this.data = await this.loadFromUrl(this.source);
        await this.loadLocalizationDataFromSources([this.source]);
      } else {
        this.data = this.loadFromFile(this.source);
      }
      console.log(`✓ Loaded ${this.data.length} timetable records from ${this.source}`);
      this.buildIndexes();
    } catch (err) {
      console.error('Error loading timetable data:', err.message);
      throw err;
    }
  }

  async loadLocalizationDataFromSources(sources) {
    const railwayIds = new Set();
    let consumerKey = null;

    sources.forEach((source) => {
      try {
        const sourceUrl = new URL(source);
        const railwayId = sourceUrl.searchParams.get('odpt:railway');
        const sourceKey = sourceUrl.searchParams.get('acl:consumerKey');
        if (railwayId) {
          railwayIds.add(railwayId);
        }
        if (!consumerKey && sourceKey) {
          consumerKey = sourceKey;
        }
      } catch (err) {
        // Ignore invalid source URLs for localization metadata lookup.
      }
    });

    if (!consumerKey || railwayIds.size === 0) {
      return;
    }

    const metadataRequests = Array.from(railwayIds).map((railwayId) => {
      const metadataUrl = `https://api.odpt.org/api/v4/odpt:Railway?acl:consumerKey=${encodeURIComponent(consumerKey)}&owl:sameAs=${encodeURIComponent(railwayId)}`;
      return this.loadFromUrl(metadataUrl)
        .then((records) => ({ railwayId, records }))
        .catch((err) => {
          console.warn(`Failed to load localization for ${railwayId}: ${err.message}`);
          return null;
        });
    });

    const metadataResults = await Promise.all(metadataRequests);

    metadataResults.forEach((item) => {
      if (!item || !Array.isArray(item.records) || item.records.length === 0) {
        return;
      }

      const railway = item.records[0];
      const railwayTitle = railway['dc:title'] || railway['odpt:railwayTitle']?.ja || item.railwayId;
      this.localization.railways[item.railwayId] = railwayTitle;

      const stationOrder = railway['odpt:stationOrder'] || [];
      stationOrder.forEach((stationInfo) => {
        const stationId = stationInfo['odpt:station'];
        const stationTitle = stationInfo['odpt:stationTitle']?.ja || stationInfo['odpt:stationTitle']?.en;
        if (stationId && stationTitle) {
          this.localization.stations[stationId] = stationTitle;
        }
      });
    });
  }

  getRailwayNameJa(railwayId) {
    return this.localization.railways[railwayId] || railwayId;
  }

  getStationNameJa(stationId) {
    return this.localization.stations[stationId] || stationId;
  }

  getRailwaysLocalized() {
    return this.getRailways().map((id) => ({
      id,
      nameJa: this.getRailwayNameJa(id)
    }));
  }

  getStationsLocalized(railway, calendar, direction) {
    return this.getStations(railway, calendar, direction).map((id) => ({
      id,
      nameJa: this.getStationNameJa(id)
    }));
  }

  getDestinationStationLocalized(railway, calendar, direction) {
    const id = this.getDestinationStation(railway, calendar, direction);
    if (!id) {
      return null;
    }

    return {
      id,
      nameJa: this.getStationNameJa(id)
    };
  }

  loadFromFile(filePath) {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData);
  }

  loadFromUrl(urlString) {
    return new Promise((resolve, reject) => {
      const url = new URL(urlString);
      const client = url.protocol === 'https:' ? https : http;

      const request = client.get(url, { headers: { 'User-Agent': 'TimetableService/1.0' } }, (res) => {
        const { statusCode } = res;
        const contentType = res.headers['content-type'] || '';

        if (statusCode !== 200) {
          res.resume();
          return reject(new Error(`Request Failed. Status Code: ${statusCode}`));
        }

        let rawData = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            resolve(parsed);
          } catch (err) {
            reject(new Error(`Failed to parse JSON: ${err.message}`));
          }
        });
      });

      request.on('error', (err) => {
        reject(err);
      });

      request.on('timeout', () => {
        request.abort();
        reject(new Error('Request timed out'));
      });

      request.setTimeout(20000);
    });
  }

  // インデックスを構築（高速クエリ用）
  buildIndexes() {
    const railwaySet = new Set();
    const calendarMap = {}; // railway -> Set<calendar>
    const directionMap = {}; // railway_calendar -> Set<direction>
    const stationMap = {}; // station -> [{railway, calendar, direction, arrivalTime, trainNumber}, ...]
    const trainMap = {}; // trainNumber -> timetable object

    this.data.forEach((timetable) => {
      const railway = timetable['odpt:railway'];
      const calendar = timetable['odpt:calendar'];
      const direction = timetable['odpt:railDirection'];
      const trainNumber = timetable['odpt:trainNumber'];
      const destination = timetable['odpt:destinationStation'][0];

      railwaySet.add(railway);

      // Calendar map
      if (!calendarMap[railway]) {
        calendarMap[railway] = new Set();
      }
      calendarMap[railway].add(calendar);

      // Direction map
      const key = `${railway}_${calendar}`;
      if (!directionMap[key]) {
        directionMap[key] = new Set();
      }
      directionMap[key].add(direction);

      // Train map
      trainMap[trainNumber] = timetable;

      // Station map - 各駅の到着時間を記録
      const stops = timetable['odpt:trainTimetableObject'];
      stops.forEach((stop, index) => {
        if (stop['odpt:arrivalStation']) {
          const station = stop['odpt:arrivalStation'];
          if (!stationMap[station]) {
            stationMap[station] = [];
          }
          stationMap[station].push({
            railway,
            calendar,
            direction,
            trainNumber,
            destination,
            arrivalTime: stop['odpt:arrivalTime'],
            stopIndex: index
          });
        }
      });
    });

    this.indexedData = {
      railways: Array.from(railwaySet).sort(),
      calendarMap,
      directionMap,
      stationMap,
      trainMap
    };
  }

  // 線路のリストを取得
  getRailways() {
    return this.indexedData.railways;
  }

  // 線路のカレンダータイプのリストを取得
  getCalendars(railway) {
    if (!this.indexedData.calendarMap[railway]) {
      console.warn(`Railway not found: ${railway}`);
      return [];
    }
    return Array.from(this.indexedData.calendarMap[railway]).sort();
  }

  // カレンダータイプの方向(direction)のリストを取得
  getDirections(railway, calendar) {
    const key = `${railway}_${calendar}`;
    if (!this.indexedData.directionMap[key]) {
      console.warn(`Calendar not found: ${key}`);
      return [];
    }
    return Array.from(this.indexedData.directionMap[key]).sort();
  }

  // 方向(direction)の終着駅を取得
  getDestinationStation(railway, calendar, direction) {
    const timetables = this.data.filter(
      (t) =>
        t['odpt:railway'] === railway &&
        t['odpt:calendar'] === calendar &&
        t['odpt:railDirection'] === direction
    );

    if (timetables.length === 0) {
      console.warn(`Direction not found: ${railway} ${calendar} ${direction}`);
      return null;
    }

    // 全てのtimetableから終着駅を取得（通常は同じ）
    const destinations = timetables.map((t) => t['odpt:destinationStation'][0]);
    return destinations[0]; // 最初のものを返す
  }

  // 方向(direction)の停車駅のリストを取得（順序を保持）
  getStations(railway, calendar, direction) {
    const timetables = this.data.filter(
      (t) =>
        t['odpt:railway'] === railway &&
        t['odpt:calendar'] === calendar &&
        t['odpt:railDirection'] === direction
    );

    if (timetables.length === 0) {
      console.warn(`Direction not found: ${railway} ${calendar} ${direction}`);
      return [];
    }

    // 停車駅の数が最も多いtimetableを取得
    const firstTimetable = timetables.reduce((max, current) => 
      current['odpt:trainTimetableObject'].length > max['odpt:trainTimetableObject'].length ? current : max
    );
    const stops = firstTimetable['odpt:trainTimetableObject'];
    const stations = [];

    stops.forEach((stop) => {
      if (stop['odpt:departureStation']) {
        stations.push(stop['odpt:departureStation']);
      } else if (stop['odpt:arrivalStation']) {
        stations.push(stop['odpt:arrivalStation']);
      }
    });

    // 重複を削除（順序を保持）
    return [...new Set(stations)];
  }

  // 特定の駅に到着する列車のリスト（到着時間でソート）
  getTrainsArrivingAtStation(station, railway = null, calendar = null, direction = null) {
    if (!this.indexedData.stationMap[station]) {
      console.warn(`Station not found: ${station}`);
      return [];
    }

    let trains = this.indexedData.stationMap[station];
    
    // 条件でフィルタリング
    if (railway) {
      trains = trains.filter(t => t.railway === railway);
    }
    if (calendar) {
      trains = trains.filter(t => t.calendar === calendar);
    }
    if (direction) {
      trains = trains.filter(t => t.direction === direction);
    }
    
    return trains
      .sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime))
      .map((train) => ({
        ...train,
        railwayNameJa: this.getRailwayNameJa(train.railway),
        destinationNameJa: this.getStationNameJa(train.destination)
      }));
  }

  // 特定の列車が特定の駅に到着する時間を取得
  getTrainArrivalTimeAtStation(trainNumber, station) {
    const trains = this.getTrainsArrivingAtStation(station);
    const train = trains.find((t) => t.trainNumber === trainNumber);

    if (!train) {
      console.warn(`Train ${trainNumber} does not arrive at ${station}`);
      return null;
    }

    return train.arrivalTime;
  }

  // 列車の全ての停車駅と時刻を取得
  getTrainTimetable(trainNumber) {
    const timetable = this.indexedData.trainMap[trainNumber];

    if (!timetable) {
      console.warn(`Train not found: ${trainNumber}`);
      return null;
    }

    const stops = timetable['odpt:trainTimetableObject'];
    const result = [];

    stops.forEach((stop, index) => {
      const station = stop['odpt:departureStation'] || stop['odpt:arrivalStation'];
      const arrivalTime = stop['odpt:arrivalTime'] || null;
      const departureTime = stop['odpt:departureTime'] || null;

      result.push({
        order: index,
        station,
        arrivalTime,
        departureTime,
        platformNumber: stop['odpt:platformNumber'] || null
      });
    });

    return {
      trainNumber: timetable['odpt:trainNumber'],
      railway: timetable['odpt:railway'],
      railwayNameJa: this.getRailwayNameJa(timetable['odpt:railway']),
      calendar: timetable['odpt:calendar'],
      direction: timetable['odpt:railDirection'],
      originStation: timetable['odpt:originStation'][0],
      destinationStation: timetable['odpt:destinationStation'][0],
      originStationNameJa: this.getStationNameJa(timetable['odpt:originStation'][0]),
      destinationStationNameJa: this.getStationNameJa(timetable['odpt:destinationStation'][0]),
      stops: result
    };
  }
}

module.exports = TimetableService;
