const API_BASE_URL = 'http://localhost:8000/api';

class ApiService {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('auth_token');
    
    console.log('Making request to:', `${API_BASE_URL}${endpoint}`);
    console.log('Token:', token ? 'exists' : 'missing');
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers,
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('API Error:', data);
        throw new Error(data.detail || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  async signUp(email, password) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ 
        email, 
        password,
        username: email.split('@')[0]
      }),
    });
    
    console.log('Signup response:', response);
    
    if (response.token && response.token.access_token) {
      localStorage.setItem('auth_token', response.token.access_token);
      console.log('Token stored successfully');
    }
    
    return response;
  }

  async signIn(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    console.log('Login response:', response);
    
    if (response.token && response.token.access_token) {
      localStorage.setItem('auth_token', response.token.access_token);
      console.log('Token stored successfully');
    }
    
    return response;
  }

  async updateProfile(profileData) {
    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify({
        full_name: profileData.displayName,
        bio: profileData.bio,
        skills_offered: profileData.expertise,
        skills_needed: profileData.interests
      }),
    });
  }

  async getProfile() {
    return this.request('/users/me', {
      method: 'GET',
    });
  }

  async searchExperts(query) {
    return this.request(`/matches/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
    });
  }

  async getMatches() {
    return this.request('/matches/', {
      method: 'GET',
    });
  }

  async createConnection(userId) {
    return this.request('/matches/connect', {
      method: 'POST',
      body: JSON.stringify({ target_user_id: userId }),
    });
  }
}

const apiService = new ApiService();
export default apiService;