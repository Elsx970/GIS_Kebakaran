// Konfigurasi Peta Dasar
const cartoDark = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const cartoLight = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

let currentBaseMapUrl = cartoDark;
let baseMapLayer = L.tileLayer(currentBaseMapUrl, {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
});

const map = L.map('map', {
    zoomControl: false,
    layers: [baseMapLayer]
}).setView([-4.8523, 105.0228], 8);

L.control.zoom({ position: 'bottomright' }).addTo(map);

const heatLayerGroup = L.layerGroup().addTo(map);

// =============================
// Layer Control (Checkbox)
// =============================
const overlayMaps = {
    "Peta Panas (Heatmap)": heatLayerGroup
};
const layerControl = L.control.layers(null, overlayMaps, { position: 'topright', collapsed: true }).addTo(map);

// Load spatial layers from database
async function loadSpatialLayer(layerName, displayName, styleOptions, defaultOn) {
    try {
        const response = await fetch('api_layer.php?layer=' + layerName);
        const geojsonData = await response.json();
        
        if (geojsonData.error || !geojsonData.features || geojsonData.features.length === 0) {
            return;
        }

        const layer = L.geoJSON(geojsonData, {
            style: styleOptions,
            onEachFeature: function(feature, layer) {
                if (feature.properties) {
                    let html = '<div style="max-height:180px;overflow-y:auto;"><table style="width:100%;font-size:11px;border-collapse:collapse;">';
                    for (let key in feature.properties) {
                        html += '<tr><td style="padding:2px 6px;font-weight:600;color:#666;">' + key + '</td><td style="padding:2px 6px;">' + feature.properties[key] + '</td></tr>';
                    }
                    html += '</table></div>';
                    layer.bindPopup(html);
                }
            }
        });
        
        layerControl.addOverlay(layer, displayName);
        
        if (defaultOn) {
            layer.addTo(map);
        }
    } catch (e) {
        console.warn('Layer ' + layerName + ' gagal dimuat:', e);
    }
}

// =============================
// Referensi Elemen UI
// =============================
const yearSlider = document.getElementById('yearSlider');
const yearDisplay = document.getElementById('yearDisplay');
const totalPoints = document.getElementById('totalPoints');
const btnAllYears = document.getElementById('btnAllYears');
const themeToggle = document.getElementById('themeToggle');
const btnPlay = document.getElementById('btnPlay');
const hotspotList = document.getElementById('hotspotList');
const coordDisplay = document.getElementById('coordDisplay');
const searchInput = document.getElementById('searchInput');
const btnSearch = document.getElementById('btnSearch');

const modul1Toggle = document.getElementById('modul1Toggle');
const modul2Toggle = document.getElementById('modul2Toggle');
const modul3Toggle = document.getElementById('modul3Toggle');
const modul4Toggle = document.getElementById('modul4Toggle');

const iconSun = document.getElementById('iconSun');
const iconMoon = document.getElementById('iconMoon');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');

let heatLayer; 
let allData = []; 
let isPlaying = false;
let playInterval;
let searchMarker;

// Layer group untuk Modul Cerdas
const modulLayerGroup = L.layerGroup().addTo(map);
let hexGridLayer = null;
let evacuationRoutesLayer = null;
let poskoLayer = null;
let firebreakLayer = null;

// =============================
// Theme Toggle
// =============================
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    
    if (document.body.classList.contains('light-mode')) {
        iconSun.style.display = 'none';
        iconMoon.style.display = 'block';
        currentBaseMapUrl = cartoLight;
    } else {
        iconSun.style.display = 'block';
        iconMoon.style.display = 'none';
        currentBaseMapUrl = cartoDark;
    }
    
    baseMapLayer.setUrl(currentBaseMapUrl);
});

// =============================
// Coordinate Display on Mouse
// =============================
map.on('mousemove', function(e) {
    coordDisplay.textContent = 'Lat: ' + e.latlng.lat.toFixed(5) + ', Lng: ' + e.latlng.lng.toFixed(5);
});

