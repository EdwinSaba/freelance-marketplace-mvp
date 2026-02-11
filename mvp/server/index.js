const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// --- MOCK DATABASE ---
let jobs = [
  { id: 1, title: "Build a React Logo", description: "I need a scalable vector graphic of the React logo.", budget: 50, status: "Open" },
  { id: 2, title: "Fix my API", description: "My Express server keeps crashing on startup.", budget: 100, status: "Open" }
];
let proposals = [];
let profiles = [
  { id: 1, name: "Solo Developer", role: "Freelancer", rating: "5.0" },
  { id: 2, name: "Tech Startup", role: "Client", rating: "4.9" }
];

// READ: Jobs & Profiles
app.get('/jobs', (req, res) => res.json(jobs));
app.get('/profiles', (req, res) => res.json(profiles));

// CREATE: Jobs & Proposals
app.post('/jobs', (req, res) => {
  const newJob = { id: Date.now(), status: "Open", createdBy: "current-user", ...req.body };
  jobs.push(newJob);
  res.status(201).json(newJob);
});

app.post('/proposals', (req, res) => {
  const newProposal = { id: Date.now(), ...req.body };
  proposals.push(newProposal);
  console.log('New proposal added:', newProposal);
  res.status(201).json(newProposal);
});

// UPDATE: Job Status
app.patch('/jobs/:id', (req, res) => {
  const job = jobs.find(j => j.id == req.params.id);
  if (job) {
    job.status = req.body.status;
    res.json(job);
  } else res.status(404).json({ message: "Job not found" });
});

// DELETE: Jobs & Proposals
app.delete('/jobs/:id', (req, res) => {
  jobs = jobs.filter(j => j.id != req.params.id);
  res.json({ message: "Job deleted" });
});

app.delete('/proposals/:id', (req, res) => {
  proposals = proposals.filter(p => p.id != req.params.id);
  res.json({ message: "Proposal removed" });
});

app.get('/proposals/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const found = proposals.filter(p => p.jobId == jobId);
  console.log(`Fetching proposals for job ${jobId}:`, found.length, 'found');
  res.json(found);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));