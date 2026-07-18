param(
    [string]$ProjectRoot = "C:\dev\fm-player-sorter",
    [string]$FmRoot = "D:\steam\steamapps\common\Football Manager 26"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$toolsRoot = Join-Path $ProjectRoot "tools\fm26-il2cpp"
$cpp2ilRoot = Join-Path $toolsRoot "cpp2il"
$outputRoot = Join-Path $toolsRoot "output"
$logPath = Join-Path $toolsRoot "cpp2il-run.log"
$manifestPath = Join-Path $toolsRoot "fm26-build-manifest.json"
$profilePath = Join-Path $toolsRoot "fm26-il2cpp-profile.json"
$summaryPath = Join-Path $toolsRoot "fm26-il2cpp-summary.txt"

$gameAssembly = Join-Path $FmRoot "GameAssembly.dll"
$metadata = Join-Path $FmRoot "fm_Data\il2cpp_data\Metadata\global-metadata.dat"
$fmExe = Join-Path $FmRoot "fm.exe"
$cecilPath = Join-Path $FmRoot "BepInEx\core\Mono.Cecil.dll"

$nightlyUrl =
    "https://nightly.link/SamboyCoding/Cpp2IL/workflows/dotnet-core/development/Cpp2IL-net9-win-x64.zip"

function Require-File {
    param(
        [string]$Path,
        [string]$Description
    )

    if (-not (Test-Path $Path -PathType Leaf)) {
        throw "Brak $Description`: $Path"
    }
}

function Get-Sha256 {
    param([string]$Path)

    return (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-FileInfo {
    param([string]$Path)

    $item = Get-Item $Path

    [ordered]@{
        path = $item.FullName
        size = $item.Length
        lastWriteUtc = $item.LastWriteTimeUtc.ToString("O")
        sha256 = Get-Sha256 $item.FullName
    }
}

function Get-AttributeData {
    param($Attribute)

    $constructor = @(
        $Attribute.ConstructorArguments | ForEach-Object {
            [ordered]@{
                type = $_.Type.FullName
                value = if ($null -eq $_.Value) { $null } else { [string]$_.Value }
            }
        }
    )

    $properties = [ordered]@{}
    foreach ($property in $Attribute.Properties) {
        $properties[$property.Name] =
            if ($null -eq $property.Argument.Value) {
                $null
            } else {
                [string]$property.Argument.Value
            }
    }

    $fields = [ordered]@{}
    foreach ($field in $Attribute.Fields) {
        $fields[$field.Name] =
            if ($null -eq $field.Argument.Value) {
                $null
            } else {
                [string]$field.Argument.Value
            }
    }

    [ordered]@{
        type = $Attribute.AttributeType.FullName
        constructor = $constructor
        properties = $properties
        fields = $fields
    }
}

function Get-AllTypes {
    param([Mono.Cecil.TypeDefinition[]]$Types)

    $result = New-Object System.Collections.Generic.List[object]

    foreach ($type in $Types) {
        $result.Add($type)

        if ($type.HasNestedTypes) {
            foreach ($nested in Get-AllTypes -Types $type.NestedTypes) {
                $result.Add($nested)
            }
        }
    }

    return $result
}

Require-File $gameAssembly "GameAssembly.dll"
Require-File $metadata "global-metadata.dat"
Require-File $fmExe "fm.exe"
Require-File $cecilPath "Mono.Cecil.dll z BepInEx"

New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null
New-Item -ItemType Directory -Force -Path $cpp2ilRoot | Out-Null

$versionInfo = (Get-Item $fmExe).VersionInfo

$manifest = [ordered]@{
    generatedAtUtc = (Get-Date).ToUniversalTime().ToString("O")
    fmRoot = $FmRoot
    fmVersion = $versionInfo.ProductVersion
    fmFileVersion = $versionInfo.FileVersion
    fmExe = Get-FileInfo $fmExe
    gameAssembly = Get-FileInfo $gameAssembly
    globalMetadata = Get-FileInfo $metadata
}

$manifest |
    ConvertTo-Json -Depth 10 |
    Set-Content -Path $manifestPath -Encoding UTF8

Write-Host ""
Write-Host "Profil plików:"
Write-Host "FM:             $($manifest.fmVersion)"
Write-Host "GameAssembly:   $($manifest.gameAssembly.sha256)"
Write-Host "global-metadata $($manifest.globalMetadata.sha256)"

$cpp2ilExe = Get-ChildItem $cpp2ilRoot -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Name -match '^Cpp2IL.*\.exe$'
    } |
    Select-Object -First 1

if (-not $cpp2ilExe) {
    $zipPath = Join-Path $toolsRoot "cpp2il-win-x64.zip"

    Write-Host ""
    Write-Host "Pobieram aktualny natywny build Cpp2IL..."
    Invoke-WebRequest `
        -Uri $nightlyUrl `
        -OutFile $zipPath `
        -Headers @{ "User-Agent" = "FMPlayerSorter" }

    if (Test-Path $cpp2ilRoot) {
        Remove-Item -Recurse -Force $cpp2ilRoot
    }

    New-Item -ItemType Directory -Force -Path $cpp2ilRoot | Out-Null
    Expand-Archive -Path $zipPath -DestinationPath $cpp2ilRoot -Force

    $cpp2ilExe = Get-ChildItem $cpp2ilRoot -Recurse -File |
        Where-Object {
            $_.Name -match '^Cpp2IL.*\.exe$'
        } |
        Select-Object -First 1
}

if (-not $cpp2ilExe) {
    throw "Nie znaleziono Cpp2IL.exe po pobraniu i rozpakowaniu."
}

Write-Host "Cpp2IL: $($cpp2ilExe.FullName)"

if (Test-Path $outputRoot) {
    Remove-Item -Recurse -Force $outputRoot
}
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

Write-Host ""
Write-Host "Sprawdzam formaty wyjściowe Cpp2IL..."

# Cpp2IL zapisuje część komunikatów na STDERR nawet wtedy, gdy polecenie
# kończy się poprawnie. Windows PowerShell 5.1 potrafi zamienić taki zapis
# na NativeCommandError, dlatego uruchamiamy proces przez Start-Process.
function Invoke-NativeTool {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$StdOutPath,
        [string]$StdErrPath
    )

    Remove-Item $StdOutPath, $StdErrPath -Force -ErrorAction SilentlyContinue

    $argumentLine = ($Arguments | ForEach-Object {
        if ($_ -match '\s' -and $_ -notmatch '^".*"$') {
            '"' + ($_ -replace '"', '\\"') + '"'
        }
        else {
            $_
        }
    }) -join ' '

    $process = Start-Process `
        -FilePath $FilePath `
        -ArgumentList $argumentLine `
        -WorkingDirectory (Split-Path $FilePath -Parent) `
        -NoNewWindow `
        -Wait `
        -PassThru `
        -RedirectStandardOutput $StdOutPath `
        -RedirectStandardError $StdErrPath

    $stdout = if (Test-Path $StdOutPath) {
        Get-Content $StdOutPath -Raw -ErrorAction SilentlyContinue
    }
    else {
        ""
    }

    $stderr = if (Test-Path $StdErrPath) {
        Get-Content $StdErrPath -Raw -ErrorAction SilentlyContinue
    }
    else {
        ""
    }

    [ordered]@{
        exitCode = $process.ExitCode
        stdout = $stdout
        stderr = $stderr
        combined = (($stdout, $stderr) -join [Environment]::NewLine).Trim()
    }
}

$listStdOut = Join-Path $toolsRoot "cpp2il-formats.stdout.log"
$listStdErr = Join-Path $toolsRoot "cpp2il-formats.stderr.log"
$listResult = Invoke-NativeTool `
    -FilePath $cpp2ilExe.FullName `
    -Arguments @("--list-output-formats") `
    -StdOutPath $listStdOut `
    -StdErrPath $listStdErr

$formatsText = $listResult.combined
$formatsText | Set-Content `
    -Path (Join-Path $toolsRoot "cpp2il-output-formats.txt") `
    -Encoding UTF8

if ($listResult.exitCode -ne 0) {
    throw "Nie udało się odczytać formatów Cpp2IL. Sprawdź cpp2il-formats.stderr.log."
}

# Nie używamy dll_il_recovery. Ten format włącza analizę ciał metod,
# której nie potrzebujemy do profilu offsetów/RVA i która wywaliła się
# w aktualnym nightly na FM26. Potrzebne metadane wstrzykuje processor
# attributeinjector.
$preferredFormats = @(
    "dll_empty",
    "dll_default",
    "dummydll"
)

$availableFormats = @(
    $preferredFormats | Where-Object {
        $formatsText -match ("(?im)^\s*" + [regex]::Escape($_) + "(?:\s|$)") -or
        $formatsText -match [regex]::Escape($_)
    }
)

if ($availableFormats.Count -eq 0) {
    throw (
        "Cpp2IL nie udostępnia żadnego bezpiecznego formatu DLL " +
        "(dll_empty, dll_default, dummydll). Lista została zapisana w " +
        (Join-Path $toolsRoot "cpp2il-output-formats.txt")
    )
}

$selectedOutputFormat = $null
$attemptLogs = New-Object System.Collections.Generic.List[string]

foreach ($candidateFormat in $availableFormats) {
    if (Test-Path $outputRoot) {
        Remove-Item -Recurse -Force $outputRoot
    }
    New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

    $attemptStdOut = Join-Path $toolsRoot "cpp2il-$candidateFormat.stdout.log"
    $attemptStdErr = Join-Path $toolsRoot "cpp2il-$candidateFormat.stderr.log"

    $cpp2ilArgs = @(
        "--game-path=$FmRoot",
        "--exe-name=fm",
        "--output-to=$outputRoot",
        "--output-as=$candidateFormat",
        "--use-processor",
        "attributeinjector",
        "--verbose"
    )

    Write-Host ""
    Write-Host "Uruchamiam Cpp2IL: $candidateFormat + attributeinjector"
    Write-Host "Bez odzyskiwania IL i bez analizy ciał metod."

    $attempt = Invoke-NativeTool `
        -FilePath $cpp2ilExe.FullName `
        -Arguments $cpp2ilArgs `
        -StdOutPath $attemptStdOut `
        -StdErrPath $attemptStdErr

    $attempt.combined | Tee-Object -FilePath $logPath
    $attemptLogs.Add(
        "$candidateFormat -> exit $($attempt.exitCode); stdout=$attemptStdOut; stderr=$attemptStdErr"
    )

    $dllCount = @(
        Get-ChildItem $outputRoot -Recurse -File -Filter *.dll -ErrorAction SilentlyContinue
    ).Count

    if ($attempt.exitCode -eq 0 -and $dllCount -gt 0) {
        $selectedOutputFormat = $candidateFormat
        Write-Host "Cpp2IL zakończony poprawnie. DLL: $dllCount"
        break
    }

    Write-Warning (
        "Format $candidateFormat nie powiódł się " +
        "(exit $($attempt.exitCode), DLL: $dllCount). Próbuję kolejnego."
    )
}

if (-not $selectedOutputFormat) {
    $attemptLogs | Set-Content `
        -Path (Join-Path $toolsRoot "cpp2il-attempts.txt") `
        -Encoding UTF8

    throw (
        "Cpp2IL nie utworzył DLL w żadnym bezpiecznym formacie. " +
        "Sprawdź cpp2il-attempts.txt oraz logi *.stderr.log w $toolsRoot"
    )
}

$outputFormat = $selectedOutputFormat
$generatedDlls = Get-ChildItem $outputRoot -Recurse -File -Filter *.dll

if (-not $generatedDlls) {
    throw "Cpp2IL nie utworzył bibliotek DLL. Sprawdź log: $logPath"
}

Add-Type -Path $cecilPath

$resolver = New-Object Mono.Cecil.DefaultAssemblyResolver
$resolver.AddSearchDirectory((Split-Path $cecilPath -Parent))

foreach ($dir in ($generatedDlls.DirectoryName | Sort-Object -Unique)) {
    $resolver.AddSearchDirectory($dir)
}

$readerParams = New-Object Mono.Cecil.ReaderParameters
$readerParams.AssemblyResolver = $resolver
$readerParams.ReadSymbols = $false
$readerParams.InMemory = $true

$assemblyNamePattern = '^(FM\.|SI\.|FMGame$)'
$typePattern =
    '(?i)(GamePlugin|GameInteropSubsystem|InteropDataHandler|ChannelData|ChannelAction|' +
    'PropertyID|TypedValue|InteropReference|PersonSearch|PersonFilter|PersonReference|' +
    'DatabaseRecord|PlayerAttribute|CurrentAbility|PotentialAbility|Contract|Injury|' +
    'PlayerForm|ScoutingInfo|PlayingHistory|SquadSelection|Club|Team|Nation|Competition)'

$profileAssemblies = New-Object System.Collections.Generic.List[object]
$totalTypes = 0

foreach ($dll in $generatedDlls) {
    try {
        $assembly = [Mono.Cecil.AssemblyDefinition]::ReadAssembly(
            $dll.FullName,
            $readerParams
        )
    }
    catch {
        continue
    }

    try {
        $assemblyName = $assembly.Name.Name

        if ($assemblyName -notmatch $assemblyNamePattern) {
            continue
        }

        $selectedTypes = New-Object System.Collections.Generic.List[object]

        foreach ($type in Get-AllTypes -Types $assembly.MainModule.Types) {
            if ($type.FullName -notmatch $typePattern) {
                continue
            }

            $fields = @(
                $type.Fields | ForEach-Object {
                    [ordered]@{
                        name = $_.Name
                        type = $_.FieldType.FullName
                        isStatic = $_.IsStatic
                        attributes = @(
                            $_.CustomAttributes | ForEach-Object {
                                Get-AttributeData $_
                            }
                        )
                    }
                }
            )

            $properties = @(
                $type.Properties | ForEach-Object {
                    [ordered]@{
                        name = $_.Name
                        type = $_.PropertyType.FullName
                        attributes = @(
                            $_.CustomAttributes | ForEach-Object {
                                Get-AttributeData $_
                            }
                        )
                    }
                }
            )

            $methods = @(
                $type.Methods | ForEach-Object {
                    [ordered]@{
                        name = $_.Name
                        returnType = $_.ReturnType.FullName
                        isStatic = $_.IsStatic
                        parameters = @(
                            $_.Parameters | ForEach-Object {
                                [ordered]@{
                                    name = $_.Name
                                    type = $_.ParameterType.FullName
                                }
                            }
                        )
                        attributes = @(
                            $_.CustomAttributes | ForEach-Object {
                                Get-AttributeData $_
                            }
                        )
                    }
                }
            )

            $selectedTypes.Add(
                [ordered]@{
                    fullName = $type.FullName
                    namespace = $type.Namespace
                    name = $type.Name
                    baseType = if ($type.BaseType) { $type.BaseType.FullName } else { $null }
                    isEnum = $type.IsEnum
                    typeAttributes = @(
                        $type.CustomAttributes | ForEach-Object {
                            Get-AttributeData $_
                        }
                    )
                    fields = $fields
                    properties = $properties
                    methods = $methods
                }
            )

            $totalTypes++
        }

        if ($selectedTypes.Count -gt 0) {
            $profileAssemblies.Add(
                [ordered]@{
                    name = $assemblyName
                    version = [string]$assembly.Name.Version
                    path = $dll.FullName
                    types = $selectedTypes
                }
            )
        }
    }
    finally {
        $assembly.Dispose()
    }
}

$profile = [ordered]@{
    generatedAtUtc = (Get-Date).ToUniversalTime().ToString("O")
    purpose = "FM26 external read-only memory profile"
    architecture = "Unity IL2CPP"
    build = $manifest
    cpp2il = [ordered]@{
        executable = $cpp2ilExe.FullName
        outputFormat = $outputFormat
        outputDirectory = $outputRoot
        log = $logPath
    }
    selectedTypeCount = $totalTypes
    assemblies = $profileAssemblies
}

$profile |
    ConvertTo-Json -Depth 40 |
    Set-Content -Path $profilePath -Encoding UTF8

$summary = New-Object System.Collections.Generic.List[string]
$summary.Add("FM26 IL2CPP PROFILE")
$summary.Add("FM version: $($manifest.fmVersion)")
$summary.Add("GameAssembly SHA-256: $($manifest.gameAssembly.sha256)")
$summary.Add("Metadata SHA-256: $($manifest.globalMetadata.sha256)")
$summary.Add("Cpp2IL format: $outputFormat")
$summary.Add("Selected types: $totalTypes")
$summary.Add("")

foreach ($assembly in $profileAssemblies) {
    $summary.Add("=== $($assembly.name) ===")

    foreach ($type in $assembly.types) {
        $summary.Add("TYPE: $($type.fullName)")

        foreach ($field in $type.fields) {
            $offsetAttributes = @(
                $field.attributes | Where-Object {
                    $_.type -match '(FieldOffset|Offset)'
                }
            )

            $summary.Add(
                "  FIELD: $($field.type) $($field.name) " +
                (($offsetAttributes | ConvertTo-Json -Compress -Depth 8))
            )
        }

        foreach ($method in $type.methods) {
            $addressAttributes = @(
                $method.attributes | Where-Object {
                    $_.type -match '(Address|Token|RVA|Offset)'
                }
            )

            if ($addressAttributes.Count -gt 0) {
                $summary.Add(
                    "  METHOD: $($method.name) " +
                    (($addressAttributes | ConvertTo-Json -Compress -Depth 8))
                )
            }
        }

        $summary.Add("")
    }
}

$summary | Set-Content -Path $summaryPath -Encoding UTF8

Write-Host ""
Write-Host "GOTOWE"
Write-Host "Manifest: $manifestPath"
Write-Host "Profil:   $profilePath"
Write-Host "Skrót:    $summaryPath"
Write-Host "Log:      $logPath"
Write-Host ""
Write-Host "Do dalszej pracy potrzebne są fm26-il2cpp-profile.json i fm26-il2cpp-summary.txt."
