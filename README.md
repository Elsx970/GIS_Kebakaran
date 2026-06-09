# Web GIS Kebakaran Lampung

Platform Web GIS interaktif untuk memvisualisasikan data historis titik api (hotspot) kebakaran di Provinsi Lampung. Proyek ini dibangun dengan PHP, MySQL, Leaflet.js, dan Turf.js untuk Analisis Spasial (Modul Cerdas).

## Fitur Utama

*   **Peta Panas (Heatmap) Interaktif**: Visualisasi persebaran ribuan titik api dengan performa tinggi.
*   **Modul GIS Cerdas (Turf.js)**: 
    *   **Hazard Zoning**: Pemetaan area rawan dengan Hex Grid.
    *   **Jalur Evakuasi**: Simulasi rute evakuasi menjauhi area api.
    *   **Posko Darurat**: Rekomendasi penempatan posko.
    *   **Sekat Bakar**: Perencanaan parit mitigasi berbasis Convex Hull.
*   **Animasi Waktu (Timelapse)**: Fitur *playback* untuk pergerakan titik api dari tahun ke tahun.
*   **Layer Spasial Statis**: Menampilkan Batas Administrasi, Jalan, Sungai, Rawa, dsb. (Langsung me-*load* GeoJSON dari filesystem untuk performa maksimal tanpa membebani database).
*   **Mode Terang & Gelap**: *Light / Dark Mode* yang terintegrasi dengan basemap CartoDB.
*   **Admin Dashboard**:
    *   Autentikasi login aman (bcrypt).
    *   Input data titik api secara manual di peta.
    *   Impor data titik api massal via CSV.
    *   Grafik analitik tren kebakaran.

## Instalasi Super Cepat (One-Click Install)

Proyek ini telah dikonfigurasi agar **Sangat Profesional dan Rapi**. Tidak perlu lagi mengimpor file SQL manual berukuran ratusan MB. Anda cukup menjalankan skrip Installer.

### 1. Kloning Repositori
```bash
git clone https://github.com/username/repo-kebakaran.git
cd repo-kebakaran
```
*(Atau letakkan semua file di dalam folder `htdocs/kebakaran` jika Anda menggunakan XAMPP)*

### 2. Jalankan Installer Otomatis
1. Buka browser dan akses skrip installer:
   `http://localhost/kebakaran/install.php`
2. Skrip ini akan secara otomatis:
   * Membuat database `gis_kebakaran`.
   * Membuat tabel yang dibutuhkan.
   * Membuat akun Admin Default.
   * Mengimpor **8.000+** data titik api langsung dari file cache JSON ke database dalam hitungan detik.

### 3. Selesai!
Akses halaman utama di: `http://localhost/kebakaran/`

## Cara Penggunaan

### Halaman Admin
1.  Akses: `http://localhost/kebakaran/login.php`
2.  Kredensial *default* pasca-install:
    *   **Username**: `admin`
    *   **Password**: `admin123`

## Manajemen Data Spasial (GeoJSON)

Untuk menghindari kendala `max_allowed_packet` pada MySQL, **semua layer spasial (Batas wilayah, jalan, dll) sekarang dimuat langsung dari folder `Hasil/`**. 

Jika Anda ingin mengganti/menambah layer GeoJSON:
1. Masukkan file `.geojson` ke folder `Hasil/`.
2. Edit file `script.js` pada bagian `loadSpatialLayer('nama_file.geojson', ...)` untuk memunculkannya di kontrol peta.

## Teknologi

*   **Backend**: PHP 8.x, MySQLi
*   **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
*   **Libraries**:
    *   [Leaflet.js](https://leafletjs.com/) - Interactive Maps
    *   [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat) - Heatmap rendering
    *   [Turf.js](https://turfjs.org/) - Advanced Spatial Analysis
    *   [Chart.js](https://www.chartjs.org/) - Analytics chart
*   **Basemaps**: CartoDB (Dark & Light)
