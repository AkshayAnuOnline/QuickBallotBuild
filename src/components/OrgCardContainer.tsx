import React from 'react';

interface OrgCardContainerProps {
  children: React.ReactNode;
}

const OrgCardContainer: React.FC<OrgCardContainerProps> = ({ children }) => {
  return <div className="organizations-card card">{children}</div>;
};

export default OrgCardContainer; 