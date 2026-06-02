<?php
header('Content-Type: application/json');
require_once 'config.php';

$result = $conn->query("SELECT latitude, longitude, 1 as intensity, tahun FROM titik_api");

$data = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $data[] = [
            (float)$row['latitude'],
            (float)$row['longitude'],
            (float)$row['intensity'],
            (int)$row['tahun']
        ];
    }
}

echo json_encode($data);
$conn->close();
?>
