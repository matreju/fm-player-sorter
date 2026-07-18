param(
    [string]$FmRoot = "D:\steam\steamapps\common\Football Manager 26",
    [string]$OutputDir = "C:\dev\fm-player-sorter"
)

$ErrorActionPreference = "Stop"

$coreDir = Join-Path $FmRoot "BepInEx\core"
$interopDir = Join-Path $FmRoot "BepInEx\interop"
$pluginDir = Join-Path $FmRoot "BepInEx\plugins\FM26PlayerExport"
$cecilPath = Join-Path $coreDir "Mono.Cecil.dll"

if (-not (Test-Path $cecilPath)) {
    throw "Nie znaleziono Mono.Cecil.dll: $cecilPath"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
Add-Type -Path $cecilPath

$resolver = New-Object Mono.Cecil.DefaultAssemblyResolver
$resolver.AddSearchDirectory($coreDir)
$resolver.AddSearchDirectory($interopDir)
if (Test-Path $pluginDir) {
    $resolver.AddSearchDirectory($pluginDir)
}

$readerParams = New-Object Mono.Cecil.ReaderParameters
$readerParams.AssemblyResolver = $resolver
$readerParams.ReadSymbols = $false
$readerParams.InMemory = $true

$targetFiles = @(
    (Join-Path $interopDir "FM.GamePlugin.dll"),
    (Join-Path $interopDir "FM.UI.dll"),
    (Join-Path $interopDir "SI.Bindable.dll"),
    (Join-Path $interopDir "SI.Core.dll"),
    (Join-Path $interopDir "FMGame.dll"),
    (Join-Path $pluginDir "FM26PlayerExport.dll")
) | Where-Object { Test-Path $_ }

if ($targetFiles.Count -eq 0) {
    throw "Nie znaleziono żadnej z oczekiwanych bibliotek FM/BepInEx."
}

$keywordPattern = '(?i)(player|person|staff|manager|club|team|squad|database|world|save|game|career|attribute|ability|currentability|potentialability|ca\b|pa\b|contract|injur|fitness|condition|sharpness|morale|stat|appearance|goal|assist|rating|position|foot|nationality|scout|transfer|wage|value|match|competition)'

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

function Get-SafeTypeName {
    param($TypeReference)

    if ($null -eq $TypeReference) {
        return $null
    }

    try {
        return $TypeReference.FullName
    }
    catch {
        return [string]$TypeReference
    }
}

$assembliesReport = New-Object System.Collections.Generic.List[object]

foreach ($file in $targetFiles) {
    Write-Host "Analizuję: $file"

    $assembly = [Mono.Cecil.AssemblyDefinition]::ReadAssembly($file, $readerParams)

    try {
        $allTypes = Get-AllTypes -Types $assembly.MainModule.Types

        $selectedTypes = foreach ($type in $allTypes) {
            $memberText = @(
                $type.FullName
                $type.Namespace
                ($type.Fields | ForEach-Object { $_.Name })
                ($type.Properties | ForEach-Object { $_.Name })
                ($type.Methods | ForEach-Object { $_.Name })
            ) -join " "

            if (
                $assembly.Name.Name -eq "FM26PlayerExport" -or
                $memberText -match $keywordPattern
            ) {
                [ordered]@{
                    fullName = $type.FullName
                    namespace = $type.Namespace
                    name = $type.Name
                    baseType = Get-SafeTypeName $type.BaseType
                    isClass = $type.IsClass
                    isInterface = $type.IsInterface
                    isEnum = $type.IsEnum
                    isValueType = $type.IsValueType
                    isAbstract = $type.IsAbstract
                    isSealed = $type.IsSealed

                    fields = @(
                        $type.Fields | ForEach-Object {
                            [ordered]@{
                                name = $_.Name
                                type = Get-SafeTypeName $_.FieldType
                                isStatic = $_.IsStatic
                                isPublic = $_.IsPublic
                                isPrivate = $_.IsPrivate
                                isInitOnly = $_.IsInitOnly
                            }
                        }
                    )

                    properties = @(
                        $type.Properties | ForEach-Object {
                            [ordered]@{
                                name = $_.Name
                                type = Get-SafeTypeName $_.PropertyType
                                hasGetter = $null -ne $_.GetMethod
                                hasSetter = $null -ne $_.SetMethod
                                getterIsStatic = if ($_.GetMethod) { $_.GetMethod.IsStatic } else { $false }
                                setterIsStatic = if ($_.SetMethod) { $_.SetMethod.IsStatic } else { $false }
                            }
                        }
                    )

                    methods = @(
                        $type.Methods |
                            Where-Object {
                                -not $_.IsConstructor -and
                                (
                                    $assembly.Name.Name -eq "FM26PlayerExport" -or
                                    $_.Name -match $keywordPattern -or
                                    $_.ReturnType.FullName -match $keywordPattern -or
                                    (($_.Parameters | ForEach-Object { $_.ParameterType.FullName }) -join " ") -match $keywordPattern
                                )
                            } |
                            ForEach-Object {
                                [ordered]@{
                                    name = $_.Name
                                    returnType = Get-SafeTypeName $_.ReturnType
                                    isStatic = $_.IsStatic
                                    isPublic = $_.IsPublic
                                    isPrivate = $_.IsPrivate
                                    isVirtual = $_.IsVirtual
                                    parameters = @(
                                        $_.Parameters | ForEach-Object {
                                            [ordered]@{
                                                name = $_.Name
                                                type = Get-SafeTypeName $_.ParameterType
                                            }
                                        }
                                    )
                                }
                            }
                    )
                }
            }
        }

        $assembliesReport.Add(
            [ordered]@{
                assembly = $assembly.Name.Name
                version = [string]$assembly.Name.Version
                path = $file
                typeCount = $allTypes.Count
                matchingTypeCount = @($selectedTypes).Count
                references = @(
                    $assembly.MainModule.AssemblyReferences | ForEach-Object {
                        [ordered]@{
                            name = $_.Name
                            version = [string]$_.Version
                        }
                    }
                )
                types = @($selectedTypes)
            }
        )
    }
    finally {
        $assembly.Dispose()
    }
}

$report = [ordered]@{
    generatedAt = (Get-Date).ToString("o")
    fmRoot = $FmRoot
    inspectedFiles = $targetFiles
    assemblies = $assembliesReport
}

$jsonPath = Join-Path $OutputDir "fm-api-report.json"
$textPath = Join-Path $OutputDir "fm-api-summary.txt"

$report |
    ConvertTo-Json -Depth 20 |
    Set-Content -Path $jsonPath -Encoding UTF8

$summary = New-Object System.Collections.Generic.List[string]
$summary.Add("FM API REPORT")
$summary.Add("Wygenerowano: $($report.generatedAt)")
$summary.Add("")

foreach ($assembly in $assembliesReport) {
    $summary.Add("=== $($assembly.assembly) $($assembly.version) ===")
    $summary.Add("Typy ogółem: $($assembly.typeCount)")
    $summary.Add("Typy pasujące: $($assembly.matchingTypeCount)")
    $summary.Add("")

    foreach ($type in $assembly.types) {
        $summary.Add("TYPE: $($type.fullName)")

        foreach ($property in $type.properties) {
            $summary.Add("  PROPERTY: $($property.type) $($property.name)")
        }

        foreach ($field in $type.fields) {
            $summary.Add("  FIELD: $($field.type) $($field.name)")
        }

        foreach ($method in $type.methods) {
            $parameters = ($method.parameters | ForEach-Object {
                "$($_.type) $($_.name)"
            }) -join ", "

            $summary.Add("  METHOD: $($method.returnType) $($method.name)($parameters)")
        }

        $summary.Add("")
    }
}

$summary | Set-Content -Path $textPath -Encoding UTF8

Write-Host ""
Write-Host "Gotowe:"
Write-Host $jsonPath
Write-Host $textPath
