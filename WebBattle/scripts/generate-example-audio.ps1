param([string]$WordsPath,[string]$OutputDirectory)
$ErrorActionPreference='Stop'
$taskWords=Get-Content -LiteralPath $WordsPath | ConvertFrom-Json
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$taskVoice=New-Object -ComObject SAPI.SpVoice
$taskEnglish=@($taskVoice.GetVoices() | Where-Object {$_.GetDescription() -match 'English.*United States'})
if(!$taskEnglish.Count){throw 'Install an English US Windows SAPI voice before generating audio.'}
$taskVoice.Voice=$taskEnglish[0]
$taskVoice.Rate=0
foreach($taskWord in $taskWords){
 $taskStream=New-Object -ComObject SAPI.SpFileStream
 $taskStream.Format.Type=18
 $taskStream.Open((Join-Path $OutputDirectory ($taskWord+'.wav')),3,$false)
 $taskVoice.AudioOutputStream=$taskStream
 [void]$taskVoice.Speak($taskWord)
 $taskStream.Close()
}
Write-Output ('Generated '+$taskWords.Count+' English vocabulary clips.')
