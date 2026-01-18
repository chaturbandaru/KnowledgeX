import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import ProfileSetup from './components/ProfileSetup';
import Dashboard from './components/Dashboard';

const App = () => {
  const [currentPage, setCurrentPage] = useState('landing');
  const [userData, setUserData] = useState(null);

  return (
    <div>
      {currentPage === 'landing' && (
        <LandingPage 
          onAuthSuccess={(data) => {
            setUserData(data);
            setCurrentPage('profile');
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
        <Dashboard userData={userData} />
      )}
    </div>
  );
};

export default App;