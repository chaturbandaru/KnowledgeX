const API_BASE_URL = 'http://localhost:8000/api'; // Adjust port as needed

export const apiClient = {
  async get(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add auth token if needed: 'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  },

  async post(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  },
};