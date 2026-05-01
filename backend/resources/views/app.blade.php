<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Niger HMIS Outreach Admin</title>
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700" rel="stylesheet" />
    @viteReactRefresh
    @vite(['resources/css/admin.css', 'resources/js/app.jsx'])
</head>
<body>
    <div id="app"></div>
</body>
</html>
