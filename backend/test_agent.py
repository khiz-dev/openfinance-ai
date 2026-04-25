import requests

BASE = "http://localhost:8000"

print("CAPITAL OS - AGENT PLATFORM TEST")
print("=" * 50)

r = requests.post(f"{BASE}/auth/login", json={"email": "demo@capitalos.ai", "password": "demo1234"})
token = r.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}
print(f"Auth: {'OK' if token else 'FAIL'}")

r = requests.get(f"{BASE}/banks/balances", headers=headers)
balances = r.json()
print(f"Balances: £{balances.get('total_balance', 0)} across {len(balances.get('accounts', []))} accounts")

r = requests.get(f"{BASE}/agents/1/data", headers=headers)
data = r.json()
print(f"Financial data: monthly income £{data.get('monthly_income_gbp')}, spending £{data.get('monthly_spending_gbp')}")
print(f"Categories: {list(data.get('top_categories', {}).keys())[:4]}")
print(f"Recurring: {len(data.get('recurring_payments', []))} payments")

r = requests.get(f"{BASE}/agents/2/data", headers=headers)
data = r.json()
print(f"Payday status: {data.get('status')}, last: {data.get('last_payday')}, avg: £{data.get('average_salary')}")

r = requests.post(f"{BASE}/agents/2/chat", json={"message": "Is my salary here yet?"}, headers=headers)
print(f"Chat (mock): {r.status_code} - {r.json().get('response', r.json().get('detail', 'error'))[:150]}")

print("=" * 50)
print("DONE" if r.status_code == 200 else "FAILED")