// =============================
// Search Location (Nominatim)
// =============================
async function searchLocation() {
    const query = searchInput.value.trim();
    if (!query) return;

    try {
        const url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(query) + '&limit=1&viewbox=103.5,-6.1,106.5,-3.5&bounded=1';
        const resp = await fetch(url);
        const results = await resp.json();
        
        if (results.length > 0) {
            const lat = parseFloat(results[0].lat);
            const lng = parseFloat(results[0].lon);
            
            if (searchMarker) map.removeLayer(searchMarker);
            searchMarker = L.marker([lat, lng]).addTo(map).bindPopup('<b>' + results[0].display_name + '</b>').openPopup();
            map.flyTo([lat, lng], 13, { duration: 1.5 });
        } else {
            alert('Lokasi tidak ditemukan. Coba kata kunci lain.');
        }
    } catch (e) {
        console.error('Gagal mencari lokasi:', e);
    }
}

btnSearch.addEventListener('click', searchLocation);
searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') searchLocation();
});

// =============================
// Render Hotspot List
// =============================
function renderHotspotList(data) {
    hotspotList.innerHTML = '';
    
    const limit = Math.min(data.length, 50);
    
    if (limit === 0) {
        hotspotList.innerHTML = '<div class="hotspot-empty">Tidak ada data titik api.</div>';
        return;
    }

    for (let i = 0; i < limit; i++) {
        const point = data[i];
        const item = document.createElement('div');
        item.className = 'hotspot-item';
        item.innerHTML = '<span class="item-coords">' + point[0].toFixed(5) + ', ' + point[1].toFixed(5) + '</span><span class="item-year">Tahun ' + point[3] + '</span>';
        
        item.addEventListener('click', () => {
            map.flyTo([point[0], point[1]], 14, { duration: 1.5 });
        });
        
        hotspotList.appendChild(item);
    }
}

// =============================
// Render Heatmap
// =============================
function renderHeatmap(data) {
    if (heatLayer) {
        heatLayerGroup.removeLayer(heatLayer);
    }
    
    const heatData = data.map(point => [point[0], point[1], point[2]]);
    
    heatLayer = L.heatLayer(heatData, {
        radius: 20,
        blur: 25,
        maxZoom: 12,
        max: 1.0,
        gradient: {
            0.4: '#fbbf24', 
            0.7: '#f97316', 
            1.0: '#ef4444'  
        }
    });
    
    heatLayerGroup.addLayer(heatLayer);
    
    totalPoints.textContent = data.length.toLocaleString('id-ID');
    animateValue(totalPoints, 0, data.length, 1000);
    
    renderHotspotList(data);
}

// =============================
// Load Data
// =============================
async function loadData() {
    try {
        const response = await fetch('api.php');
        allData = await response.json();
        
        if (allData.length > 0) {
            const years = allData.map(d => d[3]);
            const minYear = Math.min(...years);
            const maxYear = Math.max(...years);
            
            yearSlider.min = minYear;
            yearSlider.max = maxYear;
            
            document.querySelector('.slider-labels span:first-child').textContent = minYear;
            document.querySelector('.slider-labels span:last-child').textContent = maxYear;
        }
        
        renderHeatmap(allData);
        yearSlider.value = parseInt(yearSlider.min) - 1; 
        
    } catch (error) {
        console.error("Gagal memuat data dari API:", error);
    }

    // Load spatial layers (checkbox di Layer Control)
    loadSpatialLayer('ADMINISTRASI_AR_KABKOTA', 'Batas Kabupaten/Kota', { color: '#ffffff', weight: 1.5, fillOpacity: 0.05, dashArray: '4 2' }, true);
    loadSpatialLayer('Administrasi_AR_Kecamatan', 'Batas Kecamatan', { color: '#94a3b8', weight: 0.7, fillOpacity: 0.02 }, false);
    loadSpatialLayer('Sungai', 'Sungai', { color: '#3b82f6', weight: 1.5 }, false);
    loadSpatialLayer('Rawa', 'Rawa', { color: '#0ea5e9', weight: 1, fillOpacity: 0.2 }, false);
    loadSpatialLayer('Jalan', 'Jalan', { color: '#f59e0b', weight: 0.8 }, false);
    loadSpatialLayer('HutanLahanRendah', 'Hutan Lahan Rendah', { color: '#22c55e', weight: 0, fillOpacity: 0.25 }, false);
    loadSpatialLayer('SemakBelukar', 'Semak Belukar', { color: '#84cc16', weight: 0, fillOpacity: 0.2 }, false);
    loadSpatialLayer('Permukiman', 'Permukiman', { color: '#f97316', weight: 0, fillOpacity: 0.25 }, false);
}

