# Expense CRUD API Test Script
# Tests all Create, Read, Update, Delete operations

$BaseUrl = "http://localhost:5000/api"
$TestEmail = "john.doe@example.com"
$TestPassword = "SecurePassword123!"

$passedTests = 0
$failedTests = 0

function Write-Success {
    param([string]$message)
    Write-Host "✓ $message" -ForegroundColor Green
}

function Write-Error {
    param([string]$message)
    Write-Host "✗ $message" -ForegroundColor Red
}

function Write-Section {
    param([string]$title)
    Write-Host ""
    Write-Host "========== $title ==========" -ForegroundColor Cyan
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Expense CRUD API Test Suite" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Step 1: Login
Write-Section "Step 1: Authenticate"
$loginBody = @{
    email = $TestEmail
    password = $TestPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $loginBody -ErrorAction Stop
    
    $token = $loginResponse.tokens.accessToken
    $userId = $loginResponse.user.id
    
    Write-Success "Authentication successful"
    Write-Host "  User ID: $userId"
    Write-Host "  Token: $($token.Substring(0, 30))..."
    
} catch {
    Write-Error "Authentication failed: $_"
    exit 1
}

# Step 2: Get categories
Write-Section "Step 2: Get Categories"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $categoriesUrl = "$BaseUrl/categories?userId=$userId"
    $categoriesResponse = Invoke-RestMethod -Uri $categoriesUrl `
        -Method GET -Headers $headers -ErrorAction Stop
    
    $categoryId = $categoriesResponse[0].id
    Write-Success "Retrieved categories"
    Write-Host "  Using category: $categoryId ($(($categoriesResponse[0].name)))"
    
} catch {
    Write-Error "Failed to get categories: $_"
    exit 1
}

# Step 3: CREATE Expense
Write-Section "Step 3: CREATE Expense"
$expenseData = @{
    userId = $userId
    categoryId = $categoryId
    amount = 75.50
    description = "Test API expense"
    date = "2026-05-05"
    notes = "Created via CRUD test script"
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$BaseUrl/expenses" -Method POST `
        -Headers $headers -Body $expenseData -ErrorAction Stop
    
    $expenseId = $createResponse.id
    Write-Success "CREATE Expense (HTTP 201)"
    Write-Host "  Created expense ID: $expenseId"
    Write-Host "  Amount: $($createResponse.amount)"
    Write-Host "  Description: $($createResponse.description)"
    $passedTests++
    
} catch {
    Write-Error "CREATE failed: $_"
    $failedTests++
    exit 1
}

# Step 4: READ Single Expense
Write-Section "Step 4: READ Single Expense"
try {
    $getUrl = "$BaseUrl/expenses/$expenseId"
    $getResponse = Invoke-RestMethod -Uri $getUrl -Method GET `
        -Headers $headers -ErrorAction Stop
    
    Write-Success "READ Expense by ID (HTTP 200)"
    Write-Host "  Amount: $($getResponse.amount)"
    Write-Host "  Date: $($getResponse.date)"
    Write-Host "  Notes: $($getResponse.notes)"
    $passedTests++
    
} catch {
    Write-Error "READ single expense failed: $_"
    $failedTests++
}

# Step 5: READ List with Pagination
Write-Section "Step 5: READ Expenses (Paginated)"
try {
    $listUrl = "$BaseUrl/expenses?userId=$userId&limit=5&offset=0"
    $listResponse = Invoke-RestMethod -Uri $listUrl `
        -Method GET -Headers $headers -ErrorAction Stop
    
    Write-Success "READ Expenses (Paginated) (HTTP 200)"
    Write-Host "  Total expenses: $($listResponse.stats.total)"
    Write-Host "  Returned in page: $($listResponse.pageInfo.returned)"
    Write-Host "  Total amount: `$$($listResponse.stats.totalAmount)"
    Write-Host "  Average amount: `$$($listResponse.stats.avgAmount)"
    $passedTests++
    
} catch {
    Write-Error "READ list failed: $_"
    $failedTests++
}

# Step 6: READ Statistics
Write-Section "Step 6: READ Expense Statistics"
try {
    $statsUrl = "$BaseUrl/expenses/stats/$userId"
    $statsResponse = Invoke-RestMethod -Uri $statsUrl `
        -Method GET -Headers $headers -ErrorAction Stop
    
    Write-Success "READ Expense Statistics (HTTP 200)"
    Write-Host "  Total expenses: $($statsResponse.summary.totalExpenses)"
    Write-Host "  Total spent: `$$($statsResponse.summary.totalAmount)"
    Write-Host "  Average per expense: `$$($statsResponse.summary.avgAmount)"
    Write-Host "  Categories: $($statsResponse.summary.byCategory.Count)"
    $passedTests++
    
} catch {
    Write-Error "READ statistics failed: $_"
    $failedTests++
}

