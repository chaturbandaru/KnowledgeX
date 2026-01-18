import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import ProfileSetup from './components/ProfileSetup';
import Dashboard from './components/Dashboard';
import ChatAssistant from './components/ChatAssistant';
import Requests from './components/Requests';

const App = () => {
  const [currentPage, setCurrentPage] = useState('landing');
  const [userData, setUserData] = useState(null);

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
        />
      )}

      {currentPage === 'chat' && (
        <ChatAssistant 
          onBack={() => setCurrentPage('dashboard')}
        />
      )}

      {currentPage === 'requests' && (
        <Requests onBack={() => setCurrentPage('dashboard')} />
      )}
    </div>
  );
};

export default App;