#!/bin/bash

# Expense CRUD API Test Script
# Tests all Create, Read, Update, Delete operations

BASE_URL="http://localhost:5000/api"
TEST_RESULTS=""
PASSED=0
FAILED=0

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test user credentials (seeded)
TEST_EMAIL="john.doe@example.com"
TEST_PASSWORD="SecurePassword123!"

echo "=========================================="
echo "Expense CRUD API Test Suite"
echo "=========================================="
echo ""

# Step 1: Login to get token
echo "Step 1: Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.tokens.accessToken // empty')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id // empty')

if [ -z "$TOKEN" ] || [ -z "$USER_ID" ]; then
  echo -e "${RED}✗ Authentication failed${NC}"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo -e "${GREEN}✓ Authenticated successfully${NC}"
echo "  Token: ${TOKEN:0:30}..."
echo "  User ID: $USER_ID"
echo ""

# Helper function to test endpoint
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  local expected_status=$5
  
  if [ -z "$expected_status" ]; then
    expected_status="200"
  fi
  
  local response
  if [ "$method" = "GET" ] || [ "$method" = "DELETE" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  local body=$(echo "$response" | head -n -1)
  local status=$(echo "$response" | tail -n 1)
  
  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}✓ $name${NC} (HTTP $status)"
    PASSED=$((PASSED + 1))
    echo "$body"
  else
    echo -e "${RED}✗ $name${NC} (Expected $expected_status, got $status)"
    echo "$body"
    FAILED=$((FAILED + 1))
  fi
  echo ""
}

