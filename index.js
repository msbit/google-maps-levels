window.addEventListener('load', () => {
  const head = document.getElementsByTagName('head')[0];
  const script = document.createElement('script');

  script.async = true;
  script.defer = true;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&libraries=geometry`;
  script.type = 'text/javascript';

  head.appendChild(script);
});

const normalise = (input, inputMin, inputMax, outputMin, outputMax) => {
  const inputRange = inputMax - inputMin;
  const outputRange = outputMax - outputMin;
  const ratio = outputRange / inputRange;
  return ((input - inputMin) * ratio) + outputMin;
};

const contains = (location, polygon, latGrid, lngGrid) => {
  const lat = location.lat();
  const lng = location.lng();
  const latHalfGrid = latGrid / 2;
  const lngHalfGrid = lngGrid / 2;
  const corners = [
    new gm.LatLng(lat + latHalfGrid, lng - lngHalfGrid),
    new gm.LatLng(lat + latHalfGrid, lng + lngHalfGrid),
    new gm.LatLng(lat - latHalfGrid, lng + lngHalfGrid),
    new gm.LatLng(lat - latHalfGrid, lng - lngHalfGrid)
  ];
  return corners.find(c => gmgp.containsLocation(c, polygon)) !== undefined;
};

const centre = (positions) => {
  const bounds = positions.getArray().reduce(latLngsToBounds, {
    north: -90,
    south: 90,
    east: -180,
    west: 180
  });
  return new gm.LatLng((bounds.north + bounds.south) / 2, (bounds.east + bounds.west) / 2);
};

const latLngsToBounds = (accumulator, currentValue) => {
  const lat = currentValue.lat();
  const lng = currentValue.lng();
  accumulator.north = Math.max(accumulator.north, lat);
  accumulator.south = Math.min(accumulator.south, lat);
  accumulator.east = Math.max(accumulator.east, lng);
  accumulator.west = Math.min(accumulator.west, lng);
  return accumulator;
};

const processElevationResults = (results, polygons) => {
  let maxElevation = Number.MIN_VALUE;
  let minElevation = Number.MAX_VALUE;
  let maxResult;
  let minResult;
  for (const result of results) {
    if (result.elevation > maxElevation) {
      maxElevation = result.elevation;
      maxResult = result;
    }

    if (result.elevation < minElevation) {
      minElevation = result.elevation;
      minResult = result;
    }
  }

  let maxPolygon;
  let minPolygon;
  for (const result of results) {
    const hue = normalise(result.elevation, minElevation, maxElevation, 0, 120);
    const polygon = polygons.find(p => gmgp.containsLocation(result.location, p));
    let saturation = 50;
    if (result === maxResult) {
      maxPolygon = polygon;
      saturation = 100;
    }
    if (result === minResult) {
      minPolygon = polygon;
      saturation = 100;
    }
    polygon.setOptions({ fillColor: `hsl(${hue}, ${saturation}%, 50%)` });
  }
  return [{
    elevation: maxElevation,
    polygon: maxPolygon
  }, {
    elevation: minElevation,
    polygon: minPolygon
  }];
};

const createPolygons = (map, latGrid, lngGrid, locations) => {
  const latHalfGrid = latGrid / 2;
  const lngHalfGrid = lngGrid / 2;
  return locations.map((location) => {
    const lat = location.lat();
    const lng = location.lng();
    const path = [{
      lat: lat + latHalfGrid,
      lng: lng - lngHalfGrid
    }, {
      lat: lat + latHalfGrid,
      lng: lng + lngHalfGrid
    }, {
      lat: lat - latHalfGrid,
      lng: lng + lngHalfGrid
    }, {
      lat: lat - latHalfGrid,
      lng: lng - lngHalfGrid
    }];
    return new gm.Polygon({
      fillOpacity: 0.5,
      geodesic: true,
      map: map,
      path,
      strokeWeight: 0
    });
  });
};

const queueRequest = (service, locations, promises) => {
  promises.push(new Promise((resolve, reject) => {
    service.getElevationForLocations({ locations }, (results, status) => {
      if (status === gm.ElevationStatus.OK) {
        resolve(results);
      } else {
        reject(status);
      }
    });
  }));
};

function initMap () {
  globalThis.gm = google.maps;
  globalThis.gmgp = google.maps.geometry.poly;

  const service = new gm.ElevationService();
  const center = { lat: -37.554082, lng: 144.046702 };
  const zoom = 19;
  const map = new gm.Map(document.getElementById('map'), { center, zoom });
  let complete = false;
  const path = [];
  const polygon = new gm.Polygon({
    geodesic: true,
    map,
    fillOpacity: 0.0,
    strokeColor: '#000000',
    strokeOpacity: 1.0,
    strokeWeight: 2
  });

  map.addListener('click', (event) => {
    if (complete) { return; }

    path.push(event.latLng);
    polygon.setPath(path);
    if (path.length < 4) { return; }

    const bounds = path.reduce(latLngsToBounds, {
      north: -90,
      south: 90,
      east: -180,
      west: 180
    });
    const latBound = bounds.north - bounds.south;
    const lngBound = bounds.east - bounds.west;
    const latGrid = latBound / 32;
    const latHalfGrid = latGrid / 2;
    const lngGrid = lngBound / 32;
    const lngHalfGrid = lngGrid / 2;
    const locations = [];
    for (let lat = bounds.south + latHalfGrid; lat < bounds.north; lat += latGrid) {
      for (let lng = bounds.west + lngHalfGrid; lng < bounds.east; lng += lngGrid) {
        const location = new gm.LatLng(lat, lng);
        if (contains(location, polygon, latGrid, lngGrid)) {
          locations.push(location);
        }
      }
    }

    const batchSize = 256;
    const polygons = createPolygons(map, latGrid, lngGrid, locations);
    const promises = [];
    let batchStart = 0;
    const intervalId = window.setInterval(async () => {
      if (batchStart < locations.length) {
        queueRequest(service, locations.slice(batchStart, batchStart + batchSize), promises);
        batchStart += batchSize;

        return;
      }

      window.clearInterval(intervalId);

      const results = await Promise.all(promises);

      const [max, min] = processElevationResults(results.flat(), polygons);

      new gm.InfoWindow({
        content: max.elevation.toFixed(2),
        position: centre(max.polygon.latLngs.getAt(0))
      }).open(map);

      new gm.InfoWindow({
        content: min.elevation.toFixed(2),
        position: centre(min.polygon.latLngs.getAt(0))
      }).open(map);
    }, 500);
    complete = true;
  });
}
