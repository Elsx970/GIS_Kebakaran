<?php
header('Content-Type: application/json');
require_once 'config.php';

$layer_name = isset($_GET['layer']) ? $_GET['layer'] : '';

if (empty($layer_name)) {
    echo json_encode(["error" => "Parameter layer dibutuhkan"]);
    exit;
}

$stmt = $conn->prepare("SELECT properties, ST_AsGeoJSON(geom) as geom FROM spatial_layers WHERE layer_name = ?");
$stmt->bind_param("s", $layer_name);
$stmt->execute();
$result = $stmt->get_result();

$features = [];
while ($row = $result->fetch_assoc()) {
    $features[] = [
        "type" => "Feature",
        "properties" => json_decode($row['properties'], true),
        "geometry" => json_decode($row['geom'], true)
    ];
}

$featureCollection = [
    "type" => "FeatureCollection",
    "name" => $layer_name,
    "features" => $features
];

echo json_encode($featureCollection);
$stmt->close();
$conn->close();
?>
