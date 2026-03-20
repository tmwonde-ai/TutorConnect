import React, { useEffect, useState } from "react";
import { fetchReports } from "../api/adminApi";
import Loader from "./Loader";

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports().then(data => {
      setReports(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <Loader />;

  return (
    <div>
      <h1>Reports</h1>
      <table>
        <thead>
          <tr>
            <th>Reported User</th><th>Reason</th><th>Status</th><th>Date</th>
          </tr>
        </thead>
        <tbody>
          {reports.map(r => (
            <tr key={r.id}>
              <td>{r.reported_user}</td>
              <td>{r.reason}</td>
              <td>{r.status}</td>
              <td>{new Date(r.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Reports;