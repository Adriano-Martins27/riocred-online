#!/usr/bin/env bash
# Setup do backend RioCred via Appwrite CLI (session auth)
set -e
DB=riocred
STAFF_PERMS=(--permissions 'read("label:staff")' --permissions 'create("label:staff")' --permissions 'update("label:staff")' --permissions 'delete("label:staff")')
ADMIN_MGD=(--permissions 'read("label:staff")' --permissions 'create("label:admin")' --permissions 'update("label:admin")' --permissions 'delete("label:admin")')
ADMIN_CRUD=(--permissions 'read("label:admin")' --permissions 'create("label:admin")' --permissions 'update("label:admin")' --permissions 'delete("label:admin")')

col() { # col <id> <Name> <perm-array-name> [attr-json...]
  local id="$1" name="$2" perms="$3"; shift 3
  local args=()
  for a in "$@"; do args+=(--attributes "$a"); done
  eval "appwrite databases create-collection --database-id $DB --collection-id $id --name \"$name\" \"\${${perms}[@]}\" \"\${args[@]}\" -f" >/dev/null \
    && echo "OK $id" || echo "FAIL $id"
}

# ---------- customers ----------
col customers "Customers" STAFF_PERMS \
  '{"key":"ownerId","type":"string","size":64,"required":true}' \
  '{"key":"fullName","type":"string","size":256,"required":true}' \
  '{"key":"cpf","type":"string","size":32,"required":false}' \
  '{"key":"phone","type":"string","size":32,"required":false}' \
  '{"key":"clientType","type":"string","size":64,"required":false}' \
  '{"key":"billingType","type":"string","size":32,"required":false}' \
  '{"key":"referrerName","type":"string","size":256,"required":false}' \
  '{"key":"referrerPhone","type":"string","size":32,"required":false}' \
  '{"key":"routeId","type":"string","size":64,"required":false}' \
  '{"key":"zipCode","type":"string","size":16,"required":false}' \
  '{"key":"street","type":"string","size":256,"required":false}' \
  '{"key":"number","type":"string","size":32,"required":false}' \
  '{"key":"complement","type":"string","size":128,"required":false}' \
  '{"key":"neighborhood","type":"string","size":128,"required":false}' \
  '{"key":"city","type":"string","size":128,"required":false}' \
  '{"key":"state","type":"string","size":8,"required":false}' \
  '{"key":"reference","type":"string","size":256,"required":false}' \
  '{"key":"clientRequestId","type":"string","size":64,"required":true}' \
  '{"key":"active","type":"boolean","required":false,"default":true}' \
  '{"key":"photoFileId","type":"string","size":64,"required":false}' \
  '{"key":"photoUpdatedAt","type":"string","size":32,"required":false}'

appwrite databases create-index --database-id $DB --collection-id customers --key ownerId_idx --type key --attributes ownerId --orders ASC -f >/dev/null && echo "OK idx customers.ownerId" || true

# ---------- loans ----------
col loans "Loans" STAFF_PERMS \
  '{"key":"ownerId","type":"string","size":64,"required":true}' \
  '{"key":"customerId","type":"string","size":64,"required":true}' \
  '{"key":"customerName","type":"string","size":256,"required":true}' \
  '{"key":"principal","type":"double","required":true}' \
  '{"key":"interestRate","type":"double","required":true}' \
  '{"key":"interestMode","type":"string","size":32,"required":true}' \
  '{"key":"frequency","type":"string","size":32,"required":true}' \
  '{"key":"installmentCount","type":"integer","required":true}' \
  '{"key":"startDate","type":"string","size":16,"required":true}' \
  '{"key":"firstDueDate","type":"string","size":16,"required":true}' \
  '{"key":"skipWeekends","type":"boolean","required":false,"default":true}' \
  '{"key":"totalInterest","type":"double","required":true}' \
  '{"key":"totalReceivable","type":"double","required":true}' \
  '{"key":"status","type":"string","size":16,"required":true}' \
  '{"key":"clientRequestId","type":"string","size":64,"required":true}' \
  '{"key":"managerId","type":"string","size":64,"required":false}' \
  '{"key":"managerName","type":"string","size":256,"required":false}' \
  '{"key":"lateFeeMode","type":"string","size":32,"required":false}' \
  '{"key":"lateFeeValue","type":"double","required":false}'

# ---------- loan_installments ----------
col loan_installments "Loan Installments" STAFF_PERMS \
  '{"key":"loanId","type":"string","size":64,"required":true}' \
  '{"key":"ownerId","type":"string","size":64,"required":true}' \
  '{"key":"installmentNumber","type":"integer","required":true}' \
  '{"key":"dueDate","type":"string","size":16,"required":true}' \
  '{"key":"scheduledAmount","type":"double","required":true}' \
  '{"key":"paidAmount","type":"double","required":true}' \
  '{"key":"status","type":"string","size":16,"required":true}'

appwrite databases create-index --database-id $DB --collection-id loan_installments --key loanId_idx --type key --attributes loanId --orders ASC -f >/dev/null && echo "OK idx installments.loanId" || true

# ---------- user_settings ----------
col user_settings "User Settings" STAFF_PERMS \
  '{"key":"ownerId","type":"string","size":64,"required":true}' \
  '{"key":"whatsapp","type":"string","size":32,"required":false}' \
  '{"key":"companyName","type":"string","size":128,"required":false}' \
  '{"key":"pixKey","type":"string","size":128,"required":false}' \
  '{"key":"whatsappEnabled","type":"boolean","required":false,"default":true}' \
  '{"key":"templateDefault","type":"string","size":512,"required":false}' \
  '{"key":"templateDueToday","type":"string","size":512,"required":false}' \
  '{"key":"templateOverdue","type":"string","size":512,"required":false}'

