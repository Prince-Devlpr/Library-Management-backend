# PowerShell PostgreSQL Backup Script with 30-Day Retention Policy
Param(
    [string]$BackupDir = "./backups",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "lms_backup_$Timestamp.sql"

$DBName = if ($env:PGDATABASE) { $env:PGDATABASE } else { "library_management" }
$DBUser = if ($env:PGUSER) { $env:PGUSER } else { "postgres" }
$DBHost = if ($env:PGHOST) { $env:PGHOST } else { "localhost" }
$DBPort = if ($env:PGPORT) { $env:PGPORT } else { "5432" }

Write-Host "Starting backup for database '$DBName' to '$BackupFile'..."

& pg_dump -h $DBHost -p $DBPort -U $DBUser -F c -b -v -f $BackupFile $DBName

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completed successfully: $BackupFile"
} else {
    Write-Error "Backup failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

# Retention cleanup: Delete backups older than RetentionDays
Write-Host "Cleaning up backups older than $RetentionDays days in '$BackupDir'..."
$CutoffDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "lms_backup_*.sql" | Where-Object { $_.LastWriteTime -lt $CutoffDate } | ForEach-Object {
    Write-Host "Removing old backup: $($_.FullName)"
    Remove-Item $_.FullName -Force
}

Write-Host "Backup and retention maintenance completed."
