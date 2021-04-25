window.addEventListener('load', () => {
  const head = document.getElementsByTagName('head')[0];
  const script = document.createElement('script');

  const url = new URL('https://maps.googleapis.com/maps/api/js');
  url.searchParams.set('callback', 'initMap');
  url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
  url.searchParams.set('libraries', 'geometry');

  script.async = true;
  script.defer = true;
  script.src = url.toString();
  script.type = 'text/javascript';

  head.appendChild(script);
});

const scale = (inputMin, inputMax, outputMin, outputMax) => {
  const inputRange = inputMax - inputMin;
  const outputRange = outputMax - outputMin;
  const ratio = outputRange / inputRange;

  return input => ((input - inputMin) * ratio) + outputMin;
};

const contains = (location, polygon, latSq, lngSq) => {
  const lat = location.lat();
  const lng = location.lng();
  const latHalfSq = latSq / 2;
  const lngHalfSq = lngSq / 2;
  const corners = [
    new gm.LatLng(lat + latHalfSq, lng - lngHalfSq),
    new gm.LatLng(lat + latHalfSq, lng + lngHalfSq),
    new gm.LatLng(lat - latHalfSq, lng + lngHalfSq),
    new gm.LatLng(lat - latHalfSq, lng - lngHalfSq)
  ];
  return corners.find(c => gmgp.containsLocation(c, polygon)) !== undefined;
};

const centre = (locations) => {
  const bounds = locations.getArray().reduce(toBounds, {
    north: -90,
    south: 90,
    east: -180,
    west: 180
  });
  return new gm.LatLng((bounds.north + bounds.south) / 2, (bounds.east + bounds.west) / 2);
};

const toBounds = (bounds, location) => {
  const lat = location.lat();
  const lng = location.lng();
  bounds.north = Math.max(bounds.north, lat);
  bounds.south = Math.min(bounds.south, lat);
  bounds.east = Math.max(bounds.east, lng);
  bounds.west = Math.min(bounds.west, lng);
  return bounds;
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
  const scaler = scale(minElevation, maxElevation, 0, 120);
  for (const result of results) {
    const hue = scaler(result.elevation);
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

const createPolygons = (map, latSq, lngSq, locations) => {
  const latHalfSq = latSq / 2;
  const lngHalfSq = lngSq / 2;
  return locations.map((location) => {
    const lat = location.lat();
    const lng = location.lng();
    const path = [{
      lat: lat + latHalfSq,
      lng: lng - lngHalfSq
    }, {
      lat: lat + latHalfSq,
      lng: lng + lngHalfSq
    }, {
      lat: lat - latHalfSq,
      lng: lng + lngHalfSq
    }, {
      lat: lat - latHalfSq,
      lng: lng - lngHalfSq
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

const request = (service, locations) => new Promise((resolve, reject) => {
  service.getElevationForLocations({ locations }, (results, status) => {
    if (status === gm.ElevationStatus.OK) {
      resolve(results);
    } else {
      reject(status);
    }
  });
});

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

  map.addListener('click', async (event) => {
    if (complete) { return; }

    path.push(event.latLng);
    polygon.setPath(path);
    if (path.length < 4) { return; }

    const bounds = path.reduce(toBounds, {
      north: -90,
      south: 90,
      east: -180,
      west: 180
    });
    const latBound = bounds.north - bounds.south;
    const lngBound = bounds.east - bounds.west;
    const latSq = latBound / 32;
    const latHalfSq = latSq / 2;
    const lngSq = lngBound / 32;
    const lngHalfSq = lngSq / 2;
    const locations = [];
    for (let lat = bounds.south + latHalfSq; lat < bounds.north; lat += latSq) {
      for (let lng = bounds.west + lngHalfSq; lng < bounds.east; lng += lngSq) {
        const location = new gm.LatLng(lat, lng);
        if (!contains(location, polygon, latSq, lngSq)) { continue; }

        locations.push(location);
      }
    }

    const batch = 256;
    const polygons = createPolygons(map, latSq, lngSq, locations);
    const results = [];

    for (let i = 0; i < locations.length; i += batch) {
      results.push(await request(service, locations.slice(i, i + batch)));
    }

    const [max, min] = processElevationResults(results.flat(), polygons);

    new gm.InfoWindow({
      content: max.elevation.toFixed(2),
      position: centre(max.polygon.latLngs.getAt(0))
    }).open(map);

    new gm.InfoWindow({
      content: min.elevation.toFixed(2),
      position: centre(min.polygon.latLngs.getAt(0))
    }).open(map);
    complete = true;
  });
}
