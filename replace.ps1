$mapping = @{
    'person' = 'user'; 'settings' = 'settings'; 'home' = 'home'; 'search' = 'search'; 'arrow_back' = 'arrow-left';
    'arrow_forward' = 'arrow-right'; 'close' = 'x'; 'check_circle' = 'circle-check-filled'; 'check' = 'check';
    'play_arrow' = 'player-play-filled'; 'pause' = 'player-pause-filled'; 'fast_forward' = 'player-skip-forward-filled';
    'fast_rewind' = 'player-skip-back-filled'; 'volume_up' = 'volume'; 'volume_off' = 'volume-3'; 'loop' = 'repeat';
    'high_quality' = 'hd'; 'lightbulb' = 'bulb'; 'menu' = 'menu-2'; 'logout' = 'logout'; 'emoji_events' = 'trophy-filled';
    'local_fire_department' = 'flame-filled'; 'star' = 'star-filled'; 'military_tech' = 'medal'; 'lock' = 'lock';
    'share' = 'share'; 'celebration' = 'confetti'; 'arrow_forward_ios' = 'chevron-right'; 'auto_awesome' = 'sparkles';
    'music_note' = 'music'; 'explore' = 'compass'; 'school' = 'school'
}

$files = @('index.html', 'js/app.js')
foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content -Path $file -Raw
        $content = [regex]::Replace($content, '<span([^>]*)class="[^"]*material-symbols-rounded[^"]*"([^>]*)>\s*(.*?)\s*</span>', {
            param($m)
            $before = $m.Groups[1].Value
            $after = $m.Groups[2].Value
            $iconName = $m.Groups[3].Value.Trim()
            $tablerName = $mapping[$iconName]
            if (-not $tablerName) { $tablerName = $iconName -replace '_','-' }
            return "<i$before class=`"ti ti-$tablerName`"$after></i>"
        })
        Set-Content -Path $file -Value $content -Encoding UTF8
    }
}
Write-Output "Done"
