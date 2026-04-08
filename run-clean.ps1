param(
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"

Write-Host "Checking for process on port $Port..."
$line = netstat -ano | Select-String ":$Port\s+.*LISTENING"

if ($line) {
    $tokens = ($line.ToString() -split "\s+") | Where-Object { $_ -ne "" }
    $pid = $tokens[-1]
    if ($pid -match "^\d+$") {
        Write-Host "Stopping PID $pid on port $Port..."
        taskkill /PID $pid /F | Out-Null
    }
}

Write-Host "Starting Spring Boot app on port $Port..."
if ($Port -eq 8080) {
    .\mvnw spring-boot:run
} else {
    .\mvnw --% spring-boot:run -Dspring-boot.run.arguments=--server.port=$Port
}
