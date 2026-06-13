# =================================================================
#  BR + MOVIMENTO — Script de Deploy Completo
#  Clique direito → "Executar com PowerShell"
# =================================================================
#
#  O que este script faz:
#  1. Sobe os VIDEOS para o Cloudflare R2 (CDN gratuito)
#  2. Sobe o CÓDIGO para o GitHub (site gratuito via Pages)
#
# =================================================================

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

function Write-Step($n, $msg) {
    Write-Host ""
    Write-Host "── PASSO $n: $msg ──────────────────────────" -ForegroundColor Cyan
}

function Write-OK($msg)   { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  ❌ $msg" -ForegroundColor Red }
function Pause-Read($msg) { Write-Host "  👉 $msg" -ForegroundColor White; Read-Host "     Pressione ENTER quando pronto" }

Clear-Host
Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║      BR + MOVIMENTO — Deploy Setup        ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Magenta


# ═══════════════════════════════════════════════════════════════
# PARTE 1 — CLOUDFLARE R2 (vídeos)
# ═══════════════════════════════════════════════════════════════

Write-Step 1 "Configurar Cloudflare R2 para os vídeos"
Write-Host ""
Write-Host "  O R2 é gratuito até 10GB/mês de transferência."
Write-Host ""
Write-Host "  Faça isso agora no navegador:"
Write-Host "  ① Acesse: https://dash.cloudflare.com" -ForegroundColor White
Write-Host "  ② Crie uma conta gratuita (ou faça login)"
Write-Host "  ③ No menu esquerdo, clique em 'R2 Object Storage'"
Write-Host "  ④ Clique em 'Create bucket'"
Write-Host "  ⑤ Nome do bucket: br-movimento  (exatamente assim)"
Write-Host "  ⑥ Clique em 'Create bucket'"
Write-Host "  ⑦ Dentro do bucket → aba 'Settings' → 'Public Access' → 'Allow Access'"
Write-Host "  ⑧ Copie a URL pública (parece: https://pub-abc123.r2.dev)"
Write-Host ""
Pause-Read "Termine os passos acima antes de continuar"

$R2_PUBLIC_URL = Read-Host "  Cole a URL pública do bucket (ex: https://pub-abc123.r2.dev)"
$R2_PUBLIC_URL = $R2_PUBLIC_URL.TrimEnd('/')

Write-Step 2 "Instalar rclone (ferramenta de upload)"
Write-Host ""
if (Get-Command rclone -ErrorAction SilentlyContinue) {
    Write-OK "rclone já instalado"
} else {
    Write-Host "  Baixando rclone..." -ForegroundColor Gray
    $rcloneUrl = "https://downloads.rclone.org/rclone-current-windows-amd64.zip"
    $rcloneZip = "$env:TEMP\rclone.zip"
    $rcloneDir = "$env:TEMP\rclone"
    Invoke-WebRequest -Uri $rcloneUrl -OutFile $rcloneZip -UseBasicParsing
    Expand-Archive -Path $rcloneZip -DestinationPath $rcloneDir -Force
    $rcloneExe = Get-ChildItem "$rcloneDir\*\rclone.exe" | Select-Object -First 1
    Copy-Item $rcloneExe.FullName "$env:USERPROFILE\rclone.exe"
    $env:PATH += ";$env:USERPROFILE"
    Write-OK "rclone instalado"
}

Write-Step 3 "Credenciais do R2"
Write-Host ""
Write-Host "  Precisamos de uma chave de API do R2:"
Write-Host "  ① No painel do R2 → 'Manage R2 API Tokens'"
Write-Host "  ② Clique em 'Create API token'"
Write-Host "  ③ Permissões: 'Object Read & Write'"
Write-Host "  ④ Bucket: 'Specific bucket' → br-movimento"
Write-Host "  ⑤ Crie o token e copie:"
Write-Host "     - Account ID (está no painel inicial do R2)"
Write-Host "     - Access Key ID"
Write-Host "     - Secret Access Key"
Write-Host ""

$ACCOUNT_ID    = Read-Host "  Account ID"
$ACCESS_KEY    = Read-Host "  Access Key ID"
$SECRET_KEY    = Read-Host "  Secret Access Key"

# Criar config do rclone para R2
$rcloneConfig = @"
[r2]
type = s3
provider = Cloudflare
access_key_id = $ACCESS_KEY
secret_access_key = $SECRET_KEY
endpoint = https://$ACCOUNT_ID.r2.cloudflarestorage.com
acl = public-read
"@

$rcloneConfigPath = "$env:APPDATA\rclone\rclone.conf"
New-Item -ItemType Directory -Force -Path (Split-Path $rcloneConfigPath) | Out-Null
Set-Content -Path $rcloneConfigPath -Value $rcloneConfig -Encoding UTF8
Write-OK "rclone configurado para o R2"

Write-Step 4 "Upload dos vídeos para o R2"
Write-Host ""

$totalVideos = (Get-ChildItem "videos\480p\*.mp4", "videos\720p\*.mp4", "videos\1080p\*.mp4" -ErrorAction SilentlyContinue).Count
Write-Host "  Encontrados $totalVideos arquivos .mp4 para enviar" -ForegroundColor White
Write-Host "  Isso pode demorar alguns minutos dependendo da sua internet..." -ForegroundColor Gray
Write-Host ""

foreach ($q in @("480p", "720p", "1080p")) {
    $dir = "videos\$q"
    if (-not (Test-Path $dir)) { Write-Warn "Pasta $dir não encontrada, pulando"; continue }
    Write-Host "  Enviando $q..." -ForegroundColor Gray
    rclone copy $dir r2:br-movimento/$q --progress --transfers 4
    Write-OK "Videos $q enviados"
}

Write-Step 5 "Atualizar URL dos vídeos no código"
Write-Host ""

$mainJs = Get-Content "js\main.js" -Raw -Encoding UTF8
$mainJs = $mainJs -replace "const R2_BASE_URL = 'https://SEU_BUCKET\.r2\.dev'", "const R2_BASE_URL = '$R2_PUBLIC_URL'"
Set-Content "js\main.js" $mainJs -Encoding UTF8

$appJs = Get-Content "js\app.js" -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
if ($appJs) {
    $appJs = $appJs -replace "const R2_BASE_URL = 'https://SEU_BUCKET\.r2\.dev'", "const R2_BASE_URL = '$R2_PUBLIC_URL'"
    Set-Content "js\app.js" $appJs -Encoding UTF8
}
Write-OK "URLs atualizadas: $R2_PUBLIC_URL"


# ═══════════════════════════════════════════════════════════════
# PARTE 2 — GITHUB PAGES (código/site)
# ═══════════════════════════════════════════════════════════════

Write-Step 6 "GitHub — instalar CLI e fazer login"
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Err "Git não encontrado. Instale em: https://git-scm.com e rode o script novamente."
    pause; exit 1
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "  Baixando GitHub CLI..." -ForegroundColor Gray
    $ghUrl = "https://github.com/cli/cli/releases/latest/download/gh_2.45.0_windows_amd64.msi"
    $ghMsi = "$env:TEMP\gh_setup.msi"
    Invoke-WebRequest -Uri $ghUrl -OutFile $ghMsi -UseBasicParsing
    Start-Process msiexec.exe -Wait -ArgumentList "/i $ghMsi /quiet"
    $env:PATH += ";$env:ProgramFiles\GitHub CLI"
    Write-OK "GitHub CLI instalado"
}

