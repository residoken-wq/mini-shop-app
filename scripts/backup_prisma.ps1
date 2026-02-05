
# Configuration
$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
$SourceFile = Join-Path $ProjectRoot "prisma\dev.db"
$BackupDir = Join-Path $ProjectRoot "backup_config"
$RetentionDays = 7

# Timestamp for filename
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "backup_$Timestamp.db"

# Ensure backup directory exists
if (-not (Test-Path -Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
    Write-Host "Created backup directory: $BackupDir"
}

# Perform Backup
if (Test-Path -Path $SourceFile) {
    Copy-Item -Path $SourceFile -Destination $BackupFile
    # Update timestamp to now to prevent immediate deletion if source is old
    (Get-Item $BackupFile).LastWriteTime = Get-Date
    Write-Host "Backup created: $BackupFile"
} else {
    Write-Error "Source database file not found: $SourceFile"
    exit 1
}

# cleanup old backups (older than 7 days)
$Limit = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "backup_*.db" | Where-Object { $_.LastWriteTime -lt $Limit } | ForEach-Object {
    Remove-Item -Path $_.FullName
    Write-Host "Deleted old backup: $($_.Name)"
}