# ---------- payable_accounts ----------
col payable_accounts "Payable Accounts" STAFF_PERMS \
  '{"key":"ownerId","type":"string","size":64,"required":true}' \
  '{"key":"name","type":"string","size":256,"required":true}' \
  '{"key":"amount","type":"double","required":true}' \
  '{"key":"dueDate","type":"string","size":16,"required":true}' \
  '{"key":"category","type":"string","size":64,"required":false}' \
  '{"key":"notes","type":"string","size":512,"required":false}' \
  '{"key":"status","type":"string","size":16,"required":true}'

# ---------- routes ----------
col routes "Routes" ADMIN_MGD \
  '{"key":"name","type":"string","size":128,"required":true}' \
  '{"key":"createdBy","type":"string","size":64,"required":true}'

# ---------- manager_route_access ----------
col manager_route_access "Manager Route Access" ADMIN_MGD \
  '{"key":"managerId","type":"string","size":64,"required":true}' \
  '{"key":"routeId","type":"string","size":64,"required":true}'

appwrite databases create-index --database-id $DB --collection-id manager_route_access --key managerId_idx --type key --attributes managerId --orders ASC -f >/dev/null && echo "OK idx mra.managerId" || true

# ---------- loan_payments ----------
col loan_payments "Loan Payments" STAFF_PERMS \
  '{"key":"loanId","type":"string","size":64,"required":true}' \
  '{"key":"installmentId","type":"string","size":64,"required":true}' \
  '{"key":"ownerId","type":"string","size":64,"required":true}' \
  '{"key":"amount","type":"double","required":true}' \
  '{"key":"interestAmount","type":"double","required":true}' \
  '{"key":"principalAmount","type":"double","required":true}' \
  '{"key":"discountAmount","type":"double","required":true}' \
  '{"key":"paymentMethod","type":"string","size":16,"required":true}' \
  '{"key":"paymentType","type":"string","size":24,"required":true}' \
  '{"key":"notes","type":"string","size":512,"required":false}' \
  '{"key":"paidAt","type":"string","size":32,"required":true}'

# ---------- customer_documents ----------
col customer_documents "Customer Documents" STAFF_PERMS \
  '{"key":"customerId","type":"string","size":64,"required":true}' \
  '{"key":"ownerId","type":"string","size":64,"required":true}' \
  '{"key":"type","type":"string","size":32,"required":true}' \
  '{"key":"fileId","type":"string","size":64,"required":true}' \
  '{"key":"fileName","type":"string","size":256,"required":true}'

# ---------- push_devices ----------
col push_devices "Push Devices" STAFF_PERMS \
  '{"key":"userId","type":"string","size":64,"required":true}' \
  '{"key":"expoPushToken","type":"string","size":256,"required":true}' \
  '{"key":"platform","type":"string","size":16,"required":true}' \
  '{"key":"updatedAt","type":"string","size":32,"required":true}'

# ---------- app_settings ----------
col app_settings "App Settings" ADMIN_CRUD \
  '{"key":"evolutionBaseUrl","type":"string","size":256,"required":false}' \
  '{"key":"evolutionApiKey","type":"string","size":256,"required":false}' \
  '{"key":"evolutionInstanceName","type":"string","size":128,"required":false}' \
  '{"key":"templateLoanCreated","type":"string","size":512,"required":false}' \
  '{"key":"templateDueSoon","type":"string","size":512,"required":false}' \
  '{"key":"templateDueToday","type":"string","size":512,"required":false}' \
  '{"key":"templateOverdue","type":"string","size":512,"required":false}'

# ---------- storage buckets ----------
appwrite storage create-bucket --bucket-id customer-photos --name "Customer Photos" "${STAFF_PERMS[@]}" --maximum-file-size 5000000 --allowed-file-extensions jpg --allowed-file-extensions jpeg --allowed-file-extensions png --allowed-file-extensions pdf --allowed-file-extensions webp -f >/dev/null && echo "OK bucket photos" || echo "bucket photos falhou/existe"
appwrite storage create-bucket --bucket-id customer-documents --name "Customer Documents" "${STAFF_PERMS[@]}" --maximum-file-size 10000000 --allowed-file-extensions jpg --allowed-file-extensions jpeg --allowed-file-extensions png --allowed-file-extensions pdf --allowed-file-extensions webp -f >/dev/null && echo "OK bucket docs" || echo "bucket docs falhou/existe"

# ---------- auth email/password ----------
appwrite project update-auth-method --method email-password --status true -f >/dev/null 2>&1 && echo "OK auth email-password" || echo "auth: verificar no console"

# ---------- platforms ----------
appwrite project create-web-platform --name "RioCred Local" --hostname localhost -f >/dev/null 2>&1 && echo "OK platform localhost" || true
appwrite project create-web-platform --name "RioCred Web" --hostname riocred.online -f >/dev/null 2>&1 && echo "OK platform riocred.online" || true
appwrite project create-android-platform --name "RioCred App" --hostname online.riocred.app -f >/dev/null 2>&1 && echo "OK platform android" || true

echo "=== SETUP CONCLUIDO ==="
