param([Parameter(Mandatory=$true)][string]$InputPath, [Parameter(Mandatory=$true)][string]$OutputPath)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Add-Type -Path @((Join-Path $root 'reference/unity/LearningEnums.cs'), (Join-Path $root 'reference/unity/LearningLocalGrammarChecker.cs'), (Join-Path $root 'reference/unity/OracleHarness.cs'))
[OracleHarness]::Run($InputPath, $OutputPath)
