import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import ProfileSetup from './components/ProfileSetup';
import Dashboard from './components/Dashboard';
import ChatAssistant from './components/ChatAssistant';
import Requests from './components/Requests';
import ConversationsPage from './components/ConversationsPage';
import UserProfile from './components/UserProfile';

const App = () => {
  const [currentPage, setCurrentPage] = useState('landing');
  const [userData, setUserData] = useState(null);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [viewedUserId, setViewedUserId] = useState(null);

  const handleUpdateUser = (updatedUser) => {
    setUserData(prev => ({
      ...prev,
      user: updatedUser
    }));
  };

  const handleLogout = () => {
    setUserData(null);
    setCurrentPage('landing');
  };

  const navigateTo = (page, options = {}) => {
    setCurrentPage(page);
    if (options.userId) setViewedUserId(options.userId);
    if (options.chatUser) setSelectedChatUser(options.chatUser);
  };

  return (
    <div>
      {currentPage === 'landing' && (
        <LandingPage
          onAuthSuccess={(data) => {
            setUserData(data);
            // Check if user already has skills set
            const hasSkills = data.user?.skills_offered?.length > 0 || data.user?.skills_needed?.length > 0;
            const isNewUser = !data.user?.full_name;

            if (isNewUser || !hasSkills) {
              setCurrentPage('profile');
            } else {
              setCurrentPage('dashboard');
            }
          }}
        />
      )}

      {currentPage === 'profile' && (
        <ProfileSetup
          userData={userData}
          onComplete={(profileData) => {
            setUserData({ ...userData, ...profileData });
            setCurrentPage('dashboard');
          }}
        />
      )}

      {currentPage === 'dashboard' && (
        <Dashboard
          userData={userData}
          onNavigateChat={() => setCurrentPage('chat')}
          onNavigateRequests={() => setCurrentPage('requests')}
          onNavigateMessages={() => setCurrentPage('messages')}
          onUpdateUser={handleUpdateUser}
          onLogout={handleLogout}
          onViewProfile={(userId) => {
            setViewedUserId(userId);
            setCurrentPage('user-profile');
          }}
        />
      )}

      {currentPage === 'user-profile' && (
        <UserProfile
          userId={viewedUserId}
          currentUser={userData}
          onBack={() => setCurrentPage('dashboard')}
          onNavigateChat={(userId, userName) => {
            setSelectedChatUser({ userId, userName });
            setCurrentPage('messages');
          }}
        />
      )}

      {currentPage === 'chat' && (
        <ChatAssistant
          onBack={() => setCurrentPage('dashboard')}
        />
      )}

      {currentPage === 'requests' && (
        <Requests
          onBack={() => setCurrentPage('dashboard')}
          onAcceptRequest={(userId, userName) => {
            setSelectedChatUser({ userId, userName });
            setCurrentPage('messages');
          }}
        />
      )}

      {currentPage === 'messages' && (
        <ConversationsPage
          onBack={() => setCurrentPage('dashboard')}
          userData={userData}
          initialChatUser={selectedChatUser}
        />
      )}
    </div>
  );
};

export default App;
