# Web GIS Kebakaran Lampung

Platform Web GIS interaktif untuk memvisualisasikan data historis titik api (hotspot) kebakaran di Provinsi Lampung. Proyek ini dibangun dengan PHP murni, MySQL, dan Leaflet.js.

## Fitur Utama

*   **Peta Panas (Heatmap) Interaktif**: Visualisasi persebaran titik api dari tahun ke tahun.
*   **Animasi Waktu (Timelapse)**: Fitur *playback* untuk melihat pergerakan titik api secara animasi dari tahun 2017 - 2026.
*   **Layer Spasial Lengkap**: Mendukung data dari QGIS, termasuk Batas Administrasi (Kabupaten/Kecamatan), Sungai, Rawa, Jalan, Hutan, Semak Belukar, dan Permukiman.
*   **Mode Terang & Gelap**: Kemampuan mengubah tema (*Light / Dark Mode*) yang terintegrasi dengan perubahan warna basemap (CartoDB Dark/Light).
*   **Pencarian Lokasi**: Cari lokasi spesifik di peta menggunakan Nominatim API.
*   **Admin Dashboard**:
    *   Sistem otentikasi login admin yang aman (bcrypt).
    *   Input data titik api secara manual dengan klik pada peta.
    *   Impor data titik api massal (Bulk Import) menggunakan file CSV.
    *   Ekspor data titik api ke format CSV.
    *   Grafik analitik tren kebakaran tahunan menggunakan Chart.js.

## Persyaratan Sistem

*   Web Server: Apache (XAMPP / Laragon / LAMP)
*   PHP Version: >= 7.4
*   Database: MySQL atau MariaDB

## Instalasi

### 1. Kloning Repositori

```bash
git clone https://github.com/username/repo-kebakaran.git
cd repo-kebakaran
```

*(Atau letakkan semua file di dalam folder `htdocs/kebakaran` jika Anda menggunakan XAMPP)*

### 2. Konfigurasi Database

1.  Buka phpMyAdmin (atau *client* MySQL lainnya).
2.  Buat database baru dengan nama: `gis_kebakaran`.
3.  Impor file database:
    *   Buka menu **Import**.
    *   Pilih file `gis_kebakaran.sql` yang berada di dalam folder proyek.
    *   Klik **Go** untuk menjalankan impor.

> File ini sudah berisi skema lengkap (tabel `titik_api`, `spatial_layers`, dan `admin_users`) beserta **semua data titik api historis dan data spasial (batas wilayah, dsb.)** yang telah kita masukkan sebelumnya.

### 3. Konfigurasi Koneksi PHP

Buka file `config.php` dan sesuaikan pengaturan koneksi jika diperlukan (secara *default* sudah disetel untuk *local development* menggunakan XAMPP):

```php
$host = 'localhost';
$user = 'root';
$pass = ''; // Sesuaikan jika MySQL Anda memiliki password
$db   = 'gis_kebakaran';
```

## Cara Penggunaan

### Halaman Publik (Peta Interaktif)
Akses melalui *browser*: `http://localhost/kebakaran/`

### Halaman Admin
1.  Akses melalui *browser*: `http://localhost/kebakaran/login.php`
2.  Gunakan kredensial *default* berikut:
    *   **Username**: `admin`
    *   **Password**: `admin123`

## Impor Data Spasial Tambahan (Opsional)

Jika Anda memiliki data spasial berupa GeoJSON (hasil konversi dari Shapefile / SHP via QGIS):
1. Masukkan file GeoJSON ke dalam folder `Hasil/`.
2. Akses skrip importer via *browser*: `http://localhost/kebakaran/importer.php`.
3. Tunggu hingga proses selesai. Data spasial akan tersimpan di tabel `spatial_layers` (menggunakan tipe data `GEOMETRY`).
*Catatan: Pastikan konfigurasi `max_allowed_packet` di file `my.ini` (MySQL) Anda sudah diperbesar jika ukuran file GeoJSON sangat besar (misal > 10MB).*

## Teknologi yang Digunakan

*   **Backend**: PHP 8.x, MySQLi
*   **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
*   **Libraries**:
    *   [Leaflet.js](https://leafletjs.com/) - Interactive Maps
    *   [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat) - Heatmap rendering
    *   [Chart.js](https://www.chartjs.org/) - Analytics chart
*   **Basemaps**: CartoDB (Dark & Light)

---

Dibuat dengan ❤️ untuk pemetaan visual yang lebih baik.
