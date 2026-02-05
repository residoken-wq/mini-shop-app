
# Run this script as Administrator to register the scheduled task

$TaskName = "PrismaBackup"
$ScriptPath = Join-Path $PSScriptRoot "backup_prisma.ps1"

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File ""$ScriptPath"""
$Trigger = New-ScheduledTaskTrigger -Daily -At "01:00"

# Register the task
# Note: Using -User $env:USERNAME to run as the current user, so it has access to the folders.
# You might need to provide password if using 'schtasks', but Register-ScheduledTask works well for interactive/same-user context.
# To run whether user is logged on or not, we might need -User "SYSTEM" but that requires folder permissions.
# For simplicity, we register execution for the current user.

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Description "Daily Prisma DB Backup" -Force

Write-Host "Task '$TaskName' registered successfully. It will run daily at 01:00 AM."
