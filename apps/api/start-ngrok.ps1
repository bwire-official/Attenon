# Quick script to start ngrok for Face API
Write-Host "Starting ngrok tunnel for port 8000..." -ForegroundColor Green
Write-Host "Make sure your API server is running on port 8000 first!" -ForegroundColor Yellow
Write-Host ""
ngrok http 8000
