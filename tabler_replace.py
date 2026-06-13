import re
import os

files = ['index.html', 'js/app.js', 'css/style.css']
mapping = {
    'person': 'user',
    'settings': 'settings',
    'home': 'home',
    'search': 'search',
    'arrow_back': 'arrow-left',
    'arrow_forward': 'arrow-right',
    'close': 'x',
    'check_circle': 'circle-check-filled',
    'check': 'check',
    'play_arrow': 'player-play-filled',
    'pause': 'player-pause-filled',
    'fast_forward': 'player-skip-forward-filled',
    'fast_rewind': 'player-skip-back-filled',
    'volume_up': 'volume',
    'volume_off': 'volume-3',
    'loop': 'repeat',
    'high_quality': 'hd',
    'lightbulb': 'bulb',
    'menu': 'menu-2',
    'logout': 'logout',
    'emoji_events': 'trophy-filled',
    'local_fire_department': 'flame-filled',
    'star': 'star-filled',
    'military_tech': 'medal',
    'lock': 'lock',
    'share': 'share',
    'celebration': 'confetti',
    'arrow_forward_ios': 'chevron-right',
    'hd': 'hd',
    'auto_awesome': 'sparkles',
    'music_note': 'music',
    'explore': 'compass'
}

def replacer(match):
    # Match group 1 is any attributes before class, group 2 is attributes after class, group 3 is icon name
    before = match.group(1)
    after = match.group(2)
    icon_name = match.group(3).strip()
    
    tabler_name = mapping.get(icon_name, icon_name.replace('_', '-'))
    return f'<i {before} class="ti ti-{tabler_name}" {after}></i>'

for filepath in files:
    if not os.path.exists(filepath): continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # In HTML/JS: <span class="material-symbols-rounded">icon_name</span>
    # Sometimes it has other classes or attributes.
    content = re.sub(
        r'<span([^>]*)class="[^"]*material-symbols-rounded[^"]*"([^>]*)>\s*(.*?)\s*</span>', 
        replacer, 
        content
    )

    # In CSS: remove material-symbols-rounded references or replace them
    content = content.replace('material-symbols-rounded', 'ti')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Replaced Material with Tabler")
