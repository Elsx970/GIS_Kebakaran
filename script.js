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

const iconSun = document.getElementById('iconSun');
const iconMoon = document.getElementById('iconMoon');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');

let heatLayer; 
let allData = []; 
let isPlaying = false;
let playInterval;
let searchMarker;

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

// Init
document.addEventListener('DOMContentLoaded', loadData);
