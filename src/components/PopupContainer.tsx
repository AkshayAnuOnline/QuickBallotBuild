import React from 'react';

interface PopupContainerProps {
  children: React.ReactNode;
}

const PopupContainer: React.FC<PopupContainerProps> = ({ children }) => {
  return (
    <div className="add-org-modal-body">
      {children}
    </div>
  );
};

export default PopupContainer; 