// =============================
// Slider Update
// =============================
function updateMapFromSlider() {
    const selectedYear = parseInt(yearSlider.value);
    
    if (selectedYear < parseInt(yearSlider.min)) {
        const totalYears = parseInt(yearSlider.max) - parseInt(yearSlider.min) + 1;
        yearDisplay.textContent = 'Semua (' + totalYears + ' Tahun)';
        yearDisplay.classList.add('highlight');
        renderHeatmap(allData);
    } else {
        yearDisplay.textContent = selectedYear;
        yearDisplay.classList.remove('highlight');
        
        const filteredData = allData.filter(point => point[3] === selectedYear);
        renderHeatmap(filteredData);
    }
    
    // Perbarui semua modul jika aktif karena data berubah
    if (modul1Toggle && modul1Toggle.checked) renderModul1();
    if (modul2Toggle && modul2Toggle.checked) renderModul2();
    if (modul3Toggle && modul3Toggle.checked) renderModul3();
    if (modul4Toggle && modul4Toggle.checked) renderModul4();
}

yearSlider.addEventListener('input', updateMapFromSlider);

// =============================
// Playback
// =============================
btnPlay.addEventListener('click', () => {
    if (isPlaying) {
        clearInterval(playInterval);
        isPlaying = false;
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    } else {
        isPlaying = true;
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        
        if (parseInt(yearSlider.value) >= parseInt(yearSlider.max) || parseInt(yearSlider.value) < parseInt(yearSlider.min)) {
            yearSlider.value = parseInt(yearSlider.min);
        }
        
        updateMapFromSlider();
        
        playInterval = setInterval(() => {
            let nextVal = parseInt(yearSlider.value) + 1;
            if (nextVal > parseInt(yearSlider.max)) {
                clearInterval(playInterval);
                isPlaying = false;
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
                return;
            }
            yearSlider.value = nextVal;
            updateMapFromSlider();
        }, 1500);
    }
});

// =============================
// Tampilkan Semua
// =============================
btnAllYears.addEventListener('click', () => {
    if (isPlaying) btnPlay.click();
    yearSlider.value = parseInt(yearSlider.min) - 1; 
    updateMapFromSlider();
});

// =============================
// Animasi Angka
// =============================
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString('id-ID');
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// =============================
// Modul Cerdas Logic
// =============================

