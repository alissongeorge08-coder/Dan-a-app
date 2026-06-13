$videosDir = ".\videos"
$out1080 = Join-Path $videosDir "1080p"
$out720 = Join-Path $videosDir "720p"
$out480 = Join-Path $videosDir "480p"
$ffmpegPath = "C:\Users\AGeor\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe"

if (!(Test-Path $out1080)) { New-Item -ItemType Directory -Path $out1080 | Out-Null }
if (!(Test-Path $out720)) { New-Item -ItemType Directory -Path $out720 | Out-Null }
if (!(Test-Path $out480)) { New-Item -ItemType Directory -Path $out480 | Out-Null }

$folders = @("Casal", "Cavalheiro", "Dama")
$totalFiles = 0
$processedFiles = 0

foreach ($folder in $folders) {
    $folderPath = Join-Path $videosDir $folder
    if (Test-Path $folderPath) {
        $files = Get-ChildItem -Path $folderPath -Filter "*.mov"
        $totalFiles += $files.Count
    }
}

Write-Host "Total files to process: $totalFiles"

foreach ($folder in $folders) {
    $folderPath = Join-Path $videosDir $folder
    if (Test-Path $folderPath) {
        $files = Get-ChildItem -Path $folderPath -Filter "*.mov"
        foreach ($file in $files) {
            $processedFiles++
            $baseName = $file.BaseName
            $inFile = $file.FullName
            
            $f1080 = Join-Path $out1080 "$baseName.mp4"
            $f720 = Join-Path $out720 "$baseName.mp4"
            $f480 = Join-Path $out480 "$baseName.mp4"
            
            if ((Test-Path $f1080) -and (Test-Path $f720) -and (Test-Path $f480)) {
                Write-Host "[$processedFiles/$totalFiles] Skipping $baseName (already exists)"
                continue
            }
            
            Write-Host "[$processedFiles/$totalFiles] Processing $baseName..."
            
            # Using crf 26 for 1080p to keep it under 100mb, and crf 28 for lower res
            $ffmpegArgs = @(
                "-i", $inFile,
                "-filter_complex", "[0:v]scale=-2:1080[v1080];[0:v]scale=-2:720[v720];[0:v]scale=-2:480[v480]",
                "-map", "[v1080]", "-map", "0:a?", "-c:v", "libx264", "-crf", "26", "-preset", "veryfast", "-c:a", "aac", "-b:a", "128k", "-y", $f1080,
                "-map", "[v720]", "-map", "0:a?", "-c:v", "libx264", "-crf", "28", "-preset", "veryfast", "-c:a", "aac", "-b:a", "128k", "-y", $f720,
                "-map", "[v480]", "-map", "0:a?", "-c:v", "libx264", "-crf", "28", "-preset", "veryfast", "-c:a", "aac", "-b:a", "128k", "-y", $f480
            )
            
            & $ffmpegPath @ffmpegArgs 2>&1 | Out-Null
        }
    }
}
Write-Host "All videos processed successfully."
