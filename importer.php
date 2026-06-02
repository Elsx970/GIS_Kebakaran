<?php
// importer.php
ini_set('memory_limit', '2048M');
set_time_limit(0); 

require_once 'config.php';

$dir = __DIR__ . '/Hasil/';
$files = glob($dir . '*.geojson');

if (empty($files)) {
    die("Tidak ada file GeoJSON ditemukan di folder Hasil/\n");
}

foreach ($files as $file) {
    $filename = basename($file);
    echo "Memproses $filename...\n";
    
    $content = file_get_contents($file);
    $data = json_decode($content, true);
    
    if (!$data || !isset($data['features'])) {
        echo "Format JSON tidak valid atau tidak memiliki features: $filename\n";
        continue;
    }
    
    if (strpos(strtolower($filename), 'hotspot') !== false) {
        $stmt = $conn->prepare("INSERT INTO titik_api (latitude, longitude, tahun) VALUES (?, ?, ?)");
        $count = 0;
        foreach ($data['features'] as $feature) {
            $props = $feature['properties'];
            $lat = isset($props['LATITUDE']) ? $props['LATITUDE'] : (isset($props['latitude']) ? $props['latitude'] : 0);
            $lng = isset($props['LONGITUDE']) ? $props['LONGITUDE'] : (isset($props['longitude']) ? $props['longitude'] : 0);
            
            $tahun = date('Y');
            if (isset($props['ACQ_DATE'])) {
                $tahun = (int)substr($props['ACQ_DATE'], 0, 4);
            }
            
            if ($lat != 0 && $lng != 0) {
                $stmt->bind_param("ddi", $lat, $lng, $tahun);
                if ($stmt->execute()) $count++;
            }
        }
        $stmt->close();
        echo "Berhasil import $count hotspot dari $filename ke titik_api.\n";
    } else {
        $layer_name = pathinfo($filename, PATHINFO_FILENAME);
        $conn->query("DELETE FROM spatial_layers WHERE layer_name = '" . $conn->real_escape_string($layer_name) . "'");
        
        $stmt = $conn->prepare("INSERT INTO spatial_layers (layer_name, properties, geom) VALUES (?, ?, ST_GeomFromGeoJSON(?))");
        $count = 0;
        $errorCount = 0;
        
        foreach ($data['features'] as $feature) {
            $geomJson = json_encode($feature['geometry']);
            $propsJson = json_encode($feature['properties']);
            
            $stmt->bind_param("sss", $layer_name, $propsJson, $geomJson);
            if ($stmt->execute()) {
                $count++;
            } else {
                $errorCount++;
            }
        }
        $stmt->close();
        echo "Berhasil import $count fitur (Gagal: $errorCount) dari $filename ke spatial_layers.\n";
    }
}
echo "Selesai!\n";
?>