// Modul 1: Hazard Zoning (Turf.js Hex Grid)
function renderModul1() {
    if (hexGridLayer) {
        modulLayerGroup.removeLayer(hexGridLayer);
        hexGridLayer = null;
    }
    if (!modul1Toggle.checked) return;

    // Ambil titik aktif saat ini (berdasarkan slider)
    const selectedYear = parseInt(yearSlider.value);
    let points = allData;
    if (selectedYear >= parseInt(yearSlider.min)) {
        points = allData.filter(p => p[3] === selectedYear);
    }

    if (points.length === 0) return;

    try {
        // Konversi ke format GeoJSON yang dipahami Turf.js
        const turfPoints = turf.featureCollection(points.map(p => turf.point([p[1], p[0]])));
        
        // Buat bounding box yang melingkupi semua titik (dengan sedikit padding)
        const bbox = turf.bbox(turfPoints);
        bbox[0] -= 0.1; bbox[1] -= 0.1; bbox[2] += 0.1; bbox[3] += 0.1;
        
        // Buat hex grid (ukuran sel 10 km)
        const cellSide = 10;
        const options = {units: 'kilometers'};
        const hexGrid = turf.hexGrid(bbox, cellSide, options);
        
        // Hitung jumlah titik di setiap hex
        const collected = turf.collect(hexGrid, turfPoints, 'intensity', 'values');
        
        hexGridLayer = L.geoJSON(collected, {
            style: function (feature) {
                const count = feature.properties.values ? feature.properties.values.length : 0;
                if (count === 0) return { fillOpacity: 0, opacity: 0, weight: 0 };
                
                let color = '#22c55e'; // Hijau (< 50)
                if (count >= 100) color = '#ef4444'; // Merah
                else if (count >= 50) color = '#eab308'; // Kuning
                
                return {
                    color: color,
                    weight: 1,
                    opacity: 0.8,
                    fillOpacity: 0.45
                };
            },
            onEachFeature: function(feature, layer) {
                const count = feature.properties.values ? feature.properties.values.length : 0;
                if (count > 0) {
                    let status = "Zona Hijau (Relatif Aman)";
                    if (count >= 100) status = "Zona Merah (Dilarang Masuk - Ancaman Maksimal)";
                    else if (count >= 50) status = "Zona Kuning (Siaga Evakuasi)";
                    
                    layer.bindPopup(`
                        <div style="font-family: 'Inter', sans-serif;">
                            <strong style="color:var(--bg-dark);">${status}</strong><br>
                            Kepadatan: <b>${count} Hotspot</b>
                        </div>
                    `);
                }
            }
        });
        
        modulLayerGroup.addLayer(hexGridLayer);
    } catch (e) {
        console.error("Modul 1 Error:", e);
    }
}

// Modul 2: Jalur Evakuasi Cerdas (Semi-Dinamis)
function renderModul2() {
    if (evacuationRoutesLayer) {
        modulLayerGroup.removeLayer(evacuationRoutesLayer);
        evacuationRoutesLayer = null;
    }
    if (!modul2Toggle.checked) return;

    const selectedYear = parseInt(yearSlider.value);
    let points = allData;
    if (selectedYear >= parseInt(yearSlider.min)) points = allData.filter(p => p[3] === selectedYear);
    if (points.length === 0) return;

    try {
        const turfPoints = turf.featureCollection(points.map(p => turf.point([p[1], p[0]])));
        const center = turf.center(turfPoints);
        
        // Titik pusat daratan Provinsi Lampung (Terbanggi Besar/Gunung Sugih)
        const lampungCenter = turf.point([105.0, -4.8]);
        
        // Hitung sudut (bearing) dari pusat api menuju ke tengah daratan Lampung (Inland)
        let inlandBearing = turf.bearing(center, lampungCenter);
        // Jika pusat api kebetulan berada persis di tengah daratan, arahkan evakuasi ke Utara
        if (Math.abs(inlandBearing) < 1) inlandBearing = 0;
        
        // Rute lari dari pusat api menuju area aman sejauh 20km ke arah dalam daratan (menghindari semua pesisir laut)
        const riskEdge = turf.destination(center, 3, inlandBearing, {units: 'kilometers'});
        const safeZoneCenter = turf.destination(center, 20, inlandBearing, {units: 'kilometers'});
        
        const routes = L.layerGroup();
        
        // Rute Primer (Lurus ke zona aman)
        const route1 = L.polyline([
            [riskEdge.geometry.coordinates[1], riskEdge.geometry.coordinates[0]],
            [safeZoneCenter.geometry.coordinates[1], safeZoneCenter.geometry.coordinates[0]]
        ], { color: '#22c55e', weight: 6, opacity: 0.9 }).bindPopup('<b>Rute Primer</b><br>Kapasitas besar, untuk roda 4 & kelompok rentan.');
        
        // Rute Sekunder (Menghindar / Berbelok lewat titik tengah offset)
        const midPoint = turf.midpoint(riskEdge, safeZoneCenter);
        // Offset rute sekunder 45 derajat dari arah utama
        const curvedMid = turf.destination(midPoint, 6, inlandBearing - 45, {units: 'kilometers'}); 
        const route2 = L.polyline([
            [riskEdge.geometry.coordinates[1], riskEdge.geometry.coordinates[0]],
            [curvedMid.geometry.coordinates[1], curvedMid.geometry.coordinates[0]],
            [safeZoneCenter.geometry.coordinates[1], safeZoneCenter.geometry.coordinates[0]]
        ], { color: '#eab308', weight: 4, dashArray: '8, 8', opacity: 0.9 }).bindPopup('<b>Rute Sekunder</b><br>Alternatif untuk roda 2 & jalan kaki.');
        
        // Titik Kumpul (Radius 1km di zona aman)
        const safeZoneCircle = turf.circle(safeZoneCenter, 1.5, {units: 'kilometers'});
        const safeZone = L.geoJSON(safeZoneCircle, {
            style: { color: '#22c55e', fillOpacity: 0.35, weight: 2 }
        }).bindPopup('<b>Titik Kumpul Aman</b>');
        
        routes.addLayer(route1);
        routes.addLayer(route2);
        routes.addLayer(safeZone);
        
        evacuationRoutesLayer = routes;
        modulLayerGroup.addLayer(evacuationRoutesLayer);
    } catch(e) { console.error("Modul 2 Error:", e); }
}

