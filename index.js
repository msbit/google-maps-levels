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

const contains = ({ lat, lng }, polygon, latSq, lngSq) => {
  const latHalfSq = latSq / 2;
  const lngHalfSq = lngSq / 2;
  const corners = [
    new gm.LatLng(lat() + latHalfSq, lng() - lngHalfSq),
    new gm.LatLng(lat() + latHalfSq, lng() + lngHalfSq),
    new gm.LatLng(lat() - latHalfSq, lng() + lngHalfSq),
    new gm.LatLng(lat() - latHalfSq, lng() - lngHalfSq)
  ];
  return corners.find(c => gmgp.containsLocation(c, polygon)) !== undefined;
};

const centre = (locations) => {
  const { n, s, e, w } = locations.getArray().reduce(toBounds, {
    n: -90,
    s: 90,
    e: -180,
    w: 180
  });
  return new gm.LatLng((n + s) / 2, (e + w) / 2);
};

const toBounds = ({ n, s, e, w }, { lat, lng }) => {
  return {
    n: Math.max(n, lat()),
    s: Math.min(s, lat()),
    e: Math.max(e, lng()),
    w: Math.min(w, lng())
  };
};

const processElevationResults = (results, polygons) => {
  const maxResult = results.reduce((a, b) => a.elevation > b.elevation ? a : b);
  const minResult = results.reduce((a, b) => a.elevation < b.elevation ? a : b);

  let maxPolygon;
  let minPolygon;
  const scaler = scale(minResult.elevation, maxResult.elevation, 0, 120);
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
    elevation: maxResult.elevation,
    polygon: maxPolygon
  }, {
    elevation: minResult.elevation,
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
      map,
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

  map.addListener('click', async ({ latLng }) => {
    if (complete) { return; }

    path.push(latLng);
    polygon.setPath(path);
    if (path.length < 4) { return; }

    const { n, s, e, w } = path.reduce(toBounds, {
      n: -90,
      s: 90,
      e: -180,
      w: 180
    });
    const latBound = n - s;
    const lngBound = e - w;
    const latSq = latBound / 32;
    const latHalfSq = latSq / 2;
    const lngSq = lngBound / 32;
    const lngHalfSq = lngSq / 2;
    const locations = [];
    for (let lat = s + latHalfSq; lat < n; lat += latSq) {
      for (let lng = w + lngHalfSq; lng < e; lng += lngSq) {
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
