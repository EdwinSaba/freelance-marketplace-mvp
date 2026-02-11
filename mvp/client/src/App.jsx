import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API = "http://localhost:5000";

function App() {
  const [jobs, setJobs] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [role, setRole] = useState('Freelancer'); 
  const [newJob, setNewJob] = useState({ title: '', description: '', budget: '' });
  const [activeProposals, setActiveProposals] = useState({});
  const [activeLoading, setActiveLoading] = useState({});
  const [submittingJobId, setSubmittingJobId] = useState(null);

  const fetchData = async () => {
    try {
      const jobRes = await axios.get(`${API}/jobs`);
      const profRes = await axios.get(`${API}/profiles`);
      setJobs(jobRes.data);
      setProfiles(profRes.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handlePostJob = async (e) => {
    e.preventDefault();
    await axios.post(`${API}/jobs`, { ...newJob, createdBy: role });
    setNewJob({ title: '', description: '', budget: '' });
    fetchData();
  };

  const handleApply = async (jobId) => {
    // Prevent duplicate submissions
    if (submittingJobId === jobId) return;
    
    setSubmittingJobId(jobId);
    try {
      console.log('Submitting proposal for job', jobId);
      const res = await axios.post(`${API}/proposals`, { jobId, freelancerName: "Expert Dev", coverLetter: "I'm the best fit!" });
      console.log('Proposal POST response', res.data);
      // refresh server data so proposals are immediately available to clients
      fetchData();
      // clear the proposals cache so next fetch gets fresh data
      setActiveProposals(prev => {
        const copy = { ...prev };
        delete copy[jobId];
        return copy;
      });
      alert("Application Sent!");
    } catch (err) {
      console.error('Failed to submit proposal', err);
      alert('Failed to send application. Check console.');
    } finally {
      setSubmittingJobId(null);
    }
  };

  const showProposals = async (jobId) => {
    // 1. If we click the one already open, close it
    if (activeProposals[jobId]) {
      setActiveProposals({}); // Clear everything
      return;
    }

    // 2. Clear previous proposals immediately so the old ones don't hang around
    setActiveProposals({}); 
    
    setActiveLoading(prev => ({ ...prev, [jobId]: true }));
    try {
      const res = await axios.get(`${API}/proposals/${jobId}`);
      // 3. Set ONLY this jobId in the state
      setActiveProposals({ [jobId]: res.data }); 
    } catch (err) {
      console.error('Failed to load proposals', err);
    } finally {
      setActiveLoading(prev => ({ ...prev, [jobId]: false }));
    }


    setActiveLoading(prev => ({ ...prev, [jobId]: true }));
    try {
      console.log('showProposals: fetching for jobId=', jobId);
      const res = await axios.get(`${API}/proposals/${jobId}`);
      console.log('showProposals: response', res.data);
      setActiveProposals(prev => ({ ...prev, [jobId]: res.data }));
    } catch (err) {
      console.error('Failed to load proposals', err);
      alert('Could not load proposals. Check the server console.');
      setActiveProposals(prev => ({ ...prev, [jobId]: [] }));
    } finally {
      setActiveLoading(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const acceptProposal = async (jobId) => {
    await axios.patch(`${API}/jobs/${jobId}`, { status: "In Progress" });
    setActiveProposals(prev => ({ ...prev, [jobId]: [] })); // Clear proposals after accepting
    fetchData();
  };

  const handleDeleteProposal = async (proposalId, job) => {
    // If client and job already accepted, ask for confirmation before rejecting
    if (role === 'Client' && job?.status === 'In Progress') {
      const ok = window.confirm('This proposal is already accepted. Are you sure you want to reject it?');
      if (!ok) return;
    }
    await deleteItem('proposals', proposalId);
    setActiveProposals(prev => ({ ...prev, [job.id]: [] })); // Clear proposals after rejecting
  };

  const deleteItem = async (type, id) => {
    await axios.delete(`${API}/${type}/${id}`);
    fetchData();
  };

  return (
    <div className="App">
      <header className="header-area">
        <h1>Freelance Hub <span className="mvp-tag">MVP</span></h1>
      </header>
      
      <div className="nav-pills">
        <button className={role === 'Client' ? 'active' : ''} onClick={() => setRole('Client')}>Client</button>
        <button className={role === 'Freelancer' ? 'active' : ''} onClick={() => setRole('Freelancer')}>Freelancer</button>
        <button className={role === 'Admin' ? 'active' : ''} onClick={() => setRole('Admin')}>Admin</button>
      </div>

      <div className="profiles-bar">
        <span style={{color: '#8b949e', fontWeight: 'bold'}}>User Profiles:</span>
        {profiles.map(p => (
          <div key={p.id} className="profile-tag">👤 {p.name} ({p.role}) • {p.rating} ⭐</div>
        ))}
      </div>

      <div className="main-layout">
        <aside>
          {role === 'Client' ? (
            <div className="form-card">
              <h3>Post a New Job</h3>
              <form onSubmit={handlePostJob}>
                <input placeholder="Project Title" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} required />
                <input placeholder="Budget ($)" type="number" value={newJob.budget} onChange={e => setNewJob({...newJob, budget: e.target.value})} required />
                <textarea placeholder="Job Description" value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} required />
                <button type="submit" className="btn btn-primary">Publish Listing</button>
              </form>
            </div>
          ) : (
            <div className="form-card">
              <h3>{role} View</h3>
              <p style={{color: '#8b949e'}}>{role === 'Admin' ? "Manage all listings and site health." : "Browse and apply for the best projects."}</p>
            </div>
          )}
        </aside>

        <main className="job-grid">
  {jobs.map(job => (
    <div key={job.id} className="card">
      <div className="card-header">
        <h3>{job.title}</h3>
        <span className="status-badge">{job.status}</span>
      </div>
      <p style={{flexGrow: 1}}>{job.description}</p>
      <p><strong>Budget:</strong> ${job.budget}</p>

      {/* --- THIS IS THE SECTION TO UPDATE --- */}
      <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
        {role === 'Freelancer' && job.status === 'Open' && (
  <>
    {/* CHECK: Does this job already have a proposal from "Expert Dev"? */}
    {activeProposals[job.id]?.some(p => p.freelancerName === "Expert Dev") ? (
      <button className="btn btn-outline" disabled style={{ opacity: 0.6 }}>
        Application Pending...
      </button>
    ) : (
      <button 
        disabled={submittingJobId !== null} 
        onClick={() => handleApply(job.id)} 
        className="btn btn-primary"
      >
        {submittingJobId === job.id ? 'Submitting...' : 'Apply Now'}
      </button>
    )}
  </>
)}
        
        {role === 'Client' && (
          <>
            <button onClick={() => showProposals(job.id)} className="btn btn-outline">Proposals</button>
            {job.createdBy === 'Client' && 
              <button onClick={() => deleteItem('jobs', job.id)} className="btn btn-danger">Delete</button>
            }
          </>
        )}

        {role === 'Admin' && (
          <>
            {job.status === 'In Progress' && (
              <button onClick={() => {
                axios.patch(`${API}/jobs/${job.id}`, { status: "Open" });
                fetchData();
              }} className="btn btn-danger">Cancel Job</button>
            )}
            <button onClick={() => deleteItem('jobs', job.id)} className="btn btn-danger">Delete</button>
          </>
        )}
      </div>
              {activeProposals[job.id] && role === 'Client' && (
                activeLoading[job.id] ? (
                  <div className="proposal-item">Loading proposals...</div>
                ) : (
                  activeProposals[job.id].length === 0 ? (
                    <div className="proposal-item">No proposals yet.</div>
                  ) : (
                    activeProposals[job.id].map(p => (
                      <div key={p.id} className="proposal-item">
                        <span>{p.freelancerName}</span>
                        <div>
                          <button onClick={() => acceptProposal(job.id)} className="btn btn-success">Accept</button>
                          <button onClick={() => handleDeleteProposal(p.id, job)} className="btn btn-danger">Reject</button>
                        </div>
                      </div>
                    ))
                  )
                )
              )}
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}

export default App;