# ========== GET USER'S CATEGORIES ==========
echo "========== STEP 2: Get Categories =========="
CATEGORIES=$(curl -s -X GET "$BASE_URL/categories?userId=$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

CATEGORY_ID=$(echo "$CATEGORIES" | jq -r '.[0].id // empty')

if [ -z "$CATEGORY_ID" ]; then
  echo -e "${RED}✗ Failed to get categories${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Retrieved categories${NC}"
echo "  Using category: $CATEGORY_ID"
echo ""

# ========== CREATE EXPENSE ==========
echo "========== STEP 3: CREATE Expense =========="

EXPENSE_DATA=$(cat <<EOF
{
  "userId": "$USER_ID",
  "categoryId": "$CATEGORY_ID",
  "amount": 75.50,
  "description": "Test API expense",
  "date": "2026-05-05",
  "notes": "Created via CRUD test script"
}
EOF
)

CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/expenses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$EXPENSE_DATA")

BODY=$(echo "$CREATE_RESPONSE" | head -n -1)
STATUS=$(echo "$CREATE_RESPONSE" | tail -n 1)

if [ "$STATUS" = "201" ]; then
  echo -e "${GREEN}✓ CREATE Expense${NC} (HTTP $STATUS)"
  EXPENSE_ID=$(echo "$BODY" | jq -r '.id')
  echo "  Created expense ID: $EXPENSE_ID"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ CREATE Expense${NC} (Expected 201, got $STATUS)"
  echo "$BODY" | jq '.'
  FAILED=$((FAILED + 1))
  exit 1
fi
echo "$BODY" | jq '.'
echo ""

# ========== READ SINGLE EXPENSE ==========
echo "========== STEP 4: READ Single Expense =========="

READ_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/expenses/$EXPENSE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

BODY=$(echo "$READ_RESPONSE" | head -n -1)
STATUS=$(echo "$READ_RESPONSE" | tail -n 1)

if [ "$STATUS" = "200" ]; then
  echo -e "${GREEN}✓ READ Expense by ID${NC} (HTTP $STATUS)"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ READ Expense by ID${NC} (Expected 200, got $STATUS)"
  FAILED=$((FAILED + 1))
fi
echo "$BODY" | jq '.'
echo ""

# ========== READ LIST WITH PAGINATION ==========
echo "========== STEP 5: READ Expenses (Paginated) =========="

LIST_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/expenses?userId=$USER_ID&limit=5&offset=0" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

BODY=$(echo "$LIST_RESPONSE" | head -n -1)
STATUS=$(echo "$LIST_RESPONSE" | tail -n 1)

if [ "$STATUS" = "200" ]; then
  echo -e "${GREEN}✓ READ Expenses (Paginated)${NC} (HTTP $STATUS)"
  TOTAL=$(echo "$BODY" | jq '.stats.total')
  RETURNED=$(echo "$BODY" | jq '.pageInfo.returned')
  echo "  Total expenses: $TOTAL, Returned: $RETURNED"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ READ Expenses (Paginated)${NC} (Expected 200, got $STATUS)"
  FAILED=$((FAILED + 1))
fi
echo "$BODY" | jq '.pageInfo'
echo ""

# ========== READ EXPENSE STATISTICS ==========
echo "========== STEP 6: READ Expense Statistics =========="

STATS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/expenses/stats/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

BODY=$(echo "$STATS_RESPONSE" | head -n -1)
STATUS=$(echo "$STATS_RESPONSE" | tail -n 1)

if [ "$STATUS" = "200" ]; then
  echo -e "${GREEN}✓ READ Expense Statistics${NC} (HTTP $STATUS)"
  SUMMARY=$(echo "$BODY" | jq '.summary')
  echo "  Total expenses: $(echo "$SUMMARY" | jq '.totalExpenses')"
  echo "  Total amount: $(echo "$SUMMARY" | jq '.totalAmount')"
  echo "  Average: $(echo "$SUMMARY" | jq '.avgAmount')"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ READ Expense Statistics${NC} (Expected 200, got $STATUS)"
  FAILED=$((FAILED + 1))
fi
echo "$BODY" | jq '.summary'
echo ""

# ========== UPDATE EXPENSE ==========
echo "========== STEP 7: UPDATE Expense =========="

UPDATE_DATA=$(cat <<EOF
{
  "amount": 85.75,
  "notes": "Updated via CRUD test - changed amount",
  "description": "Updated test API expense"
}
EOF
)

UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/expenses/$EXPENSE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_DATA")

BODY=$(echo "$UPDATE_RESPONSE" | head -n -1)
STATUS=$(echo "$UPDATE_RESPONSE" | tail -n 1)

if [ "$STATUS" = "200" ]; then
  echo -e "${GREEN}✓ UPDATE Expense${NC} (HTTP $STATUS)"
  UPDATED_AMOUNT=$(echo "$BODY" | jq '.amount')
  echo "  Updated amount: $UPDATED_AMOUNT"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ UPDATE Expense${NC} (Expected 200, got $STATUS)"
  FAILED=$((FAILED + 1))
fi
echo "$BODY" | jq '.'
echo ""

# ========== DELETE EXPENSE ==========
echo "========== STEP 8: DELETE Expense =========="

DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/expenses/$EXPENSE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

BODY=$(echo "$DELETE_RESPONSE" | head -n -1)
STATUS=$(echo "$DELETE_RESPONSE" | tail -n 1)

if [ "$STATUS" = "200" ]; then
  echo -e "${GREEN}✓ DELETE Expense${NC} (HTTP $STATUS)"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ DELETE Expense${NC} (Expected 200, got $STATUS)"
  FAILED=$((FAILED + 1))
fi
echo "$BODY" | jq '.'
echo ""

# ========== VERIFY DELETION ==========
echo "========== STEP 9: VERIFY Expense Deleted =========="

VERIFY_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/expenses/$EXPENSE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

BODY=$(echo "$VERIFY_RESPONSE" | head -n -1)
STATUS=$(echo "$VERIFY_RESPONSE" | tail -n 1)

if [ "$STATUS" = "404" ]; then
  echo -e "${GREEN}✓ Verified expense deleted (404 Not Found)${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Expense still exists${NC} (Expected 404, got $STATUS)"
  FAILED=$((FAILED + 1))
fi
echo ""

# ========== VALIDATION TESTS ==========
echo "========== STEP 10: Validation Tests =========="

# Test missing required field
echo "Test: Missing required field (amount)"
INVALID_DATA=$(cat <<EOF
{
  "userId": "$USER_ID",
  "categoryId": "$CATEGORY_ID",
  "description": "No amount"
}
EOF
)

INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/expenses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$INVALID_DATA")

STATUS=$(echo "$INVALID_RESPONSE" | tail -n 1)
if [ "$STATUS" = "400" ]; then
  echo -e "${GREEN}✓ Correctly rejected missing amount (400)${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Should reject missing amount${NC} (Got $STATUS)"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test invalid amount (zero)
echo "Test: Invalid amount (zero)"
INVALID_DATA=$(cat <<EOF
{
  "userId": "$USER_ID",
  "categoryId": "$CATEGORY_ID",
  "amount": 0,
  "description": "Invalid amount"
}
EOF
)

INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/expenses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$INVALID_DATA")

STATUS=$(echo "$INVALID_RESPONSE" | tail -n 1)
if [ "$STATUS" = "400" ]; then
  echo -e "${GREEN}✓ Correctly rejected zero amount (400)${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Should reject zero amount${NC} (Got $STATUS)"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test invalid category (non-existent)
echo "Test: Invalid category ID"
INVALID_DATA=$(cat <<EOF
{
  "userId": "$USER_ID",
  "categoryId": "00000000-0000-0000-0000-000000000000",
  "amount": 25.00,
  "description": "Invalid category"
}
EOF
)

INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/expenses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$INVALID_DATA")

STATUS=$(echo "$INVALID_RESPONSE" | tail -n 1)
if [ "$STATUS" = "404" ]; then
  echo -e "${GREEN}✓ Correctly rejected invalid category (404)${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ Should reject invalid category${NC} (Got $STATUS)"
  FAILED=$((FAILED + 1))
fi
echo ""

# ========== SUMMARY ==========
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed! ✓${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
fi
