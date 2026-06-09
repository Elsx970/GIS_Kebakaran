<?php
// install.php - Auto Setup Script
ini_set('memory_limit', '1024M');
set_time_limit(0);

$host = 'localhost';
$user = 'root';
$pass = '';

echo "<h3>Memulai Instalasi Web GIS Kebakaran...</h3>";

// 1. Koneksi ke MySQL
$conn = new mysqli($host, $user, $pass);
if ($conn->connect_error) {
    die("Koneksi MySQL gagal: " . $conn->connect_error);
}

// 2. Buat Database
$sql = "CREATE DATABASE IF NOT EXISTS gis_kebakaran";
if ($conn->query($sql) === TRUE) {
    echo "Database 'gis_kebakaran' berhasil disiapkan.<br>";
} else {
    die("Error buat database: " . $conn->error);
}

$conn->select_db('gis_kebakaran');

// 3. Buat Tabel admin_users
$sql = "CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";
if ($conn->query($sql)) {
    echo "Tabel 'admin_users' siap.<br>";
}

// 4. Buat Tabel titik_api
$sql = "CREATE TABLE IF NOT EXISTS titik_api (
    id INT AUTO_INCREMENT PRIMARY KEY,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    tahun INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";
if ($conn->query($sql)) {
    echo "Tabel 'titik_api' siap.<br>";
}

// 5. Insert Default Admin
$password_hash = password_hash('admin123', PASSWORD_DEFAULT);
$conn->query("INSERT IGNORE INTO admin_users (username, password_hash) VALUES ('admin', '$password_hash')");
echo "Akun admin default siap (User: admin, Pass: admin123).<br>";

// 6. Import Data Hotspot (8000+ data)
echo "Mengimport data hotspot (8000+ titik)... Mohon tunggu.<br>";
$conn->query("TRUNCATE TABLE titik_api"); // Bersihkan data lama
$jsonFile = __DIR__ . '/data/hotspots.json';
if (file_exists($jsonFile)) {
    $data = json_decode(file_get_contents($jsonFile), true);
    if (is_array($data)) {
        $stmt = $conn->prepare("INSERT INTO titik_api (latitude, longitude, tahun) VALUES (?, ?, ?)");
        $count = 0;
        foreach ($data as $point) {
            $lat = $point[0];
            $lng = $point[1];
            $tahun = $point[3];
            $stmt->bind_param("ddi", $lat, $lng, $tahun);
            $stmt->execute();
            $count++;
        }
        $stmt->close();
        echo "<b>Berhasil import $count titik api!</b><br>";
    } else {
        echo "Data JSON tidak valid.<br>";
    }
} else {
    echo "File data/hotspots.json tidak ditemukan. Melewati import hotspot.<br>";
}

// 7. Selesai
echo "<h3 style='color:green;'>Instalasi Selesai!</h3>";
echo "<a href='index.html'>Buka Peta</a> | <a href='login.php'>Masuk Admin</a>";

$conn->close();
?>
