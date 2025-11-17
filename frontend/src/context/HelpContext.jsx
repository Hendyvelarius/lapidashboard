import React, { createContext, useContext, useState, useMemo } from 'react';
import { getHelpContentForDashboard } from '../config/helpContent';

const HelpContext = createContext();

export const useHelp = () => {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within HelpProvider');
  }
  return context;
};

export const HelpProvider = ({ children }) => {
  const [helpMode, setHelpMode] = useState(false);
  const [currentDashboard, setCurrentDashboard] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);

  const toggleHelpMode = () => {
    setHelpMode(!helpMode);
    if (helpMode) {
      // Reset when closing help mode
      setActiveTopic(null);
    }
  };

  const selectTopic = (topicId) => {
    setActiveTopic(topicId);
  };

  const closeHelp = () => {
    setHelpMode(false);
    setActiveTopic(null);
  };

  // Check if help content is available for current dashboard
  const isHelpAvailable = useMemo(() => {
    if (!currentDashboard) return false;
    const dashboardContent = getHelpContentForDashboard(currentDashboard);
    return dashboardContent && dashboardContent.topics && Object.keys(dashboardContent.topics).length > 0;
  }, [currentDashboard]);

  const value = {
    helpMode,
    currentDashboard,
    activeTopic,
    isHelpAvailable,
    toggleHelpMode,
    setCurrentDashboard,
    selectTopic,
    closeHelp
  };

  return (
    <HelpContext.Provider value={value}>
      {children}
    </HelpContext.Provider>
  );
};
