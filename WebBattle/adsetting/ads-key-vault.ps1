param(
    [ValidateSet('init','status','copy','install')][string]$Action = 'status',
    [string]$Node = 'node'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$vaultDir = Join-Path $PSScriptRoot '../.runtime/secrets'
$vault = Join-Path $vaultDir 'levelplay-s2s.dpapi'
$entropy = [Text.Encoding]::UTF8.GetBytes('logos-card-game/levelplay-s2s/v1')
$scope = [Security.Cryptography.DataProtectionScope]::CurrentUser
if ($Action -eq 'init') {
    if (Test-Path -LiteralPath $vault) { throw 'Vault already exists; refusing to rotate the key.' }
    $random = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($random) } finally { $rng.Dispose() }
    $key = [BitConverter]::ToString($random).Replace('-','').ToLowerInvariant()
    $protected = [Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($key), $entropy, $scope)
    New-Item -ItemType Directory -Path $vaultDir -Force | Out-Null
    # CreateNew prevents accidental overwrite, including concurrent initialization.
    $stream = [IO.File]::Open($vault, [IO.FileMode]::CreateNew)
    try { $stream.Write($protected, 0, $protected.Length) } finally { $stream.Dispose() }
    $key = $null
    Write-Output 'Created a NEW LOCAL key. It is NOT registered in LevelPlay or Cloudflare yet.'
}
if (!(Test-Path -LiteralPath $vault)) { throw 'No local vault. Run init only after checking for an existing dashboard key.' }
$bytes = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($vault), $entropy, $scope)
try {
    $key = [Text.Encoding]::UTF8.GetString($bytes)
    # Existing LevelPlay callback keys can be shorter than newly generated keys.
    if ($key -notmatch '^[a-f0-9]{6,64}$') { throw 'Invalid vault contents.' }
    if ($Action -eq 'copy') {
        Set-Clipboard -Value $key
        Write-Output 'Copied to clipboard. Paste into LevelPlay S2S Private Key, then clear the clipboard.'
    } elseif ($Action -eq 'install') {
        # Explicit operator action only: first save this same key in the LevelPlay dashboard.
        $project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
        $config = Get-Content -LiteralPath (Join-Path $project 'wrangler.jsonc') -Raw
        if ($config -notmatch '"name"\s*:\s*"logos-card-battle-server"') { throw 'Unexpected Worker target.' }
        $start = New-Object Diagnostics.ProcessStartInfo
        $start.FileName = $Node
        $start.Arguments = 'node_modules/wrangler/bin/wrangler.js secret put LEVELPLAY_S2S_PRIVATE_KEY'
        $start.WorkingDirectory = $project
        $start.UseShellExecute = $false
        $start.RedirectStandardInput = $true
        $process = [Diagnostics.Process]::Start($start)
        $process.StandardInput.WriteLine($key)
        $process.StandardInput.Close()
        $process.WaitForExit()
        if ($process.ExitCode -ne 0) { throw 'Worker secret installation failed.' }
    } else {
        $hash = [Security.Cryptography.SHA256]::Create()
        try { $fingerprint = [BitConverter]::ToString($hash.ComputeHash($bytes)).Replace('-','').Substring(0,12) }
        finally { $hash.Dispose() }
        Write-Output ('Vault: ' + [IO.Path]::GetFullPath($vault))
        Write-Output ('Key length: ' + $key.Length)
        Write-Output ('Key fingerprint (not the key): ' + $fingerprint)
    }
} finally {
    [Array]::Clear($bytes, 0, $bytes.Length)
    $key = $null
}
