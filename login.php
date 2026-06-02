<?php
session_start();
require_once 'config.php';

if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    header("Location: admin.php");
    exit;
}

$error = '';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = trim($_POST['username']);
    $password = trim($_POST['password']);
    
    $stmt = $conn->prepare("SELECT id, password_hash FROM admin_users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $stmt->store_result();
    
    if ($stmt->num_rows > 0) {
        $stmt->bind_result($id, $hashed_password);
        $stmt->fetch();
        
        if (password_verify($password, $hashed_password)) {
            $_SESSION['admin_logged_in'] = true;
            $_SESSION['admin_id'] = $id;
            $_SESSION['admin_username'] = $username;
            header("Location: admin.php");
            exit;
        } else {
            $error = "Password salah.";
        }
    } else {
        $error = "Username tidak ditemukan.";
    }
    $stmt->close();
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Admin - GIS Kebakaran</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        body {
            background: #0f172a;
            color: #f8fafc;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            position: relative;
            overflow: hidden;
        }
        /* Animated background glow */
        body::before {
            content: '';
            position: absolute;
            width: 500px; height: 500px;
            background: radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%);
            top: -100px; right: -100px;
            border-radius: 50%;
            animation: pulse 8s ease-in-out infinite alternate;
        }
        body::after {
            content: '';
            position: absolute;
            width: 400px; height: 400px;
            background: radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%);
            bottom: -80px; left: -80px;
            border-radius: 50%;
            animation: pulse 6s ease-in-out 1s infinite alternate;
        }
        @keyframes pulse {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(1.2); opacity: 1; }
        }

        .login-card {
            position: relative;
            z-index: 10;
            background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 2.5rem;
            border-radius: 16px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.5);
            width: 100%;
            max-width: 400px;
            text-align: center;
            animation: fadeUp 0.6s ease-out;
        }
        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .login-icon {
            font-size: 2.5rem;
            margin-bottom: 0.8rem;
        }
        h1 {
            font-size: 1.5rem;
            margin-bottom: 0.3rem;
            background: linear-gradient(135deg, #fbbf24, #ef4444);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 800;
        }
        .subtitle { color: #94a3b8; margin-bottom: 2rem; font-size: 0.88rem; }

        .form-group { text-align: left; margin-bottom: 1.5rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.85rem; color: #94a3b8; }
        .form-control {
            width: 100%; padding: 0.75rem 1rem;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px; font-size: 0.95rem;
            color: #f8fafc;
            transition: border-color 0.3s, box-shadow 0.3s;
        }
        .form-control::placeholder { color: #475569; }
        .form-control:focus {
            outline: none;
            border-color: #ef4444;
            box-shadow: 0 0 0 3px rgba(239,68,68,0.15);
        }

        .btn {
            width: 100%; padding: 0.85rem;
            border-radius: 8px; border: none; cursor: pointer;
            font-weight: 700; font-size: 0.95rem; color: white;
            background: linear-gradient(135deg, #FF4B2B, #FF416C);
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(239,68,68,0.3);
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(239,68,68,0.4);
        }
        .btn:active { transform: translateY(0); }

        .alert {
            padding: 0.85rem 1rem; border-radius: 8px;
            margin-bottom: 1.5rem; font-weight: 500; font-size: 0.85rem;
            background: rgba(239,68,68,0.15); color: #fca5a5;
            border: 1px solid rgba(239,68,68,0.25);
            text-align: left;
        }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="login-icon">🔥</div>
        <h1>Admin Dashboard</h1>
        <p class="subtitle">Web GIS Kebakaran Lampung</p>
        
        <?php if($error): ?>
            <div class="alert"><?= $error ?></div>
        <?php endif; ?>
        
        <form method="POST">
            <div class="form-group">
                <label>Username</label>
                <input type="text" name="username" class="form-control" placeholder="Masukkan username" required autofocus>
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" name="password" class="form-control" placeholder="Masukkan password" required>
            </div>
            <button type="submit" class="btn">Masuk ke Dashboard</button>
        </form>
    </div>
</body>
</html>
