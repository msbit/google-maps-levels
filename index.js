window.addEventListener('load', function () {
  const head = document.getElementsByTagName('head')[0];
  const script = document.createElement('script');
  script.async = true;
  script.defer = true;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap`;
  script.type = 'text/javascript';
  head.appendChild(script);
});

function normalise (input, inputMin, inputMax, outputMin, outputMax) {
  const inputRange = inputMax - inputMin;
  const outputRange = outputMax - outputMin;
  const ratio = outputRange / inputRange;
  return ((input - inputMin) * ratio) + outputMin;
}

function pathToBounds (accumulator, currentValue) {
  accumulator.north = Math.max(accumulator.north, currentValue.lat);
  accumulator.south = Math.min(accumulator.south, currentValue.lat);
  accumulator.east = Math.max(accumulator.east, currentValue.lng);
  accumulator.west = Math.min(accumulator.west, currentValue.lng);
  return accumulator;
}

function processElevationResults (map, latGrid, lngGrid, locations) {
  const latHalfGrid = latGrid / 2;
  const lngHalfGrid = lngGrid / 2;
  const rectangles = locations.map(function (location) {
    return new google.maps.Rectangle({
      bounds: {
        north: location.lat() + latHalfGrid,
        south: location.lat() - latHalfGrid,
        east: location.lng() + lngHalfGrid,
        west: location.lng() - lngHalfGrid
      },
      fillOpacity: 0.5,
      geodesic: true,
      map: map,
      strokeWeight: 0
    });
  });
  return function (results, status) {
    if (status === google.maps.ElevationStatus.OK) {
      let maxElevation = Number.MIN_VALUE;
      let minElevation = Number.MAX_VALUE;
      for (let result of results) {
        maxElevation = Math.max(maxElevation, result.elevation);
        minElevation = Math.min(minElevation, result.elevation);
      }
      for (let result of results) {
        const hue = normalise(result.elevation, minElevation, maxElevation, 0, 120);
        const rectangle = rectangles.find(function (rectangle) {
          return rectangle.getBounds().contains(result.location);
        });
        rectangle.setOptions({fillColor: `hsl(${hue}, 50%, 50%)`});
      }
    }
  };
}

function initMap () {
  const service = new google.maps.ElevationService();
  const map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: -37.554082, lng: 144.046702},
    zoom: 19
  });
  let complete = false;
  const path = [];
  const polygon = new google.maps.Polygon({
    geodesic: true,
    map: map,
    fillOpacity: 0.0,
    strokeColor: '#000000',
    strokeOpacity: 1.0,
    strokeWeight: 2
  });

  map.addListener('click', function (event) {
    if (!complete) {
      path.push(event.latLng.toJSON());
      polygon.setPath(path);
      if (path.length > 3) {
        const bounds = path.reduce(pathToBounds, {
          north: -90,
          south: 90,
          east: -180,
          west: 180
        });
        const latBound = bounds.north - bounds.south;
        const lngBound = bounds.east - bounds.west;
        const latGrid = latBound / 16;
        const latHalfGrid = latGrid / 2;
        const lngGrid = lngBound / 16;
        const lngHalfGrid = lngGrid / 2;
        const locations = [];
        for (let lat = bounds.south + latHalfGrid; lat < bounds.north; lat += latGrid) {
          for (let lng = bounds.west + lngHalfGrid; lng < bounds.east; lng += lngGrid) {
            const location = new google.maps.LatLng(lat, lng);
            if (google.maps.geometry.poly.containsLocation(location, polygon)) {
              locations.push(location);
            }
          }
        }
        service.getElevationForLocations({locations}, processElevationResults(map, latGrid, lngGrid, locations));
        complete = true;
      }
    }
  });
}
