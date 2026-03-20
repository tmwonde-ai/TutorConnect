import React from "react";

const DashboardCard = ({ title, value, color }) => (
  <div style={{
    backgroundColor: color || "#f0f0f0",
    padding: "1rem",
    borderRadius: "8px",
    flex: 1,
    margin: "0.5rem"
  }}>
    <h4>{title}</h4>
    <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{value}</p>
  </div>
);

export default DashboardCard;