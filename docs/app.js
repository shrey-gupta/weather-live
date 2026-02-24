(function () {
  var startDateEl = document.getElementById("startDate");
  var windowSizeEl = document.getElementById("windowSize");
  var trainingYearsEl = document.getElementById("trainingYears");
  var runBtn = document.getElementById("runBtn");
  var dayViewEl = document.getElementById("dayView");
  var dayViewLabel = document.getElementById("dayViewLabel");
  var metricsEl = document.getElementById("metrics");
  var dailyCardsEl = document.getElementById("dailyCards");
  var canvas = document.getElementById("forecastMap");
  var ctx = canvas.getContext("2d");
  var projection = null;
  var path = null;
  var usNation = null;
  var usStateBorders = null;

  var lonMin = -125;
  var lonMax = -66;
  var latMin = 24;
  var latMax = 50;

  var current = { days: [], gridByDay: [], summary: null };

  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      var t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function toXY(lon, lat) {
    if (!projection) return null;
    return projection([lon, lat]);
  }

  function colorFor(mm) {
    var stops = [
      [0, [236, 248, 255]],
      [10, [167, 224, 255]],
      [20, [103, 177, 238]],
      [35, [57, 126, 202]],
      [50, [29, 79, 145]],
      [65, [18, 33, 59]]
    ];

    if (mm <= stops[0][0]) return "rgb(" + stops[0][1].join(",") + ")";
    if (mm >= stops[stops.length - 1][0]) return "rgb(" + stops[stops.length - 1][1].join(",") + ")";

    for (var i = 0; i < stops.length - 1; i++) {
      var a = stops[i];
      var b = stops[i + 1];
      if (mm >= a[0] && mm <= b[0]) {
        var t = (mm - a[0]) / (b[0] - a[0]);
        var r = Math.round(a[1][0] + (b[1][0] - a[1][0]) * t);
        var g = Math.round(a[1][1] + (b[1][1] - a[1][1]) * t);
        var bb = Math.round(a[1][2] + (b[1][2] - a[1][2]) * t);
        return "rgb(" + [r, g, bb].join(",") + ")";
      }
    }
    return "rgb(167,224,255)";
  }

  function dayOfYear(date) {
    var start = new Date(date.getFullYear(), 0, 0);
    var diff = date - start;
    return Math.floor(diff / 86400000);
  }

  function trainingBias(trainingKey) {
    if (trainingKey === "2000-2024") return 1.08;
    if (trainingKey === "2015-2024") return 0.95;
    return 1.0;
  }

  function generateForecast(startDateStr, windowSize, trainingKey) {
    if (!usNation) return { days: [], gridByDay: [] };

    var seed = hashString(startDateStr + "|" + windowSize + "|" + trainingKey);
    var rng = mulberry32(seed);
    var bias = trainingBias(trainingKey);
    var start = new Date(startDateStr + "T00:00:00");

    var days = [];
    var gridByDay = [];

    for (var d = 0; d < windowSize; d++) {
      var date = new Date(start);
      date.setDate(start.getDate() + d);
      var doy = dayOfYear(date);
      var seasonal = 0.45 + 0.55 * Math.sin((2 * Math.PI * (doy - 70)) / 365);

      var cells = [];
      var total = 0;
      var count = 0;

      for (var lat = latMin; lat <= latMax; lat += 1.1) {
        for (var lon = lonMin; lon <= lonMax; lon += 1.3) {
          if (!d3.geoContains(usNation, [lon, lat])) continue;

          var westLift = clamp((-(lon + 105)) / 20, 0, 1) * 8.4;
          var gulfFlow = clamp((31 - lat) / 8, 0, 1) * 7.1;
          var stormTrack = Math.exp(-Math.pow(lat - (39 + 3 * Math.sin((d + doy) / 16)), 2) / 28) * 10.5;
          var pacificBand = Math.exp(-Math.pow(lon + 122, 2) / 48) * (6 + 3 * seasonal);
          var convectiveNoise = rng() * 4.2;

          var mm = (2.5 + seasonal * 10.2 + westLift + gulfFlow + stormTrack + pacificBand + convectiveNoise) * bias;
          mm = clamp(mm, 0, 65);

          cells.push({ lon: lon, lat: lat, mm: mm });
          total += mm;
          count += 1;
        }
      }

      var avg = count ? total / count : 0;
      days.push({
        date: date,
        avg: avg,
        peak: cells.reduce(function (p, c) { return Math.max(p, c.mm); }, 0)
      });
      gridByDay.push(cells);
    }

    return { days: days, gridByDay: gridByDay };
  }

  function drawMap(dayIndex) {
    if (!path || !usNation) return;

    var cells = current.gridByDay[dayIndex] || [];

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, "#edf5ff");
    bg.addColorStop(1, "#dbeafe");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#9bb6d8";
    ctx.lineWidth = 1;
    for (var gx = 0; gx <= canvas.width; gx += 75) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, canvas.height);
      ctx.stroke();
    }
    for (var gy = 0; gy <= canvas.height; gy += 75) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(canvas.width, gy);
      ctx.stroke();
    }

    ctx.beginPath();
    path(usNation);
    ctx.fillStyle = "rgba(18, 33, 59, 0.26)";
    ctx.fill();

    var cw = 14;
    var ch = 11;
    cells.forEach(function (c) {
      var pt = toXY(c.lon, c.lat);
      if (!pt) return;
      ctx.fillStyle = colorFor(c.mm);
      ctx.globalAlpha = 0.9;
      ctx.fillRect(pt[0] - cw / 2, pt[1] - ch / 2, cw, ch);
    });
    ctx.globalAlpha = 1;

    ctx.beginPath();
    path(usNation);
    ctx.strokeStyle = "#1c3557";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (usStateBorders) {
      ctx.beginPath();
      path(usStateBorders);
      ctx.strokeStyle = "rgba(28, 53, 87, 0.5)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    ctx.fillStyle = "#17345a";
    ctx.font = "600 18px IBM Plex Mono";
    ctx.fillText("Continental US precipitation", 18, 28);
  }

  function formatDate(d) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function renderMetrics() {
    var days = current.days;
    var total = days.reduce(function (s, d) { return s + d.avg; }, 0);
    var avgWindow = days.length ? total / days.length : 0;
    var peak = days.reduce(function (m, d) { return Math.max(m, d.peak); }, 0);
    var wettest = days.reduce(function (best, d) { return d.avg > best.avg ? d : best; }, days[0] || { avg: 0, date: new Date() });

    metricsEl.innerHTML = [
      ["Window", days.length + " days"],
      ["Mean precipitation", avgWindow.toFixed(1) + " mm/day"],
      ["Peak cell", peak.toFixed(1) + " mm"],
      ["Wettest day", formatDate(wettest.date)]
    ].map(function (m) {
      return '<article class="metric"><div class="k">' + m[0] + '</div><div class="v">' + m[1] + '</div></article>';
    }).join("");
  }

  function renderDailyCards() {
    dailyCardsEl.innerHTML = current.days.map(function (d, i) {
      return (
        '<article class="dayCard">' +
        '<div class="date">Day ' + (i + 1) + ' · ' + formatDate(d.date) + '</div>' +
        '<div class="amount">' + d.avg.toFixed(1) + ' mm/day</div>' +
        '</article>'
      );
    }).join("");
  }

  function updateDateBounds() {
    var win = clamp(parseInt(windowSizeEl.value || "5", 10), 1, 14);
    windowSizeEl.value = String(win);

    var end = new Date("2025-12-31T00:00:00");
    end.setDate(end.getDate() - (win - 1));
    var max = end.toISOString().slice(0, 10);

    startDateEl.min = "2025-01-01";
    startDateEl.max = max;
    if (startDateEl.value > max) startDateEl.value = max;

    dayViewEl.max = String(win);
    if (parseInt(dayViewEl.value, 10) > win) dayViewEl.value = String(win);
  }

  function run() {
    if (!usNation) return;
    updateDateBounds();
    var start = startDateEl.value;
    var win = clamp(parseInt(windowSizeEl.value || "5", 10), 1, 14);
    var train = trainingYearsEl.value;

    current = generateForecast(start, win, train);
    renderMetrics();
    renderDailyCards();

    var dayIdx = clamp(parseInt(dayViewEl.value || "1", 10), 1, win) - 1;
    dayViewLabel.textContent = "Day " + (dayIdx + 1) + " · " + formatDate(current.days[dayIdx].date);
    drawMap(dayIdx);
  }

  windowSizeEl.addEventListener("input", function () {
    updateDateBounds();
  });

  dayViewEl.addEventListener("input", function () {
    if (!current.days.length) return;
    var idx = clamp(parseInt(dayViewEl.value || "1", 10), 1, current.days.length) - 1;
    dayViewLabel.textContent = "Day " + (idx + 1) + " · " + formatDate(current.days[idx].date);
    drawMap(idx);
  });

  runBtn.addEventListener("click", run);

  function initMapGeometry() {
    return fetch("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json")
      .then(function (resp) { return resp.json(); })
      .then(function (topology) {
        usNation = topojson.feature(topology, topology.objects.nation);
        usStateBorders = topojson.mesh(topology, topology.objects.states, function (a, b) { return a !== b; });
        projection = d3.geoAlbersUsa().fitExtent(
          [[20, 20], [canvas.width - 20, canvas.height - 20]],
          usNation
        );
        path = d3.geoPath(projection, ctx);
      })
      .catch(function () {
        runBtn.disabled = true;
        runBtn.textContent = "Map data failed to load";
      });
  }

  initMapGeometry().then(function () {
    updateDateBounds();
    run();
  });
})();
