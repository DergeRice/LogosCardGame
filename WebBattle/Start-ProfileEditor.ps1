$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
try { $null = Invoke-WebRequest 'http://127.0.0.1:5174/catalog' -TimeoutSec 2 } catch {
 Start-Process -FilePath (Get-Command node).Source -ArgumentList '--import','tsx','scripts/profile-editor.ts' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
 for ($attempt = 0; $attempt -lt 20; $attempt++) {
  Start-Sleep -Milliseconds 250
  try { $null = Invoke-WebRequest 'http://127.0.0.1:5174/catalog' -TimeoutSec 1; break } catch {}
 }
}
Start-Process 'http://127.0.0.1:5174'
