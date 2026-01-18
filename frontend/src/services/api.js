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

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse JSON:', jsonError);
        throw new Error('Invalid response format from server');
      }

      if (!response.ok) {
        console.error('API Error Response:', data);
        throw new Error(data.detail || data.message || 'Request failed');
      }

      console.log('API Success:', data);
      return data;
    } catch (error) {
      console.error('Request failed with error:', error);
      if (error instanceof TypeError) {
        throw new Error('Failed to connect to server. Make sure backend is running on http://localhost:8000');
      }
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
    // Helper to convert strings to SkillItems if needed
    const convertToSkillItems = (skills) => {
      if (!skills || skills.length === 0) return [];
      if (typeof skills[0] === 'object') return skills; // Already objects
      return skills.map(skill => ({
        name: skill,
        description: '',
        category: '',
        proficiency_level: 'beginner',
        tags: []
      }));
    };

    const updateData = {};

    // Handle full_name / displayName
    if (profileData.full_name !== undefined) updateData.full_name = profileData.full_name;
    else if (profileData.displayName !== undefined) updateData.full_name = profileData.displayName;

    // Handle bio
    if (profileData.bio !== undefined) updateData.bio = profileData.bio;

    // Handle location
    if (profileData.location !== undefined) updateData.location = profileData.location;

    // Handle avatar_url / profile_photo
    if (profileData.avatar_url !== undefined) updateData.avatar_url = profileData.avatar_url;
    else if (profileData.profile_photo !== undefined) updateData.avatar_url = profileData.profile_photo;

    // Handle skills
    // Support both 'expertise' (strings) and 'skills_offered' (objects or strings)
    const skillsOffered = profileData.skills_offered || profileData.expertise;
    if (skillsOffered) {
      updateData.skills_offered = convertToSkillItems(skillsOffered);
    }

    const skillsNeeded = profileData.skills_needed || profileData.interests;
    if (skillsNeeded) {
      updateData.skills_needed = convertToSkillItems(skillsNeeded);
    }

    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(updateData),
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
    return this.request(`/matches/connect?matched_user_id=${userId}`, {
      method: 'POST',
    });
  }

  // Chat methods
  async sendChatMessage(message) {
    return this.request('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async getChatHistory() {
    return this.request('/chat/history', {
      method: 'GET',
    });
  }

  async clearChatHistory() {
    return this.request('/chat/history', {
      method: 'DELETE',
    });
  }

  // Message/Request methods
  async sendMessageRequest(toUserId, matchId, initialMessage) {
    return this.request(
      `/messages/request?to_user_id=${encodeURIComponent(toUserId)}&match_id=${encodeURIComponent(matchId)}&initial_message=${encodeURIComponent(initialMessage)}`,
      {
        method: 'POST',
      }
    );
  }

  async getIncomingRequests() {
    return this.request('/messages/requests/incoming', {
      method: 'GET',
    });
  }

  async acceptMessageRequest(requestId) {
    return this.request(`/messages/requests/${requestId}/accept`, {
      method: 'PUT',
    });
  }

  async sendMessage(toUserId, content) {
    return this.request('/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        to_user_id: toUserId,
        content: content,
      }),
    });
  }

  async getConversation(otherUserId) {
    return this.request(`/messages/conversation/${otherUserId}`, {
      method: 'GET',
    });
  }

  async rejectMessageRequest(requestId) {
    return this.request(`/messages/requests/${requestId}/reject`, {
      method: 'PUT',
    });
  }

  async logout() {
    localStorage.removeItem('auth_token');
    return { message: 'Logged out successfully' };
  }

  async getUserById(userId) {
    return this.request(`/users/${userId}`, {
      method: 'GET',
    });
  }

  async getConversations() {
    return this.request('/messages/conversations', {
      method: 'GET',
    });
  }

  async getAllMatches(limit = 50) {
    return this.request(`/matches/?limit=${limit}`, {
      method: 'GET',
    });
  }
}

const apiService = new ApiService();
export default apiService;