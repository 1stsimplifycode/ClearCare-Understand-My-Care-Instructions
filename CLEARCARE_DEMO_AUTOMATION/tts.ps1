# Synthesises narration with the Windows built-in (OneCore) speech engine into WAV files.
# Usage: powershell -File tts.ps1 -InputJson lines.json -OutDir audio [-Voice "Microsoft Aria"]
# lines.json: [{ "id": "a01", "text": "..." }, ...]. Writes <id>.wav and durations.json.
param([string]$InputJson, [string]$OutDir, [string]$Voice = 'Zira', [double]$Rate = 0.95)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait() | Out-Null; $task.Result }
$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$v = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -like "*$Voice*" } | Select-Object -First 1
if ($v) { $synth.Voice = $v }
$synth.Options.SpeakingRate = $Rate
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$lines = Get-Content -Raw -Encoding UTF8 $InputJson | ConvertFrom-Json
$out = @{}
foreach ($l in $lines) {
  $stream = Await ($synth.SynthesizeTextToStreamAsync($l.text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $size = [uint32]$stream.Size
  $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
  $null = Await ($reader.LoadAsync($size)) ([uint32])
  $bytes = New-Object byte[] $size
  $reader.ReadBytes($bytes)
  $path = Join-Path $OutDir ($l.id + '.wav')
  [System.IO.File]::WriteAllBytes($path, $bytes)
  $out[$l.id] = $path
}
"voice: $($synth.Voice.DisplayName)"
