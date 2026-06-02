<?php
session_start();
require_once 'config.php';

// Cek session
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header("Location: login.php");
    exit;
}

$message = '';

// Handle Export CSV
if (isset($_GET['export_csv'])) {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=data_titik_api_' . date('Ymd') . '.csv');
    $output = fopen('php://output', 'w');
    fputcsv($output, array('ID', 'Latitude', 'Longitude', 'Tahun', 'Tanggal Input'));
    
    $rows = $conn->query("SELECT * FROM titik_api ORDER BY tahun DESC");
    while ($row = $rows->fetch_assoc()) {
        fputcsv($output, $row);
    }
    fclose($output);
    exit;
}

// Handle Manual Input
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['add_manual'])) {
    $lat = (float)$_POST['latitude'];
    $lng = (float)$_POST['longitude'];
    $tahun = (int)$_POST['tahun'];

    $stmt = $conn->prepare("INSERT INTO titik_api (latitude, longitude, tahun) VALUES (?, ?, ?)");
    $stmt->bind_param("ddi", $lat, $lng, $tahun);

    if ($stmt->execute()) {
        $message = "<div class='alert success'>Data berhasil ditambahkan.</div>";
    } else {
        $message = "<div class='alert error'>Gagal menambah data: " . $conn->error . "</div>";
    }
    $stmt->close();
}

// Handle CSV Upload
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['upload_csv'])) {
    if (isset($_FILES["file_csv"]) && $_FILES["file_csv"]["error"] == 0) {
        $filename = $_FILES["file_csv"]["tmp_name"];
        $file = fopen($filename, "r");

        $count = 0;
        fgetcsv($file); // skip header

        $stmt = $conn->prepare("INSERT INTO titik_api (latitude, longitude, tahun) VALUES (?, ?, ?)");
        while (($column = fgetcsv($file, 10000, ",")) !== FALSE) {
            if (isset($column[0]) && isset($column[1]) && isset($column[2])) {
                $lat = (float) $column[0];
                $lng = (float) $column[1];
                $tahun = (int) $column[2];
                $stmt->bind_param("ddi", $lat, $lng, $tahun);
                if ($stmt->execute()) {
                    $count++;
                }
            }
        }
        $stmt->close();
        fclose($file);
        $message = "<div class='alert success'>Berhasil mengunggah $count data dari CSV.</div>";
    } else {
        $message = "<div class='alert error'>Gagal mengunggah file. Pastikan formatnya CSV.</div>";
    }
}

// Handle Delete All
if (isset($_GET['delete_all'])) {
    $conn->query("TRUNCATE TABLE titik_api");
    $message = "<div class='alert success'>Semua data berhasil dihapus.</div>";
}

// Handle Delete Single
if (isset($_GET['delete'])) {
    $id = (int) $_GET['delete'];
    $conn->query("DELETE FROM titik_api WHERE id = $id");
    $message = "<div class='alert success'>Data berhasil dihapus.</div>";
}

// Fetch Data for Table
$result = $conn->query("SELECT * FROM titik_api ORDER BY id DESC LIMIT 100");

