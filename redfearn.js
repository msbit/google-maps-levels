class Redfearn {
  constructor (centralScaleFactor, falseEasting, falseNorthing, inverseFlattening, semiMajorAxis, zone1CentralMeridian, zoneWidth) {
    this.centralScaleFactor = centralScaleFactor;
    this.falseEasting = falseEasting;
    this.falseNorthing = falseNorthing;
    this.inverseFlattening = inverseFlattening;
    this.semiMajorAxis = semiMajorAxis;
    this.zone1CentralMeridian = zone1CentralMeridian;
    this.zoneWidth = zoneWidth;

    this.flattening = 1 / this.inverseFlattening;
    this.eccentricity2 = (2 * this.flattening) - Math.pow(this.flattening, 2);
    this.zone0WesternEdge = this.zone1CentralMeridian - (1.5 * this.zoneWidth);
    this.zone0CentralMeridian = this.zone0WesternEdge + (this.zoneWidth / 2);

    this.A0 = 1 - (this.eccentricity2 / 4) - ((3 * Math.pow(this.eccentricity2, 2)) / 64) - ((5 * Math.pow(this.eccentricity2, 3)) / 256);
    this.A2 = (3 / 8) * (this.eccentricity2 + (Math.pow(this.eccentricity2, 2) / 4) + ((15 * Math.pow(this.eccentricity2, 3)) / 128));
    this.A4 = (15 / 256) * (Math.pow(this.eccentricity2, 2) + ((3 * Math.pow(this.eccentricity2, 3)) / 4));
    this.A6 = (35 * Math.pow(this.eccentricity2, 3)) / 3072;

    this._memo = {};
  }

  memo (lat, lng, key, callback) {
    if (this._memo[lat] === undefined) {
      this._memo[lat] = {};
    }
    if (this._memo[lat][lng] === undefined) {
      this._memo[lat][lng] = {};
    }
    if (this._memo[lat][lng][key] === undefined) {
      this._memo[lat][lng][key] = callback(this);
    }
    return this._memo[lat][lng][key];
  }

  zone (lat, lng) {
    return this.memo(lat, lng, 'zone', function (self) {
      return Math.floor((lng - self.zone0WesternEdge) / self.zoneWidth);
    });
  }

  latRad (lat, lng) {
    return this.memo(lat, lng, 'latRad', function () {
      return (lat / 180) * Math.PI;
    });
  }

  sinLat (lat, lng) {
    return this.memo(lat, lng, 'sinLat', function (self) {
      return Math.sin(self.latRad(lat, lng));
    });
  }

  sin2Lat (lat, lng) {
    return this.memo(lat, lng, 'sin2Lat', function (self) {
      return Math.sin(2 * self.latRad(lat, lng));
    });
  }

  sin4Lat (lat, lng) {
    return this.memo(lat, lng, 'sin4Lat', function (self) {
      return Math.sin(4 * self.latRad(lat, lng));
    });
  }

  sin6Lat (lat, lng) {
    return this.memo(lat, lng, 'sin6Lat', function (self) {
      return Math.sin(6 * self.latRad(lat, lng));
    });
  }

  centralMeridian (lat, lng) {
    return this.memo(lat, lng, 'centralMeridian', function (self) {
      return (self.zone(lat, lng) * self.zoneWidth) + self.zone0CentralMeridian;
    });
  }

  nu (lat, lng) {
    return this.memo(lat, lng, 'nu', function (self) {
      return self.semiMajorAxis / Math.pow(1 - (self.eccentricity2 * Math.pow(self.sinLat(lat, lng), 2)), 0.5);
    });
  }

  rho (lat, lng) {
    return this.memo(lat, lng, 'rho', function (self) {
      return self.semiMajorAxis * (1 - self.eccentricity2) / Math.pow(1 - (self.eccentricity2 * Math.pow(self.sinLat(lat, lng), 2)), 1.5);
    });
  }

  psi (lat, lng) {
    return this.memo(lat, lng, 'psi', function (self) {
      return self.nu(lat, lng) / self.rho(lat, lng);
    });
  }

  cosLat (lat, lng) {
    return this.memo(lat, lng, 'cosLat', function (self) {
      return Math.cos(self.latRad(lat, lng));
    });
  }

  tanLat (lat, lng) {
    return this.memo(lat, lng, 'tanLat', function (self) {
      return Math.tan(self.latRad(lat, lng));
    });
  }

  lngDiff (lat, lng) {
    return this.memo(lat, lng, 'lngDiff', function (self) {
      return lng - self.centralMeridian(lat, lng);
    });
  }

  lngDiffRad (lat, lng) {
    return this.memo(lat, lng, 'lngDiffRad', function (self) {
      return (self.lngDiff(lat, lng) / 180) * Math.PI;
    });
  }

  easting (lat, lng) {
    return this.memo(lat, lng, 'easting', function (self) {
      const nu = self.nu(lat, lng);
      const lngDiffRad = self.lngDiffRad(lat, lng);
      const cosLat = self.cosLat(lat, lng);
      const psi = self.psi(lat, lng);
      const tanLat = self.tanLat(lat, lng);

      const cosLat3 = Math.pow(cosLat, 3);
      const cosLat5 = Math.pow(cosLat, 5);
      const cosLat7 = Math.pow(cosLat, 7);
      const lngDiffRad3 = Math.pow(lngDiffRad, 3);
      const lngDiffRad5 = Math.pow(lngDiffRad, 5);
      const lngDiffRad7 = Math.pow(lngDiffRad, 7);
      const psi2 = Math.pow(psi, 2);
      const psi3 = Math.pow(psi, 3);
      const tanLat2 = Math.pow(tanLat, 2);
      const tanLat4 = Math.pow(tanLat, 4);
      const tanLat6 = Math.pow(tanLat, 6);

      const first = nu * lngDiffRad * cosLat;
      const second = nu * lngDiffRad3 * cosLat3 * (psi - tanLat2) / 6;
      const third = nu * lngDiffRad5 * cosLat5 * (4 * psi3 * (1 - 6 * tanLat2) + psi2 * (1 + 8 * tanLat2) - psi * (2 * tanLat2) + tanLat4) / 120;
      const fourth = nu * lngDiffRad7 * cosLat7 * (61 - 479 * tanLat2 + 179 * tanLat4 - tanLat6) / 5040;
      return self.centralScaleFactor * (first + second + third + fourth) + self.falseEasting;
    });
  }

  meridianDistance (lat, lng) {
    return this.memo(lat, lng, 'meridianDistance', function (self) {
      const first = self.semiMajorAxis * self.A0 * self.latRad(lat, lng);
      const second = -self.semiMajorAxis * self.A2 * self.sin2Lat(lat, lng);
      const third = self.semiMajorAxis * self.A4 * self.sin4Lat(lat, lng);
      const fourth = -self.semiMajorAxis * self.A6 * self.sin6Lat(lat, lng);
      return first + second + third + fourth;
    });
  }

  northing (lat, lng) {
    return this.memo(lat, lng, 'northing', function (self) {
      const cosLat = self.cosLat(lat, lng);
      const lngDiffRad = self.lngDiffRad(lat, lng);
      const nu = self.nu(lat, lng);
      const psi = self.psi(lat, lng);
      const sinLat = self.sinLat(lat, lng);
      const tanLat = self.tanLat(lat, lng);

      const cosLat3 = Math.pow(cosLat, 3);
      const cosLat5 = Math.pow(cosLat, 5);
      const cosLat7 = Math.pow(cosLat, 7);
      const lngDiffRad2 = Math.pow(lngDiffRad, 2);
      const lngDiffRad4 = Math.pow(lngDiffRad, 4);
      const lngDiffRad6 = Math.pow(lngDiffRad, 6);
      const lngDiffRad8 = Math.pow(lngDiffRad, 8);
      const psi2 = Math.pow(psi, 2);
      const psi3 = Math.pow(psi, 3);
      const psi4 = Math.pow(psi, 4);
      const tanLat2 = Math.pow(tanLat, 2);
      const tanLat4 = Math.pow(tanLat, 4);
      const tanLat6 = Math.pow(tanLat, 6);

      const first = nu * sinLat * lngDiffRad2 * cosLat / 2;
      const second = nu * sinLat * lngDiffRad4 * cosLat3 * (4 * psi2 + psi - tanLat2) / 24;
      const third = nu * sinLat * lngDiffRad6 * cosLat5 * (8 * psi4 * (11 - 24 * tanLat2) - 28 * psi3 * (1 - 6 * tanLat2) + psi2 * (1 - 32 * tanLat) - psi * (2 * tanLat2) + tanLat4) / 720;
      const fourth = nu * sinLat * lngDiffRad8 * cosLat7 * (1385 - 3111 * tanLat2 + 543 * tanLat4 - tanLat6) / 40320;
      return self.centralScaleFactor * (self.meridianDistance(lat, lng) + first + second + third + fourth) + self.falseNorthing;
    });
  }

  gridConvergence (lat, lng) {
    return this.memo(lat, lng, 'gridConvergence', function (self) {
      const cosLat = self.cosLat(lat, lng);
      const lngDiffRad = self.lngDiffRad(lat, lng);
      const psi = self.psi(lat, lng);
      const sinLat = self.sinLat(lat, lng);
      const tanLat = self.tanLat(lat, lng);

      const cosLat2 = Math.pow(cosLat, 2);
      const cosLat4 = Math.pow(cosLat, 4);
      const cosLat6 = Math.pow(cosLat, 6);
      const lngDiffRad3 = Math.pow(lngDiffRad, 3);
      const lngDiffRad5 = Math.pow(lngDiffRad, 5);
      const lngDiffRad7 = Math.pow(lngDiffRad, 7);
      const psi2 = Math.pow(psi, 2);
      const psi3 = Math.pow(psi, 3);
      const psi4 = Math.pow(psi, 4);
      const tanLat2 = Math.pow(tanLat, 2);
      const tanLat4 = Math.pow(tanLat, 4);

      const first = -sinLat * lngDiffRad;
      const second = -sinLat * lngDiffRad3 * cosLat2 * (2 * psi2 - psi) / 3;
      const third = -sinLat * lngDiffRad5 * cosLat4 * (psi4 * (11 - 24 * tanLat2) - psi3 * (11 - 36 * tanLat2) + 2 * psi2 * (1 - 7 * tanLat2) + psi * tanLat2) / 15;
      const fourth = sinLat * lngDiffRad7 * cosLat6 * (17 - 26 * tanLat2 + 2 * tanLat4) / 315;
      return ((first + second + third + fourth) / Math.PI) * 180;
    });
  }

  pointScaleFactor (lat, lng) {
    return this.memo(lat, lng, 'pointScaleFactor', function (self) {
      const cosLat = self.cosLat(lat, lng);
      const tanLat = self.tanLat(lat, lng);
      const lngDiffRad = self.lngDiffRad(lat, lng);
      const psi = self.psi(lat, lng);

      const cosLat2 = Math.pow(cosLat, 2);
      const cosLat4 = Math.pow(cosLat, 4);
      const cosLat6 = Math.pow(cosLat, 6);
      const lngDiffRad2 = Math.pow(lngDiffRad, 2);
      const lngDiffRad4 = Math.pow(lngDiffRad, 4);
      const lngDiffRad6 = Math.pow(lngDiffRad, 6);
      const psi2 = Math.pow(psi, 2);
      const psi3 = Math.pow(psi, 3);
      const tanLat2 = Math.pow(tanLat, 2);
      const tanLat4 = Math.pow(tanLat, 4);

      const first = 1 + (lngDiffRad2 * cosLat2 * psi) / 2;
      const second = lngDiffRad4 * cosLat4 * (4 * psi3 * (1 - 6 * tanLat2) + psi2 * (1 + 24 * tanLat2) - 4 * psi * tanLat2) / 24;
      const third = lngDiffRad6 * cosLat6 * (61 - 148 * tanLat2 + 16 * tanLat4) / 720;
      return self.centralScaleFactor * (first + second + third);
    });
  }
}
