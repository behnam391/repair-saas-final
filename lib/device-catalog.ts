// Baseline phone brand/model catalog shared across all shops. A shop can
// star brands as "favorite" (FavoriteBrand table) for quick access, and
// add anything missing (CustomDeviceModel table) — those additions merge
// with this static list in the UI, so the catalog effectively grows over
// time without a code change.
//
// Ordered roughly by popularity in the Iranian repair market; each brand
// lists newest models first, going back far enough to cover the devices
// that actually show up on a repair bench.

export const DEVICE_BRANDS: Record<string, string[]> = {
  "Samsung": [
    // S series
    "Galaxy S26 Ultra", "Galaxy S26+", "Galaxy S26",
    "Galaxy S25 Ultra", "Galaxy S25+", "Galaxy S25",
    "Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S24 FE",
    "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23", "Galaxy S23 FE",
    "Galaxy S22 Ultra", "Galaxy S22+", "Galaxy S22",
    "Galaxy S21 Ultra", "Galaxy S21+", "Galaxy S21", "Galaxy S21 FE",
    "Galaxy S20 Ultra", "Galaxy S20+", "Galaxy S20", "Galaxy S20 FE",
    "Galaxy S10+", "Galaxy S10", "Galaxy S10e",
    "Galaxy S9+", "Galaxy S9", "Galaxy S8+", "Galaxy S8",
    // Z fold/flip
    "Galaxy Z Fold6", "Galaxy Z Flip6", "Galaxy Z Fold5", "Galaxy Z Flip5",
    "Galaxy Z Fold4", "Galaxy Z Flip4", "Galaxy Z Fold3", "Galaxy Z Flip3",
    // Note
    "Galaxy Note 20 Ultra", "Galaxy Note 20", "Galaxy Note 10+", "Galaxy Note 10",
    "Galaxy Note 9", "Galaxy Note 8",
    // A series
    "Galaxy A56", "Galaxy A36", "Galaxy A16", "Galaxy A06",
    "Galaxy A55", "Galaxy A35", "Galaxy A25", "Galaxy A15", "Galaxy A05", "Galaxy A05s",
    "Galaxy A54", "Galaxy A34", "Galaxy A24", "Galaxy A14", "Galaxy A04", "Galaxy A04s", "Galaxy A04e",
    "Galaxy A53", "Galaxy A33", "Galaxy A23", "Galaxy A13", "Galaxy A03", "Galaxy A03s",
    "Galaxy A52s", "Galaxy A52", "Galaxy A32", "Galaxy A22", "Galaxy A12", "Galaxy A02", "Galaxy A02s",
    "Galaxy A51", "Galaxy A71", "Galaxy A31", "Galaxy A21s", "Galaxy A11", "Galaxy A01",
    "Galaxy A50", "Galaxy A70", "Galaxy A30", "Galaxy A20", "Galaxy A10", "Galaxy A10s",
    "Galaxy A9 (2018)", "Galaxy A7 (2018)", "Galaxy A8 (2018)",
    // M / F
    "Galaxy M55", "Galaxy M35", "Galaxy M15",
    "Galaxy M34", "Galaxy M14", "Galaxy M33", "Galaxy M13",
    "Galaxy M32", "Galaxy M12", "Galaxy M31", "Galaxy M11", "Galaxy M21", "Galaxy M51",
    // J (still common on the bench in Iran)
    "Galaxy J7 Prime", "Galaxy J7 Pro", "Galaxy J7 (2016)", "Galaxy J5 Prime", "Galaxy J5 (2016)",
    "Galaxy J6", "Galaxy J4+", "Galaxy J2 Prime", "Galaxy J1",
    // Tab (repair shops get tablets too)
    "Galaxy Tab S9", "Galaxy Tab S8", "Galaxy Tab S7", "Galaxy Tab A9", "Galaxy Tab A8", "Galaxy Tab A7",
  ],

  "Apple": [
    "iPhone 17 Pro Max", "iPhone 17 Pro", "iPhone 17",
    "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16", "iPhone 16e",
    "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
    "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
    "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini",
    "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 mini",
    "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11",
    "iPhone XS Max", "iPhone XS", "iPhone XR", "iPhone X",
    "iPhone 8 Plus", "iPhone 8", "iPhone 7 Plus", "iPhone 7",
    "iPhone 6s Plus", "iPhone 6s", "iPhone 6",
    "iPhone SE (2022)", "iPhone SE (2020)",
    "iPad Pro", "iPad Air", "iPad mini", "iPad (10th gen)", "iPad (9th gen)",
  ],

  "Xiaomi": [
    // Flagship
    "Xiaomi 15 Ultra", "Xiaomi 15", "Xiaomi 14 Ultra", "Xiaomi 14", "Xiaomi 13 Pro", "Xiaomi 13",
    "Xiaomi 12 Pro", "Xiaomi 12", "Xiaomi 11T Pro", "Xiaomi 11T", "Mi 11 Ultra", "Mi 11", "Mi 11 Lite",
    "Mi 10T Pro", "Mi 10T", "Mi 10", "Mi 9T Pro", "Mi 9T", "Mi 9", "Mi 8",
    // Redmi Note
    "Redmi Note 14 Pro+", "Redmi Note 14 Pro", "Redmi Note 14",
    "Redmi Note 13 Pro+", "Redmi Note 13 Pro", "Redmi Note 13",
    "Redmi Note 12 Pro+", "Redmi Note 12 Pro", "Redmi Note 12", "Redmi Note 12S",
    "Redmi Note 11 Pro", "Redmi Note 11", "Redmi Note 11S",
    "Redmi Note 10 Pro", "Redmi Note 10", "Redmi Note 10S",
    "Redmi Note 9 Pro", "Redmi Note 9S", "Redmi Note 9",
    "Redmi Note 8 Pro", "Redmi Note 8", "Redmi Note 7",
    // Redmi
    "Redmi 14C", "Redmi 13C", "Redmi 13", "Redmi 12C", "Redmi 12",
    "Redmi 10C", "Redmi 10", "Redmi 9C", "Redmi 9A", "Redmi 9", "Redmi 8", "Redmi 7A", "Redmi 7",
    "Redmi A3", "Redmi A2", "Redmi A1",
    // Poco
    "Poco X7 Pro", "Poco X7", "Poco X6 Pro", "Poco X6", "Poco X5 Pro", "Poco X5",
    "Poco X4 Pro", "Poco X3 Pro", "Poco X3 NFC",
    "Poco F6 Pro", "Poco F6", "Poco F5", "Poco F4", "Poco F3",
    "Poco M6 Pro", "Poco M6", "Poco M5", "Poco M4 Pro", "Poco M3",
    "Poco C65", "Poco C55",
  ],

  "Huawei": [
    "P60 Pro", "P60", "P50 Pro", "P50", "P40 Pro", "P40", "P40 Lite",
    "P30 Pro", "P30", "P30 Lite", "P20 Pro", "P20", "P20 Lite", "P Smart 2021", "P Smart 2019",
    "Mate 60 Pro", "Mate 50 Pro", "Mate 40 Pro", "Mate 30 Pro", "Mate 20 Pro", "Mate 20",
    "Nova 12", "Nova 11", "Nova 10", "Nova 9", "Nova 8", "Nova 7i", "Nova 5T", "Nova 3i",
    "Y9 Prime 2019", "Y9 2019", "Y9s", "Y8p", "Y7 Prime 2019", "Y7p", "Y6 2019", "Y6p", "Y5 2019",
    "Honor 8X (Huawei)", "MatePad 11", "MediaPad T5",
  ],

  "Honor": [
    "Honor Magic6 Pro", "Honor Magic5 Pro", "Honor Magic4 Pro",
    "Honor 200", "Honor 100", "Honor 90", "Honor 80", "Honor 70", "Honor 50",
    "Honor X9b", "Honor X9a", "Honor X9", "Honor X8b", "Honor X8a", "Honor X8",
    "Honor X7b", "Honor X7a", "Honor X7", "Honor X6a", "Honor X6",
    "Honor 8X", "Honor 9X", "Honor 10 Lite", "Honor 20", "Honor 9 Lite",
  ],

  "Oppo": [
    "Find X7 Ultra", "Find X5 Pro", "Find X3 Pro",
    "Reno 12", "Reno 11", "Reno 10", "Reno 8", "Reno 7", "Reno 6", "Reno 5", "Reno 4",
    "A98", "A96", "A94", "A78", "A77", "A76", "A74", "A58", "A57", "A55", "A54", "A53", "A52",
    "A38", "A31", "A18", "A17", "A16", "A15", "A12", "A5s", "A3s",
    "F21 Pro", "F19 Pro", "F11 Pro", "F9",
  ],

  "Vivo": [
    "X100 Pro", "X90 Pro", "X80",
    "V40", "V30", "V29", "V27", "V25", "V23", "V21", "V20",
    "Y36", "Y35", "Y33s", "Y31", "Y27", "Y22", "Y21", "Y20", "Y19", "Y17", "Y16", "Y15", "Y12", "Y11",
    "Y03", "Y02",
  ],

  "Realme": [
    "Realme GT 6", "Realme GT 5", "Realme GT Neo 5", "Realme GT Master", "Realme GT",
    "Realme 12 Pro+", "Realme 12", "Realme 11 Pro+", "Realme 11", "Realme 10 Pro", "Realme 10",
    "Realme 9 Pro+", "Realme 9", "Realme 8 Pro", "Realme 8", "Realme 7", "Realme 6",
    "Realme C67", "Realme C65", "Realme C55", "Realme C53", "Realme C35", "Realme C33",
    "Realme C30", "Realme C25", "Realme C21", "Realme C15", "Realme C11", "Realme C3",
    "Realme Note 50",
  ],

  "OnePlus": [
    "OnePlus 13", "OnePlus 12", "OnePlus 12R", "OnePlus 11", "OnePlus 10 Pro", "OnePlus 10T",
    "OnePlus 9 Pro", "OnePlus 9", "OnePlus 8 Pro", "OnePlus 8T", "OnePlus 8", "OnePlus 7T", "OnePlus 7 Pro",
    "OnePlus Nord 4", "OnePlus Nord 3", "OnePlus Nord CE 4", "OnePlus Nord CE 3", "OnePlus Nord CE 2",
    "OnePlus Nord N30", "OnePlus Nord N20",
  ],

  "Nokia": [
    "Nokia G60", "Nokia G50", "Nokia G42", "Nokia G21", "Nokia G20", "Nokia G11",
    "Nokia X30", "Nokia X20", "Nokia XR20",
    "Nokia C32", "Nokia C31", "Nokia C22", "Nokia C21", "Nokia C12", "Nokia C10",
    "Nokia 8.3", "Nokia 7.2", "Nokia 6.2", "Nokia 5.4", "Nokia 5.3", "Nokia 3.4", "Nokia 2.4", "Nokia 1.4",
    "Nokia 8000 4G", "Nokia 6310", "Nokia 5310", "Nokia 230", "Nokia 216", "Nokia 210",
    "Nokia 150", "Nokia 130", "Nokia 125", "Nokia 110", "Nokia 106", "Nokia 105", "Nokia 3310",
  ],

  "Motorola": [
    "Edge 50 Ultra", "Edge 50 Pro", "Edge 40 Pro", "Edge 40", "Edge 30",
    "Moto G85", "Moto G84", "Moto G73", "Moto G72", "Moto G60", "Moto G54", "Moto G53",
    "Moto G34", "Moto G32", "Moto G24", "Moto G23", "Moto G14", "Moto G13",
    "Moto E40", "Moto E32", "Moto E22", "Moto E13",
    "Razr 50 Ultra", "Razr 40 Ultra",
  ],

  "Google": [
    "Pixel 9 Pro XL", "Pixel 9 Pro", "Pixel 9", "Pixel 8a", "Pixel 8 Pro", "Pixel 8",
    "Pixel 7a", "Pixel 7 Pro", "Pixel 7", "Pixel 6a", "Pixel 6 Pro", "Pixel 6",
    "Pixel 5", "Pixel 4a", "Pixel 4 XL",
  ],

  "Sony": [
    "Xperia 1 VI", "Xperia 1 V", "Xperia 5 V", "Xperia 10 VI", "Xperia 10 V", "Xperia 10 IV",
    "Xperia 1 IV", "Xperia 5 IV", "Xperia XZ2", "Xperia XA2", "Xperia Z5",
  ],

  "LG": [
    "LG Wing", "LG Velvet", "LG V60 ThinQ", "LG V50 ThinQ", "LG V40 ThinQ",
    "LG G8 ThinQ", "LG G7 ThinQ", "LG G6",
    "LG K62", "LG K52", "LG K42", "LG K41s", "LG K40", "LG Q60", "LG Stylo 6",
  ],

  "HTC": [
    "HTC U23 Pro", "HTC U20", "HTC U12+", "HTC U11", "HTC Desire 22 Pro", "HTC Desire 21 Pro",
    "HTC Desire 20 Pro", "HTC One M10", "HTC One M9", "HTC One M8",
  ],

  "Tecno": [
    "Camon 30 Pro", "Camon 30", "Camon 20 Pro", "Camon 20", "Camon 19", "Camon 18",
    "Spark 20 Pro+", "Spark 20", "Spark 10 Pro", "Spark 10", "Spark 9", "Spark 8", "Spark 7",
    "Phantom X2", "Pova 6", "Pova 5", "Pova 4", "Pop 8", "Pop 7", "Pop 5",
  ],

  "Infinix": [
    "Note 40 Pro", "Note 40", "Note 30 Pro", "Note 30", "Note 12",
    "Hot 40 Pro", "Hot 40", "Hot 30", "Hot 20", "Hot 12", "Hot 11", "Hot 10",
    "Smart 8", "Smart 7", "Smart 6", "Smart 5", "Zero 30", "Zero 20",
  ],

  "ZTE": [
    "Blade V50", "Blade V40", "Blade A73", "Blade A72", "Blade A53", "Blade A52", "Blade A34",
    "Nubia Z60 Ultra", "Nubia Red Magic 9", "Axon 40",
  ],

  "Asus": [
    "ROG Phone 8 Pro", "ROG Phone 8", "ROG Phone 7", "ROG Phone 6", "ROG Phone 5",
    "Zenfone 11 Ultra", "Zenfone 10", "Zenfone 9", "Zenfone 8",
  ],

  "Lenovo": [
    "Legion Y90", "Legion Y70", "K14", "K13", "Tab M10", "Tab M9", "Tab P11",
  ],

  "TCL": [
    "TCL 50 SE", "TCL 40 SE", "TCL 40 R", "TCL 30", "TCL 20 Pro", "TCL 20 SE", "TCL 10L",
  ],

  "Alcatel": [
    "Alcatel 1S", "Alcatel 1B", "Alcatel 3L", "Alcatel 1SE", "Alcatel 1V",
  ],

  "Nothing": [
    "Phone (2a) Plus", "Phone (2a)", "Phone (2)", "Phone (1)", "CMF Phone 1",
  ],

  "Meizu": [
    "Meizu 21", "Meizu 20", "Meizu 18", "Meizu Note 9", "Meizu M6 Note",
  ],

  "BlackBerry": [
    "KEY2", "KEYone", "Passport", "Classic",
  ],

  "CAT": [
    "CAT S75", "CAT S62 Pro", "CAT S53", "CAT S42", "CAT B40",
  ],

  "Blackview": [
    "BV9300", "BV8900", "BV7200", "BV5300", "A96", "A85", "A55",
  ],

  "Doogee": [
    "S110", "S100", "S99", "V30", "X98", "N50",
  ],

  "GLX": [
    "GLX Shahin 3", "GLX Shahin 2", "GLX Sena 2", "GLX Pars", "GLX Aria", "GLX Tara",
    "GLX Zoom Me", "GLX B8", "GLX F5", "GLX 2690",
  ],

  "GPlus": [
    "GPlus X10", "GPlus Q20", "GPlus Q10", "GPlus S10", "GPlus P10", "GPlus Z10",
  ],
};

export const BRAND_NAMES = Object.keys(DEVICE_BRANDS);