// Modul 3: Posko Darurat (Semi-Dinamis)
function renderModul3() {
    if (poskoLayer) {
        modulLayerGroup.removeLayer(poskoLayer);
        poskoLayer = null;
    }
    if (!modul3Toggle.checked) return;

    const selectedYear = parseInt(yearSlider.value);
    let points = allData;
    if (selectedYear >= parseInt(yearSlider.min)) points = allData.filter(p => p[3] === selectedYear);
    if (points.length === 0) return;

    try {
        const turfPoints = turf.featureCollection(points.map(p => turf.point([p[1], p[0]])));
        const center = turf.center(turfPoints);
        
        // Titik pusat daratan Provinsi Lampung
        const lampungCenter = turf.point([105.0, -4.8]);
        let inlandBearing = turf.bearing(center, lampungCenter);
        if (Math.abs(inlandBearing) < 1) inlandBearing = 0;
        
        // Penempatan Semi-Dinamis ditarik ke arah pedalaman (inland)
        const pPengungsian = turf.destination(center, 20, inlandBearing, {units: 'kilometers'}); 
        const pKesehatan = turf.destination(center, 12, inlandBearing + 30, {units: 'kilometers'}); // Serong 30 derajat
        const pLogistik = turf.destination(center, 15, inlandBearing - 30, {units: 'kilometers'});  // Serong -30 derajat

        const poskos = L.layerGroup();
        const iconPengungsian = L.divIcon({ className: 'custom-div-icon', html: '<div class="marker-tent"><i class="fa-solid fa-tent"></i></div>', iconSize: [28, 28] });
        const iconKesehatan = L.divIcon({ className: 'custom-div-icon', html: '<div class="marker-health"><i class="fa-solid fa-plus"></i></div>', iconSize: [28, 28] });
        const iconLogistik = L.divIcon({ className: 'custom-div-icon', html: '<div class="marker-logistic"><i class="fa-solid fa-box"></i></div>', iconSize: [28, 28] });
        
        poskos.addLayer(L.marker([pPengungsian.geometry.coordinates[1], pPengungsian.geometry.coordinates[0]], {icon: iconPengungsian}).bindPopup('<b>Posko Pengungsian</b><br>Ditempatkan di zona aman berjarak >20km dari pusat api.'));
        poskos.addLayer(L.marker([pKesehatan.geometry.coordinates[1], pKesehatan.geometry.coordinates[0]], {icon: iconKesehatan}).bindPopup('<b>Posko Kesehatan</b><br>Berdekatan dengan area intersepsi evakuasi.'));
        poskos.addLayer(L.marker([pLogistik.geometry.coordinates[1], pLogistik.geometry.coordinates[0]], {icon: iconLogistik}).bindPopup('<b>Posko Logistik</b><br>Akses suplai via rute timur.'));
        
        poskoLayer = poskos;
        modulLayerGroup.addLayer(poskoLayer);
    } catch(e) { console.error("Modul 3 Error:", e); }
}

