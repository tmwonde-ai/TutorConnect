import React, { useEffect, useState } from "react";
import axios from "axios";

const AdminDashboard = () => {
  const [pendingTutors, setPendingTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({}); // track per-tutor action
  const token = localStorage.getItem("token"); // assuming you store JWT in localStorage

  useEffect(() => {
    fetchPendingTutors();
  }, []);

  const fetchPendingTutors = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/pending-tutors", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setPendingTutors(res.data.tutors || []);
    } catch (error) {
      console.error("Error fetching pending tutors:", error);
      alert("Failed to fetch pending tutors");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      await axios.post(`/api/admin/verify-tutor/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingTutors((prev) => prev.filter(t => t.user.id !== userId));
      alert("Tutor verified successfully");
    } catch (error) {
      console.error("Error verifying tutor:", error);
      alert("Failed to verify tutor");
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleReject = async (userId) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      await axios.post(`/api/admin/reject-tutor/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingTutors((prev) => prev.filter(t => t.user.id !== userId));
      alert("Tutor rejected");
    } catch (error) {
      console.error("Error rejecting tutor:", error);
      alert("Failed to reject tutor");
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  if (loading) return <div>Loading pending tutors...</div>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Admin Dashboard</h2>
      {pendingTutors.length === 0 ? (
        <p>No pending tutors for verification.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Subjects</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingTutors.map((tutor) => (
              <tr key={tutor.user.id} style={trStyle}>
                <td style={tdStyle}>{tutor.user.full_name}</td>
                <td style={tdStyle}>{tutor.user.email}</td>
                <td style={tdStyle}>{(tutor.subjects || []).join(", ")}</td>
                <td style={tdStyle}>
                  <button
                    disabled={actionLoading[tutor.user.id]}
                    onClick={() => handleVerify(tutor.user.id)}
                    style={verifyBtnStyle}
                  >
                    Verify
                  </button>
                  <button
                    disabled={actionLoading[tutor.user.id]}
                    onClick={() => handleReject(tutor.user.id)}
                    style={rejectBtnStyle}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Simple inline styles
const thStyle = { borderBottom: "1px solid #ccc", padding: "10px", textAlign: "left" };
const tdStyle = { borderBottom: "1px solid #eee", padding: "10px" };
const trStyle = { background: "#fafafa" };
const verifyBtnStyle = { marginRight: "10px", padding: "6px 12px", background: "green", color: "#fff", border: "none", cursor: "pointer" };
const rejectBtnStyle = { padding: "6px 12px", background: "red", color: "#fff", border: "none", cursor: "pointer" };

export default AdminDashboard;