Write-Host ""
Write-Host "  Fazendo login no GitHub..." -ForegroundColor Gray
gh auth login --web
Write-OK "Login GitHub OK"

Write-Step 7 "Criar repositório e publicar o site"
Write-Host ""

$REPO_NAME  = Read-Host "  Nome do repositório (ex: br-movimento)"
if (-not $REPO_NAME) { $REPO_NAME = "br-movimento" }

$GITHUB_USER = (gh api user --jq .login)
Write-OK "Usuário GitHub: $GITHUB_USER"

# Atualizar main.js com usuário/repo (para referências futuras)
git init
git add .
git commit -m "🎉 BR + Movimento — primeiro deploy"

gh repo create $REPO_NAME --public --source=. --remote=origin --push
Write-OK "Código enviado para github.com/$GITHUB_USER/$REPO_NAME"

Write-Step 8 "Ativar GitHub Pages"
Write-Host ""

gh api "repos/$GITHUB_USER/$REPO_NAME/pages" `
    --method POST `
    -f build_type=workflow `
    2>$null | Out-Null

Write-OK "GitHub Pages ativado via GitHub Actions"
Write-Host "  (o site fica pronto em ~2 minutos)" -ForegroundColor Gray


# ═══════════════════════════════════════════════════════════════
# RESUMO
# ═══════════════════════════════════════════════════════════════
Write-Host ""
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   🎉 Tudo pronto!                                    ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║                                                      ║" -ForegroundColor Green
Write-Host "║  🌐 Site (pronto em ~2 min):                         ║" -ForegroundColor Green
Write-Host "║  https://$GITHUB_USER.github.io/$REPO_NAME" -ForegroundColor White
Write-Host "║                                                      ║" -ForegroundColor Green
Write-Host "║  📹 Vídeos (já online):                              ║" -ForegroundColor Green
Write-Host "║  $R2_PUBLIC_URL/720p/D-01-A.mp4" -ForegroundColor White
Write-Host "║                                                      ║" -ForegroundColor Green
Write-Host "║  Para futuros updates de código:                     ║" -ForegroundColor Green
Write-Host "║  git add . && git commit -m 'update' && git push     ║" -ForegroundColor Gray
Write-Host "║                                                      ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
pause
