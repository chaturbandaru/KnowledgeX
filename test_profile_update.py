#!/usr/bin/env python
import json
import requests

# Get auth token first
login_resp = requests.post('http://localhost:8000/api/auth/login', json={
    'email': 'anoop@example.com',
    'password': 'password123'
})

print('Login response:', login_resp.status_code)
print('Login response text:', login_resp.text)

if login_resp.status_code != 200:
    exit(1)

token = login_resp.json()['token']['access_token']
print('Token:', token[:20] + '...')

# Try profile update
update_data = {
    'full_name': 'Anoop Kallem',
    'bio': 'Test bio',
    'skills_offered': [{'name': 'Python', 'description': '', 'category': '', 'proficiency_level': 'beginner', 'tags': []}],
    'skills_needed': [{'name': 'React', 'description': '', 'category': '', 'proficiency_level': 'beginner', 'tags': []}]
}

print('Update data:', json.dumps(update_data, indent=2))

headers = {'Authorization': f'Bearer {token}'}
update_resp = requests.put('http://localhost:8000/api/users/me', json=update_data, headers=headers)
print('Update response status:', update_resp.status_code)
print('Update response text:', update_resp.text)
