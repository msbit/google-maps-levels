const cC3 = 6378137; //Semi major axis (a) (m)
const cC4 = 298.257222101; //Inverse flattening (1/f)
const cC20 = 500000; //False easting (m)
const cC21 = 10000000; //False northing (m)
const cC22 = 0.9996; //Central Scale factor (K0)
const cC23 = 6; //Zone width (degrees)
const cC24 = -177; //Longitude of the central meridian of zone 1(degrees)

function calculateGeographicToGrid(lat, lng) {
  const cC7 = 1 / cC4; //Flattening (f)
  const cC8 = (2 * cC7) - Math.pow(cC7, 2); //Eccentricity (e2)
  const cC25 = cC24 - (1.5 * cC23); //Longitude of western edge of zone zero
  const cC26 = cC25 + (cC23 / 2); //Central meridian of zone zero
  
  const L4 = lng; //Longitude
  const F4 = lat; //Latitude
  const C5 = (L4 - cC25) / cC23; //Zone no. (real number)
  const C7 = Math.floor(C5); //Zone
  const C6 = (C7 * cC23) + cC26; //Central Meridian
  
  const K10 = cC8; //e2
  const K11 = K10 * K10; //e4
  const K12 = K11 * K10; //e6
  const G4 = (F4 / 180) * Math.PI; //Latitude (radians)
  const E9 = Math.sin(G4); //Sin latitude (sinj)
  const E10 = Math.sin(2 * G4); //sin(2j)
  const E11 = Math.sin(4 * G4); //sin(4j)
  const E12 = Math.sin(6 * G4); //sin(6j)
  const K16 = cC3 / Math.pow(1 - (K10 * Math.pow(E9, 2)), 0.5); //Nu (n)
  const L6 = L4 - C6; //?
  const M6 = (L6 / 180) * Math.PI; //?
  
  const E22 = Math.cos(G4); //Cos latitude ^ 1
  const E23 = E22 * E22; //Cos latitude ^ 2
  const E24 = E23 * E22; //Cos latitude ^ 3
  const E25 = E24 * E22; //Cos latitude ^ 4
  const E26 = E25 * E22; //Cos latitude ^ 5
  const E27 = E26 * E22; //Cos latitude ^ 6
  const E28 = E27 * E22; //Cos latitude ^ 7
  
  const H22 = M6 //Diff long (w) ^ 1
  const H23 = H22 * H22; //Diff long (w) ^ 2
  const H24 = H23 * H22; //Diff long (w) ^ 3
  const H25 = H24 * H22; //Diff long (w) ^ 4
  const H26 = H25 * H22; //Diff long (w) ^ 5
  const H27 = H26 * H22; //Diff long (w) ^ 6
  const H28 = H27 * H22; //Diff long (w) ^ 7
  const H29 = H28 * H22; //Diff long (w) ^ 8
  
  const K22 = Math.tan(G4); //Tan latitude ^ 1
  const K23 = K22 * K22; //Tan latitude ^ 2
  const K24 = K23 * K22; //Tan latitude ^ 3
  const K25 = K24 * K22; //Tan latitude ^ 4
  const K26 = K25 * K22; //Tan latitude ^ 5
  const K27 = K26 * K22; //Tan latitude ^ 6
  const K28 = K27 * K22; //Tan latitude ^ 7

  const K15 = cC3 * (1 - K10) / Math.pow(1 - (K10 * Math.pow(E9, 2)), 1.5); //Rho(r)
  
  const M22 = K16 / K15; //Psi (y)= Nu/Rho ^ 1
  const M23 = M22 * M22; //Psi (y)= Nu/Rho ^ 2
  const M24 = M23 * M22; //Psi (y)= Nu/Rho ^ 3
  const M25 = M24 * M22; //Psi (y)= Nu/Rho ^ 4
  
  const E33 = K16 * H22 * E22; //1st term
  const E34 = K16 * H24 * E24 * (M22 - K23) / 6; //3rd term
  const E35 = K16 * H26 * E26 * (4 * M24 * (1 - 6 * K23) + M23 * (1 + 8 * K23) - M22 * (2 * K23) + K25) / 120; //3rd term
  const E36 = K16 * H28 * E28 * (61 - 479 * K23 + 179 * K25 - K27) / 5040; //4th term
  const E37 = E33 + E34 + E35 + E36; //Sum
  const E38 = cC22 * E37; //Sum*K0
  const E39 = cC20; //False Origin
  const E40 = E38 + E39; //Easting

  const M9 = 1 - (K10 / 4) - ((3 * K11) / 64) - ((5 * K12) / 256); //A0
  const E15 = cC3 * M9 * G4; //1st term
  const M10 = (3 / 8) * (K10 + (K11 / 4) + ((15 * K12) / 128)); //A2
  const E16 = -cC3 * M10 * E10; //2nd term
  const M11 = (15 / 256) * (K11 + ((3 * K12) / 4)); //A4
  const E17 = cC3 * M11 * E11; //3rd term
  const M12 = (35 * K12) / 3072; //A6
  const E18 = -cC3 * M12 * E12; //4th term
  const E19 = E15 + E16 + E17 + E18; //sum (meridian dist)
  const K32 = E19; //Meridian Dist
  const K33 = K16 * E9 * H23 * E22 / 2; //1st term
  const K34 = K16 * E9 * H25 * E24 * (4 * M23 + M22 - K23) / 24; //2nd term
  const K35 = K16 * E9 * H27 * E26 * (8 * M25 * (11 - 24 * K23) - 28 * M24 * (1 - 6 * K23) + M23 * (1 - 32 * K23) - M22 * (2 * K23) + K25) / 720;  // 3rd term
  const K36 = K16 * E9 * H29 * E28 * (1385 - 3111 * K23 + 543 * K25 - K27) / 40320; //4th term
  const K37 = K32 + K33 + K34 + K35 + K36; //Sum
  const K38 = cC22 * K37; //Sum*K0
  const K39 = cC21; //False Origin
  const K40 = K38 + K39 //Northing

  const G42 = -E9 * H22; //1st term
  const G43 = -E9 * H24 * E23 * (2 * M23 - M22) / 3; //2nd term
  const G44 = -E9 * H26 * E25 * (M25 * (11 - 24 * K23) - M24 * (11 - 36 * K23) + 2 * M23 * (1 - 7 * K23) + M22 * K23) / 15; //3rd term
  const G45 = E9 * H28 * E27 * (17 - 26 * K23 + 2 * K25) / 315; //4th term
  const G47 = G42 + G43 + G44 + G45; // Grid convergence (radians)
  const F47 = (G47 / Math.PI) * 180; //Grid convergence (degrees)

  const K42 = 1 + (H23 * E23 * M22) / 2; //1st term
  const K43 = H25 * E25 * (4 * M24 * (1 - 6 * K23) + M23 * (1 + 24 * K23) - 4 * M22 * K23) / 24; //2nd term
  const K44 = H27 * E27 * (61 - 148 * K23 + 16 * K25) / 720; //3rd term
  const K45 = K42 + K43 + K44; //Sum
  const K47 = cC22 * K45; //Point Scale

  const zone = C7;
  const easting = E40;
  const northing = K40;
  const gridConvergence = F47;
  const pointScale = K47;

  return {
    zone,
    easting,
    northing,
    gridConvergence,
    pointScale
  };
}
