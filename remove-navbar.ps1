# Удаляет import Navbar и <Navbar /> из всех .tsx файлов кроме (public)/layout.tsx

$files = Get-ChildItem -Recurse -Filter "*.tsx" src/ | Where-Object {
    $_.FullName -notlike "*\(public\)\layout.tsx" -and
    $_.FullName -notlike "*/components/Navbar.tsx"
}

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    if ($content -match "import Navbar") {
        # Убираем строку импорта
        $content = $content -replace "import Navbar from '@/components/Navbar'\r?\n", ""
        $content = $content -replace 'import Navbar from "@/components/Navbar"\r?\n', ""
        
        # Убираем теги <Navbar /> и <Navbar>
        $content = $content -replace "\s*<Navbar\s*/>\r?\n?", ""
        $content = $content -replace "\s*<Navbar>\s*</Navbar>\r?\n?", ""
        
        Set-Content $file.FullName $content -Encoding UTF8 -NoNewline
        Write-Host "✓ $($file.FullName)"
    }
}

Write-Host "`nГотово!"