// Fetch Data for Chart
$chartQuery = $conn->query("SELECT tahun, COUNT(*) as total FROM titik_api GROUP BY tahun ORDER BY tahun ASC");
$chartData = [];
$chartLabels = [];
while ($row = $chartQuery->fetch_assoc()) {
    $chartLabels[] = $row['tahun'];
    $chartData[] = $row['total'];
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Web GIS Kebakaran</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Leaflet CSS & JS untuk Admin Map -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <style>
        :root { --primary: #FF4B2B; --secondary: #FF416C; --dark: #1A1A2E; --light: #F4F7F6; --border: #E1E5EE; }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        body { background-color: var(--light); color: var(--dark); }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        h1 { font-size: 1.8rem; font-weight: 700; color: var(--dark); }
        .btn { padding: 0.6rem 1.2rem; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; text-decoration: none; display: inline-block; transition: 0.3s; }
        .btn-primary { background: linear-gradient(to right, var(--primary), var(--secondary)); color: white; }
        .btn-danger { background: #e74c3c; color: white; }
        .btn-success { background: #10b981; color: white; }
        .btn-outline { background: transparent; border: 1px solid var(--primary); color: var(--primary); }
        .btn-sm { padding: 0.4rem 0.8rem; font-size: 0.85rem; }
        .card { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); margin-bottom: 2rem; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.9rem; }
        .form-control { width: 100%; padding: 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.95rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        th, td { padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); }
        th { font-weight: 600; color: #666; font-size: 0.9rem; }
        tr:hover { background-color: #f9f9f9; }
        .alert { padding: 1rem; border-radius: 6px; margin-bottom: 1rem; font-weight: 500; }
        .success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .upload-box { border: 2px dashed var(--primary); padding: 2rem; text-align: center; border-radius: 12px; background: #fff5f5; }
        .upload-box input { margin-top: 1rem; }
        
        #adminMap { height: 250px; border-radius: 8px; margin-bottom: 1rem; border: 1px solid var(--border); }
        .chart-container { height: 300px; width: 100%; }
    </style>
</head>
<body>

    <div class="container">
        <div class="header">
            <div>
                <h1>Admin Dashboard GIS Kebakaran</h1>
                <p style="color:#666; margin-top:5px;">Selamat datang, <?= htmlspecialchars($_SESSION['admin_username']) ?></p>
            </div>
            <div>
                <a href="index.html" class="btn btn-outline" target="_blank">Lihat Peta (Public)</a>
                <a href="logout.php" class="btn btn-danger">Logout</a>
            </div>
        </div>

        <?= $message; ?>

        <!-- Grafik Analitik -->
        <div class="card">
            <h3>Analitik: Tren Titik Api per Tahun</h3>
            <div class="chart-container">
                <canvas id="trendChart"></canvas>
            </div>
        </div>

        <div class="grid-2">
            <!-- Form Manual -->
            <div class="card">
                <h3>Input Data Manual</h3>
                <p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem;">Klik pada peta untuk mendapatkan koordinat secara otomatis.</p>
                
                <div id="adminMap"></div>
                
                <form method="POST">
                    <div class="grid-2" style="gap:1rem;">
                        <div class="form-group">
                            <label>Latitude</label>
                            <input type="text" id="inputLat" name="latitude" class="form-control" required placeholder="-5.4254">
                        </div>
                        <div class="form-group">
                            <label>Longitude</label>
                            <input type="text" id="inputLng" name="longitude" class="form-control" required placeholder="105.2580">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Tahun Kejadian</label>
                        <input type="number" name="tahun" class="form-control" required placeholder="2026" min="2000" max="2050" value="<?= date('Y') ?>">
                    </div>
                    <button type="submit" name="add_manual" class="btn btn-primary">Simpan Data</button>
                </form>
            </div>

            <!-- Form CSV -->
            <div class="card">
                <h3>Upload File CSV (Dari QGIS)</h3>
                <p style="color: #666; font-size: 0.9rem; margin-bottom: 1.5rem;">Format CSV: Kolom 1 = Latitude, Kolom 2 = Longitude, Kolom 3 = Tahun. (Pengecualian baris pertama).</p>
                <form method="POST" enctype="multipart/form-data">
                    <div class="upload-box">
                        <h4 style="color: var(--primary);">Pilih File CSV</h4>
                        <input type="file" name="file_csv" accept=".csv" required>
                        <br><br>
                        <button type="submit" name="upload_csv" class="btn btn-primary">Mulai Upload</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Tabel Data -->
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3>Data Titik Api Terbaru (Limit 100)</h3>
                <div>
                    <a href="?export_csv=true" class="btn btn-success btn-sm">Unduh CSV</a>
                    <a href="?delete_all=true" class="btn btn-danger btn-sm" onclick="return confirm('Yakin ingin menghapus SEMUA data di database?');">Hapus Semua Data</a>
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Latitude</th>
                        <th>Longitude</th>
                        <th>Tahun</th>
                        <th>Tanggal Input</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($result->num_rows > 0): ?>
                        <?php while ($row = $result->fetch_assoc()): ?>
                            <tr>
                                <td><?= $row['id'] ?></td>
                                <td><?= $row['latitude'] ?></td>
                                <td><?= $row['longitude'] ?></td>
                                <td><strong><?= $row['tahun'] ?></strong></td>
                                <td><?= $row['created_at'] ?></td>
                                <td>
                                    <a href="?delete=<?= $row['id'] ?>" class="btn btn-danger btn-sm" onclick="return confirm('Hapus data ini?');">Hapus</a>
                                </td>
                            </tr>
                        <?php endwhile; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="6" style="text-align: center;">Belum ada data kebakaran.</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>

    <script>
        // --- 1. Konfigurasi Peta Klik (Admin Map) ---
        const map = L.map('adminMap').setView([-4.8523, 105.0228], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        let marker;
        const inputLat = document.getElementById('inputLat');
        const inputLng = document.getElementById('inputLng');

        map.on('click', function(e) {
            const lat = e.latlng.lat.toFixed(6);
            const lng = e.latlng.lng.toFixed(6);
            
            inputLat.value = lat;
            inputLng.value = lng;

            if (marker) {
                map.removeLayer(marker);
            }
            marker = L.marker([lat, lng]).addTo(map);
        });

        // --- 2. Konfigurasi Chart.js ---
        const ctx = document.getElementById('trendChart').getContext('2d');
        const labels = <?= json_encode($chartLabels) ?>;
        const data = <?= json_encode($chartData) ?>;
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Jumlah Titik Api',
                    data: data,
                    backgroundColor: '#FF4B2B',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    </script>
</body>
</html>