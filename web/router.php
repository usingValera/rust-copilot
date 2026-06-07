<?php
/**
 * Web server bootstrap
 * Запускайте: php -S localhost:8080 router.php
 */

// Включение обработки ошибок
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Проверка запрашиваемого файла
$requested_file = __DIR__ . $_SERVER['REQUEST_URI'];

// Если это реальный файл или директория - обслужить её
if (is_file($requested_file) || is_dir($requested_file)) {
    return false;
}

// Иначе перенаправить на index.html
if (file_exists(__DIR__ . '/index.html')) {
    readfile(__DIR__ . '/index.html');
} else {
    http_response_code(404);
    echo "File not found";
}
