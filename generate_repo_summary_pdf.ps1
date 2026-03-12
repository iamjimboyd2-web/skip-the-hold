param(
    [string]$OutputPath = (Join-Path $PSScriptRoot "repo-summary.pdf")
)

function Escape-PdfText {
    param([string]$Text)

    return $Text.Replace('\', '\\').Replace('(', '\(').Replace(')', '\)')
}

$entries = @(
    @{ Type = "title"; Text = "App Summary"; X = 54; Y = 746; Font = "F2"; Size = 22 },
    @{ Type = "meta"; Text = "Repo evidence only. Repository root inspected at C:\\Users\\boydj\\OneDrive\\Desktop\\codex and found empty."; X = 54; Y = 720; Font = "F1"; Size = 9 },
    @{ Type = "section"; Text = "What it is"; X = 54; Y = 686; Font = "F2"; Size = 13 },
    @{ Type = "body"; Text = "A concrete application implementation was not found in repo."; X = 70; Y = 668; Font = "F1"; Size = 11 },
    @{ Type = "body"; Text = "The repository contains no source files, docs, or manifests to identify the app's purpose."; X = 70; Y = 652; Font = "F1"; Size = 11 },
    @{ Type = "section"; Text = "Who it's for"; X = 54; Y = 620; Font = "F2"; Size = 13 },
    @{ Type = "body"; Text = "Primary user/persona: Not found in repo."; X = 70; Y = 602; Font = "F1"; Size = 11 },
    @{ Type = "section"; Text = "What it does"; X = 54; Y = 570; Font = "F2"; Size = 13 },
    @{ Type = "body"; Text = "- Core user features: Not found in repo."; X = 70; Y = 552; Font = "F1"; Size = 11 },
    @{ Type = "body"; Text = "- UI screens or workflows: Not found in repo."; X = 70; Y = 536; Font = "F1"; Size = 11 },
    @{ Type = "body"; Text = "- API endpoints or background jobs: Not found in repo."; X = 70; Y = 520; Font = "F1"; Size = 11 },
    @{ Type = "body"; Text = "- Integrations or external services: Not found in repo."; X = 70; Y = 504; Font = "F1"; Size = 11 },
    @{ Type = "body"; Text = "- Authentication or authorization: Not found in repo."; X = 70; Y = 488; Font = "F1"; Size = 11 },
    @{ Type = "body"; Text = "- Persistence or data model: Not found in repo."; X = 70; Y = 472; Font = "F1"; Size = 11 },
    @{ Type = "section"; Text = "How it works"; X = 54; Y = 440; Font = "F2"; Size = 13 },
    @{ Type = "body"; Text = "Architecture overview: Not found in repo."; X = 70; Y = 422; Font = "F1"; Size = 11 },
    @{ Type = "body"; Text = "No components, services, data stores, or documented data flow were present to infer architecture."; X = 70; Y = 406; Font = "F1"; Size = 11 },
    @{ Type = "section"; Text = "How to run"; X = 54; Y = 374; Font = "F2"; Size = 13 },
    @{ Type = "body"; Text = "- Install/build requirements: Not found in repo."; X = 70; Y = 356; Font = "F1"; Size = 11 },
    @{ Type = "body"; Text = "- Start command or scripts: Not found in repo."; X = 70; Y = 340; Font = "F1"; Size = 11 },
    @{ Type = "body"; Text = "- Environment variables/configuration: Not found in repo."; X = 70; Y = 324; Font = "F1"; Size = 11 },
    @{ Type = "meta"; Text = "Conclusion: the repository does not currently contain enough evidence to describe a runnable app."; X = 54; Y = 286; Font = "F1"; Size = 9 }
)

$contentParts = New-Object System.Collections.Generic.List[string]
$contentParts.Add("0.85 G")
$contentParts.Add("1 w")
$contentParts.Add("54 706 m 558 706 l S")
$contentParts.Add("54 610 m 558 610 l S")
$contentParts.Add("54 560 m 558 560 l S")
$contentParts.Add("54 430 m 558 430 l S")
$contentParts.Add("54 364 m 558 364 l S")
$contentParts.Add("0 g")
$contentParts.Add("BT")

foreach ($entry in $entries) {
    $text = Escape-PdfText $entry.Text
    $contentParts.Add("/$($entry.Font) $($entry.Size) Tf")
    $contentParts.Add("1 0 0 1 $($entry.X) $($entry.Y) Tm")
    $contentParts.Add("($text) Tj")
}

$contentParts.Add("ET")
$streamContent = ($contentParts -join "`n") + "`n"
$streamLength = [System.Text.Encoding]::ASCII.GetByteCount($streamContent)

$objects = @(
    "1 0 obj`n<< /Type /Catalog /Pages 2 0 R >>`nendobj`n",
    "2 0 obj`n<< /Type /Pages /Count 1 /Kids [3 0 R] >>`nendobj`n",
    "3 0 obj`n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`nendobj`n",
    "4 0 obj`n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`nendobj`n",
    "5 0 obj`n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`nendobj`n",
    "6 0 obj`n<< /Length $streamLength >>`nstream`n$streamContent" + "endstream`nendobj`n"
)

$encoding = [System.Text.Encoding]::ASCII
$pdf = "%PDF-1.4`n"
$offsets = New-Object System.Collections.Generic.List[int]

foreach ($object in $objects) {
    $offsets.Add($encoding.GetByteCount($pdf))
    $pdf += $object
}

$xrefOffset = $encoding.GetByteCount($pdf)
$pdf += "xref`n0 7`n"
$pdf += "0000000000 65535 f `n"

foreach ($offset in $offsets) {
    $pdf += ("{0:0000000000} 00000 n `n" -f $offset)
}

$pdf += "trailer`n<< /Size 7 /Root 1 0 R >>`n"
$pdf += "startxref`n$xrefOffset`n%%EOF`n"

[System.IO.File]::WriteAllBytes($OutputPath, $encoding.GetBytes($pdf))
Write-Output $OutputPath