// Modul 4: Sekat Bakar & Mitigasi (Semi-Dinamis Convex Hull)
function renderModul4() {
    if (firebreakLayer) {
        modulLayerGroup.removeLayer(firebreakLayer);
        firebreakLayer = null;
    }
    if (!modul4Toggle.checked) return;

    const selectedYear = parseInt(yearSlider.value);
    let points = allData;
    if (selectedYear >= parseInt(yearSlider.min)) points = allData.filter(p => p[3] === selectedYear);
    if (points.length === 0) return;

    try {
        const turfPoints = turf.featureCollection(points.map(p => turf.point([p[1], p[0]])));
        
        const mitigasi = L.layerGroup();
        
        // Buat Convex Hull melingkupi titik-titik terluar api, lalu buffer 2km
        let firebreakGeom = null;
        let excavatorLatLng = null;

        if (points.length >= 3) {
            const hull = turf.convex(turfPoints);
            if (hull) {
                const bufferedHull = turf.buffer(hull, 2, {units: 'kilometers'});
                firebreakGeom = bufferedHull;
                
                // Ambil koordinat pertama dari poligon untuk taruh eskavator
                const c = bufferedHull.geometry.coordinates[0][0];
                excavatorLatLng = [c[1], c[0]];
            }
        }
        
        // Fallback jika titik < 3 atau convex hull gagal
        if (!firebreakGeom) {
            const center = turf.center(turfPoints);
            firebreakGeom = turf.circle(center, 5, {units: 'kilometers'});
            excavatorLatLng = [center.geometry.coordinates[1], center.geometry.coordinates[0]];
        }

        // Layer Sekat Bakar (Polygon tanpa fill, batas putus-putus)
        const firebreakPoly = L.geoJSON(firebreakGeom, {
            style: { color: '#3b82f6', weight: 4, dashArray: '10, 10', opacity: 0.9, fillOpacity: 0 }
        }).bindPopup('<b>Rencana Sekat Bakar (Convex Hull)</b><br>Sistem melingkupi luasan ancaman api secara dinamis dengan buffer 2km.');
        
        const iconExcavator = L.divIcon({ className: 'custom-div-icon', html: '<div class="marker-excavator"><i class="fa-solid fa-truck-monster"></i></div>', iconSize: [28, 28] });
        const excavator = L.marker(excavatorLatLng, {icon: iconExcavator}).bindPopup('<b>Eskavator</b><br>Aktivitas: Penggalian Parit Mitigasi keliling area ancaman.');
        
        mitigasi.addLayer(firebreakPoly);
        mitigasi.addLayer(excavator);
        
        firebreakLayer = mitigasi;
        modulLayerGroup.addLayer(firebreakLayer);
    } catch(e) { console.error("Modul 4 Error:", e); }
}

// Bind Events
if (modul1Toggle) modul1Toggle.addEventListener('change', renderModul1);
if (modul2Toggle) modul2Toggle.addEventListener('change', renderModul2);
if (modul3Toggle) modul3Toggle.addEventListener('change', renderModul3);
if (modul4Toggle) modul4Toggle.addEventListener('change', renderModul4);

// Init
document.addEventListener('DOMContentLoaded', loadData);