# Step 7: UPDATE Expense
Write-Section "Step 7: UPDATE Expense"
$updateData = @{
    amount = 85.75
    notes = "Updated via CRUD test - changed amount"
    description = "Updated test API expense"
} | ConvertTo-Json

try {
    $updateUrl = "$BaseUrl/expenses/$expenseId"
    $updateResponse = Invoke-RestMethod -Uri $updateUrl -Method PUT `
        -Headers $headers -Body $updateData -ErrorAction Stop
    
    Write-Success "UPDATE Expense (HTTP 200)"
    Write-Host "  New amount: $($updateResponse.amount)"
    Write-Host "  Updated notes: $($updateResponse.notes)"
    Write-Host "  Updated timestamp: $($updateResponse.updatedAt)"
    $passedTests++
    
} catch {
    Write-Error "UPDATE failed: $_"
    $failedTests++
}

# Step 8: DELETE Expense
Write-Section "Step 8: DELETE Expense"
try {
    $deleteUrl = "$BaseUrl/expenses/$expenseId"
    $deleteResponse = Invoke-RestMethod -Uri $deleteUrl -Method DELETE `
        -Headers $headers -ErrorAction Stop
    
    Write-Success "DELETE Expense (HTTP 200)"
    Write-Host "  Message: $($deleteResponse.message)"
    $passedTests++
    
} catch {
    Write-Error "DELETE failed: $_"
    $failedTests++
}

# Step 9: VERIFY Deletion
Write-Section "Step 9: VERIFY Expense Deleted"
try {
    $verifyUrl = "$BaseUrl/expenses/$expenseId"
    $verifyResponse = Invoke-RestMethod -Uri $verifyUrl `
        -Method GET -Headers $headers -ErrorAction Stop
    
    Write-Error "Expense still exists after deletion"
    $failedTests++
    
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Success "Verified expense deleted (HTTP 404)"
        $passedTests++
    } else {
        Write-Error "Unexpected error verifying deletion: $_"
        $failedTests++
    }
}

# Step 10: VALIDATION Tests
Write-Section "Step 10: Validation Tests"

# Test missing required field
Write-Host "Test: Missing required field (amount)" -ForegroundColor Yellow
$invalidData = @{
    userId = $userId
    categoryId = $categoryId
    description = "No amount"
} | ConvertTo-Json

try {
    $invalidUrl = "$BaseUrl/expenses"
    $invalidResponse = Invoke-RestMethod -Uri $invalidUrl -Method POST `
        -Headers $headers -Body $invalidData -ErrorAction Stop
    
    Write-Error "Should reject missing amount"
    $failedTests++
    
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Success "Correctly rejected missing amount (HTTP 400)"
        $passedTests++
    } else {
        Write-Error "Unexpected status code: $($_.Exception.Response.StatusCode)"
        $failedTests++
    }
}

# Test invalid amount (zero)
Write-Host "Test: Invalid amount (zero)" -ForegroundColor Yellow
$invalidData = @{
    userId = $userId
    categoryId = $categoryId
    amount = 0
    description = "Invalid amount"
} | ConvertTo-Json

try {
    $invalidUrl = "$BaseUrl/expenses"
    $invalidResponse = Invoke-RestMethod -Uri $invalidUrl -Method POST `
        -Headers $headers -Body $invalidData -ErrorAction Stop
    
    Write-Error "Should reject zero amount"
    $failedTests++
    
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Success "Correctly rejected zero amount (HTTP 400)"
        $passedTests++
    } else {
        Write-Error "Unexpected status code: $($_.Exception.Response.StatusCode)"
        $failedTests++
    }
}

# Test invalid category
Write-Host "Test: Invalid category ID" -ForegroundColor Yellow
$invalidData = @{
    userId = $userId
    categoryId = "00000000-0000-0000-0000-000000000000"
    amount = 25.00
    description = "Invalid category"
} | ConvertTo-Json

try {
    $invalidUrl = "$BaseUrl/expenses"
    $invalidResponse = Invoke-RestMethod -Uri $invalidUrl -Method POST `
        -Headers $headers -Body $invalidData -ErrorAction Stop
    
    Write-Error "Should reject invalid category"
    $failedTests++
    
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Success "Correctly rejected invalid category (HTTP 404)"
        $passedTests++
    } else {
        Write-Error "Unexpected status code: $($_.Exception.Response.StatusCode)"
        $failedTests++
    }
}

# Summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red
Write-Host "Total:  $($passedTests + $failedTests)"
Write-Host ""

if ($failedTests -eq 0) {
    Write-Host "All tests passed! ✓" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some tests failed." -ForegroundColor Red
    exit 1
}
