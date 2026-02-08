"use client";
import { Box, Typography, Paper, Grid, Button, Avatar, Tabs, Tab, Alert, MenuItem, CircularProgress } from "@mui/material";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useState, useEffect } from 'react';
import apiClient from '@/services/apiClient';

export default function UserProfilePage() {
  const [tab, setTab] = useState(0);
  const handleTab = (_, v) => setTab(v);

  const [docType, setDocType] = useState('-- Select --');
  const [selectedFile, setSelectedFile] = useState(null);
  const [documents, setDocuments] = useState([]);

  const [user, setUser] = useState({
    name: '',
    role: { name: '' },
    email: '',
    mobile_number: '',
    address: '',
    brith_date: '',
    blood_group: ''
  });

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    setSelectedFile(f || null);
  };

  const handleUpload = () => {
    if (!docType || docType === '-- Select --') return alert('Please select a document type');
    if (!selectedFile) return alert('Please choose a file to upload');

    // client-side placeholder: append to local documents array
    const newDoc = {
      type: docType,
      uploadBy: user.name,
      uploadOn: new Date().toLocaleString(),
      fileName: selectedFile.name,
    };
    setDocuments((d) => [newDoc, ...d]);
    // reset inputs
    setDocType('-- Select --');
    setSelectedFile(null);
    // clear native file input (by resetting value via DOM) - small hack
    const fileInput = document.getElementById('user-doc-file-input');
    if (fileInput) fileInput.value = null;
  };

  // fetch profile data from backend
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiClient.get('/user-master/profile');
        const result = res?.data?.result || {};
        if (!mounted) return;
        if (result.user) {
          // profile API already returns role details via lookup; just use it
          setUser(result.user);
        }

        // Do not consume tokens array for activities (not needed). If backend returns documents use them.
        if (Array.isArray(result.documents)) {
          setDocuments(result.documents);
        }
      } catch (err) {
        // non-blocking: log and continue with defaults
        console.error('Could not fetch profile', err?.response?.data || err.message || err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // avatar initial (safe): prefer first letter of name, fallback to email or empty
  const avatarLetter = (user?.name && String(user.name).trim().length > 0)
    ? String(user.name).trim().charAt(0).toUpperCase()
    : (user?.email && String(user.email).trim().length > 0 ? String(user.email).trim().charAt(0).toUpperCase() : '');



  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ p: 2, width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">User Profile</Typography>
          {/* <Typography variant="body2" color="text.secondary">Home / User List / User Profile</Typography> */}
        </Box>

        <Grid container spacing={3} sx={{ width: '100%', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
          <Grid size={{ xs: 12, md: 4 }} sx={{ flex: '0 0 380px', maxWidth: 380 }}>
            <Paper sx={{ p: 0, borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}>
              <Box sx={{ borderTop: '4px solid #2580ff', p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#fff' }}>
                <Avatar sx={{ width: 110, height: 110, mb: 1, bgcolor: '#f3f3f3', color: '#555', border: '4px solid #fff' }}>{avatarLetter}</Avatar>
                <Typography variant="h6" sx={{ mt: 1, textTransform: 'lowercase' }}>{user.name}</Typography>
                <Typography variant="body2" color="text.secondary">{user.role.name}</Typography>
              </Box>

              <Box sx={{ p: 3, backgroundColor: '#fff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Username</Typography>
                  <Typography variant="body2" sx={{ color: '#2580ff' }}>{user.email}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Mobile Number</Typography>
                  <Typography variant="body2">{user.mobile_number}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography variant="body2" sx={{ color: '#2580ff' }}>{user.email}</Typography>
                </Box>

                <Button variant="contained" startIcon={<WhatsAppIcon />} sx={{ backgroundColor: '#28a745', width: '100%', '&:hover': { backgroundColor: '#218838' } }}>Whatsapp</Button>
              </Box>
            </Paper>

            <Paper sx={{ mt: 2, borderRadius: 2, boxShadow: 2 }}>
              <Box sx={{ backgroundColor: '#007bff', color: '#fff', p: 2, pl: 3 }}>About Me</Box>
              <Box sx={{ p: 3, backgroundColor: '#fff' }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2"><span style={{ marginRight: 8 }}>📍</span>Address</Typography>
                  <Typography variant="body2">{user.address}</Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">🕯️ Date of Birth</Typography>
                  <Typography variant="body2">{user?.brith_date ? new Date(user.brith_date).toLocaleDateString() : '-'}</Typography>
                </Box>

                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">💧 Blood Group</Typography>
                  <Typography variant="body2">{user.blood_group}</Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }} sx={{ flex: 1, minWidth: 520 }}>
            <Paper sx={{ p: 0, borderRadius: 2, boxShadow: 2 }}>
              <Box sx={{ borderBottom: 1, borderColor: '#e6eefc' }}>
                <Tabs value={tab} onChange={handleTab} sx={{ px: 2 }}>
                  {/* <Tab label={<Box sx={{ px: 2, py: 0.5 }}>Activity</Box>} /> */}
                  <Tab label={<Box sx={{ px: 2, py: 0.5 }}>Change Password</Box>} />
                  <Tab label={<Box sx={{ px: 2, py: 0.5 }}>Documents</Box>} />
                  <Tab label={<Box sx={{ px: 2, py: 0.5 }}>Two-Factor Auth</Box>} />
                </Tabs>
              </Box>

              <Box sx={{ p: 3 }}>
                {/* {tab === 0 && (
                  <>
                    <Paper sx={{ p: 2, mb: 2, borderLeft: '4px solid #28a745', background: '#fff' }}>
                      <Typography sx={{ fontSize: 16 }}><strong>Login Time:</strong> 10-Nov-2025 21:29</Typography>
                    </Paper>

                    <Paper sx={{ p: 3, mb: 2, background: '#fff' }}>
                      <Typography variant="subtitle1" sx={{ mb: 2 }}>Activities</Typography>

                      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                        <Input label="From Date" size="small" name="from_date" defaultValue="10-11-2025" />
                        <Input label="To Date" size="small" name="to_date" defaultValue="10-11-2025" />
                        <Button variant="contained">Search</Button>
                      </Box>

                      <Box sx={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f7f7f7' }}>
                              <th style={{ padding: 12, textAlign: 'left' }}>Time</th>
                              <th style={{ padding: 12, textAlign: 'left' }}>URL</th>
                              <th style={{ padding: 12, textAlign: 'left' }}>Action</th>
                              <th style={{ padding: 12, textAlign: 'left' }}>IP Address</th>
                              <th style={{ padding: 12, textAlign: 'left' }}>Browser</th>
                              <th style={{ padding: 12, textAlign: 'left' }}>Location</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activities.map((a, i) => (
                              <tr key={i} style={{ borderTop: '1px solid #eee', background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                                <td style={{ padding: 12 }}>{a.time}</td>
                                <td style={{ padding: 12 }}>{a.url}</td>
                                <td style={{ padding: 12 }}>{a.action}</td>
                                <td style={{ padding: 12 }}>{a.ip}</td>
                                <td style={{ padding: 12 }}>{a.browser}</td>
                                <td style={{ padding: 12, textAlign: 'center' }}><LocationOnIcon color="primary" /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                        <Button variant="outlined">Previous</Button>
                        <Button variant="contained">1</Button>
                        <Button variant="outlined">Next</Button>
                      </Box>
                    </Paper>
                  </>
                )} */}

                {tab === 0 && (
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Change Password</Typography>
                    <ChangePasswordForm />
                  </Paper>
                )}

                {tab === 1 && (
                  <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ flex: '1 1 320px', display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Select
                          name="doc_type"
                          label="Document Type"
                          size="small"
                          value={docType}
                          onChange={(e) => setDocType(e.target.value)}
                          sx={{ minWidth: 240 }}
                        >
                          <MenuItem value="-- Select --">-- Select --</MenuItem>
                          <MenuItem value="Aadhar Card">Aadhar Card</MenuItem>
                          <MenuItem value="Cancelled Cheque">Cancelled Cheque</MenuItem>
                          <MenuItem value="Driving Licence">Driving Licence</MenuItem>
                          <MenuItem value="PAN Card">PAN Card</MenuItem>
                          <MenuItem value="Passport Size Photo">Passport Size Photo</MenuItem>
                          <MenuItem value="Other">Other</MenuItem>
                        </Select>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <input id="user-doc-file-input" type="file" onChange={handleFileChange} style={{ display: 'inline-block' }} />
                        </Box>
                      </Box>

                      <Box sx={{ flex: '0 0 auto', ml: 'auto' }}>
                        <Button variant="contained" color="success" onClick={handleUpload} sx={{ px: 3 }}>
                          <Box component="span" sx={{ mr: 1 }}>💾</Box> Upload
                        </Button>
                      </Box>
                    </Box>

                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ backgroundColor: '#ffc107', p: 1.5, borderRadius: 1 }}>
                        <Typography sx={{ fontWeight: 600 }}>User Document Files</Typography>
                      </Box>

                      <Paper sx={{ mt: 1, overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                              <th style={{ padding: 12, textAlign: 'left' }}>Type</th>
                              <th style={{ padding: 12, textAlign: 'left' }}>Upload By</th>
                              <th style={{ padding: 12, textAlign: 'left' }}>Upload On</th>
                            </tr>
                          </thead>
                          <tbody>
                            {documents.length === 0 ? (
                              <tr>
                                <td colSpan={3} style={{ padding: 18 }}>
                                  <Typography variant="body2" color="text.secondary">No documents uploaded.</Typography>
                                </td>
                              </tr>
                            ) : (
                              documents.map((d, i) => (
                                <tr key={i} style={{ borderTop: '1px solid #eee', background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                                  <td style={{ padding: 12 }}>{d.type} <div style={{ fontSize: 12, color: '#666' }}>{d.fileName}</div></td>
                                  <td style={{ padding: 12 }}>{d.uploadBy}</td>
                                  <td style={{ padding: 12 }}>{d.uploadOn}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </Paper>
                    </Box>
                  </Paper>
                )}

                {tab === 2 && (
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Two-Factor Authentication
                    </Typography>
                    <TwoFactorAuth user={user} />
                  </Paper>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </>

  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password must match');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setSuccess('Password changed successfully. You will be logged out.');
      // clear the requirePasswordChange flag so global profile fetch won't be blocked after logout
      try { localStorage.removeItem('requirePasswordChange'); } catch (e) { /* ignore in non-browser env */ }
      // logout and redirect to login after short delay
      setTimeout(async () => {
        try { await apiClient.get('/auth/logout'); } catch (e) { /* ignore */ }
        window.location.href = '/auth/login';
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Input
        label="Current Password"
        type="password"
        fullWidth
        name="currentPassword"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="Current Password"
      />

      <Input
        label="New Password"
        type="password"
        fullWidth
        name="newPassword"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New Password"
      />

      <Input
        label="Confirm Password"
        type="password"
        fullWidth
        name="confirmPassword"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm Password"
      />

      <Box>
        <Button type="submit" variant="contained" color="error" disabled={loading} sx={{ px: 4 }}>
          {loading ? 'Changing...' : 'Change'}
        </Button>
      </Box>
    </Box>
  );

}

function TwoFactorAuth({ user }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (user) {
      setEnabled(!!user.two_factor_enabled);
    }
  }, [user]);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.post("/auth/2fa/generate");
      setQrCode(res.data.result.qrCodeUrl);
      setSecret(res.data.result.secret);
    } catch (err) {
      setError("Could not generate QR code");
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    setLoading(true);
    setError("");
    try {
      await apiClient.post("/auth/2fa/enable", { code });
      setSuccess("2FA Enabled Successfully");
      setEnabled(true);
      setQrCode("");
      setSecret("");
      setCode("");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid Code");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm("Are you sure you want to disable 2FA?")) return;
    setLoading(true);
    setError("");
    try {
      await apiClient.post("/auth/2fa/disable");
      setSuccess("2FA Disabled Successfully");
      setEnabled(false);
    } catch (err) {
      setError("Could not disable 2FA");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {enabled ? (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            Two-Factor Authentication is currently <strong>ENABLED</strong>.
          </Alert>
          <Button
            variant="contained"
            color="error"
            onClick={handleDisable}
            disabled={loading}
          >
            {loading ? "Disabling..." : "Disable 2FA"}
          </Button>
        </Box>
      ) : (
        <Box>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Two-Factor Authentication is currently <strong>DISABLED</strong>.
          </Alert>

          {!qrCode ? (
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? "Generating..." : "Enable 2FA"}
            </Button>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc).
              </Typography>
              <Box sx={{ my: 2 }}>
                <img src={qrCode} alt="2FA QR Code" style={{ border: "1px solid #ddd", padding: 4 }} />
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Secret: {secret}
              </Typography>

              <Typography variant="body1" sx={{ mt: 2 }} gutterBottom>
                2. Enter the 6-digit code to verify and enable.
              </Typography>
              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <Input
                  label="Authentication Code"
                  size="small"
                  name="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputProps={{ maxLength: 6 }}
                />
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleEnable}
                  disabled={loading || code.length !== 6}
                >
                  {loading ? "Verifying..." : "Verify & Enable"}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

