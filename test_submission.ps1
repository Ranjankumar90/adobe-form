# PowerShell script to test Google Apps Script form submission
$scriptUrl = "https://script.google.com/macros/s/AKfycbz-PZ4XcCWlmtOnnHRqrlJQ5pFzBC6XTakw1a9a92_4MhwPFhnD1iMNnAtEn1U1KOYW1Q/exec"

# Build JSON payload matching the form fields expected by the Apps Script
$payload = @{
    fullName        = "Test User"
    phone           = "1234567890"
    whatsapp        = "1234567890"
    collegeEmail    = "test@college.edu"
    personalEmail   = "test@gmail.com"
    state           = "TestState"
    otherCountry    = ""
    collegeName     = "Test College"
    branch          = "Computer Science"
    year            = "1st Year"
    crContact       = ""
    referralCode    = ""
    domains         = @("Android App Development")
    languages       = @("English")
    feeAcknowledged = $true
} | ConvertTo-Json -Depth 5

# Set request headers for a JSON POST
$headers = @{
    "Content-Type" = "application/json"
    "Accept"       = "*/*"
}

try {
    $response = Invoke-RestMethod -Method Post -Uri $scriptUrl -Headers $headers -Body $payload -ErrorAction Stop
    Write-Host "✅ Success! Server response:`n$response" -ForegroundColor Green
} catch {
    Write-Error "❌ Request failed: $_"
}
