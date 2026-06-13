$files = @('index.html', 'js/app.js')
foreach ($file in $files) {
    if (Test-Path $file) {
        # Read the garbled UTF-8 text
        $text = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
        
        # Convert it back to bytes using Windows-1252 (ISO-8859-1)
        # This reverses the wrong "Get-Content" default encoding read
        $bytes = [System.Text.Encoding]::GetEncoding(1252).GetBytes($text)
        
        # Now decode those original bytes properly as UTF-8
        $fixedText = [System.Text.Encoding]::UTF8.GetString($bytes)
        
        # Write back correctly
        [System.IO.File]::WriteAllText($file, $fixedText, [System.Text.Encoding]::UTF8)
    }
}
Write-Output "Encoding Fixed"
