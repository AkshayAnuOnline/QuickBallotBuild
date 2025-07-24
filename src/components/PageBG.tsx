import React from 'react';

interface PageBGProps {
  children: React.ReactNode;
}

const PageBG: React.FC<PageBGProps> = ({ children }) => {
  return <div className="home-page">{children}</div>;
};

export default PageBG; 