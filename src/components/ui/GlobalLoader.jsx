import React from "react";
import "../../App.css";

const GlobalLoader = ({ loading }) => {
  if (!loading) return null;
  return (
    <div className="global-loader-overlay">
      <div className="global-loader-spinner">
        <div className="loader-circle" />
        <div className="loading-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </div>
        <div style={{ color: '#fff', marginTop: 8 }}>Loading...</div>
      </div>
    </div>
  );
};

export default GlobalLoader;
