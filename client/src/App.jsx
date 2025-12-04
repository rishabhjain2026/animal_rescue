import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const initialLocation = { lat: '', lng: '', address: '' };

function App() {
  const [activeTab, setActiveTab] = useState('user');
  const [location, setLocation] = useState(initialLocation);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [requests, setRequests] = useState([]);

  // Fetch browser location
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // Try to get a human-readable address using OpenStreetMap Nominatim
        let address = '';
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.address) {
              const {
                neighbourhood,
                suburb,
                city,
                town,
                village,
                state,
                country,
              } = data.address;
              // Build a clearer, shorter label like "Sector 62, Noida, Uttar Pradesh"
              const cityLike = city || town || village;
              address = [neighbourhood || suburb, cityLike, state || country]
                .filter(Boolean)
                .join(', ');
            }
            if (!address) {
              address = data.display_name || '';
            }
          }
        } catch (e) {
          // Ignore reverse geocoding errors; we'll still keep lat/lng
        }

        setLocation({
          lat,
          lng,
          address,
        });
        setLoadingLocation(false);
      },
      () => {
        setLoadingLocation(false);
      }
    );
  }, []);

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    if (!location.lat || !location.lng) {
      alert('Location not available. Please allow location access.');
      return;
    }
    formData.append('lat', location.lat);
    formData.append('lng', location.lng);
    formData.append('address', location.address);

    try {
      const res = await fetch(`${API_BASE}/api/requests`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to submit request');
      form.reset();
      alert('Rescue request submitted! Rescuers will be notified.');
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    }
  };

  const handleRescuerRegister = async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(e.target).entries());
    try {
      const res = await fetch(`${API_BASE}/api/rescuers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to register rescuer');
      }
      e.target.reset();
      alert('You are registered as a rescuer!');
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const loadRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/requests`);
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAccept = async (id) => {
    const rescuerId = prompt('Enter your Rescuer ID (for demo you can copy from backend DB):');
    if (!rescuerId) return;
    try {
      const res = await fetch(`${API_BASE}/api/requests/${id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rescuerId }),
      });
      if (!res.ok) throw new Error('Failed to accept request');
      await loadRequests();
    } catch (err) {
      console.error(err);
      alert('Error accepting request');
    }
  };

  const handleMarkRescued = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/requests/${id}/rescued`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to mark as rescued');
      await loadRequests();
    } catch (err) {
      console.error(err);
      alert('Error marking as rescued');
    }
  };

  useEffect(() => {
    if (activeTab === 'rescuer') {
      loadRequests();
    }
  }, [activeTab]);

  return (
    <div className="app">
      <header className="hero">
        <h1>Animal Rescue Network</h1>
        <p>Connect caring people with local rescuers to save animals faster.</p>
        <div className="tabs">
          <button
            className={activeTab === 'user' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('user')}
          >
            I found an animal
          </button>
          <button
            className={activeTab === 'rescuer' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('rescuer')}
          >
            I am a rescuer
          </button>
          <button
            className={activeTab === 'contact' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('contact')}
          >
            Contact support
          </button>
        </div>
      </header>

      <main className="content">
        {activeTab === 'user' ? (
          <section className="card">
            <h2>Report an animal in need</h2>
            <p className="subtitle">
              Share a few details. We will notify all registered rescuers near you.
            </p>
            <form className="form" onSubmit={handleUserSubmit}>
              <div className="field">
                <label>Type of animal</label>
                <input name="petType" placeholder="Dog, Cat, Bird, etc." required />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea
                  name="description"
                  placeholder="Injuries, behavior, surroundings..."
                  rows="3"
                  required
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Your phone number</label>
                  <input name="userPhone" type="tel" placeholder="+91..." required />
                </div>
                <div className="field">
                  <label>Your email (for updates)</label>
                  <input name="userEmail" type="email" placeholder="you@example.com" />
                </div>
              </div>
              <div className="field">
                <label>Photo of the animal (optional)</label>
                <input name="image" type="file" accept="image/*" />
              </div>
              <div className="field">
                <label>Location</label>
                <div className="location-row">
                  {loadingLocation ? (
                    <span>Detecting your location...</span>
                  ) : location.lat && location.lng ? (
                    <span>
                      {location.address
                        ? location.address
                        : `Lat: ${location.lat.toFixed?.(4) || location.lat}, Lng: ${
                            location.lng.toFixed?.(4) || location.lng
                          }`}
                    </span>
                  ) : (
                    <span className="warning">
                      Location not available. Please allow location access in your browser.
                    </span>
                  )}
                </div>
              </div>
              <button type="submit" className="primary-btn">
                Send rescue request
              </button>
            </form>
          </section>
        ) : activeTab === 'rescuer' ? (
          <section className="rescuer-layout">
            <div className="card">
              <h2>Join as a rescuer</h2>
              <p className="subtitle">
                Register once to start receiving email alerts when someone nearby needs help.
              </p>
              <form className="form" onSubmit={handleRescuerRegister}>
                <div className="field">
                  <label>Full name</label>
                  <input name="name" placeholder="Your name" required />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Phone number</label>
                    <input name="phone" placeholder="+91..." required />
                  </div>
                  <div className="field">
                    <label>NGO (optional)</label>
                    <input name="ngoName" placeholder="NGO you are associated with" />
                  </div>
                </div>
                <div className="field">
                  <label>Email for alerts</label>
                  <input name="email" type="email" placeholder="you@ngo.org" required />
                </div>
                <button type="submit" className="primary-btn">
                  Register as rescuer
                </button>
              </form>
            </div>

            <div className="card">
              <div className="card-header-row">
                <h2>Open rescue requests</h2>
                <button className="ghost-btn" onClick={loadRequests}>
                  Refresh
                </button>
              </div>
              {requests.length === 0 ? (
                <p className="subtitle">No rescue requests yet.</p>
              ) : (
                <div className="request-list">
                  {requests.map((r) => (
                    <article key={r._id} className={`request ${r.status}`}>
                      <div className="request-main">
                        <h3>{r.petType}</h3>
                        <p>{r.description}</p>
                        <p className="meta">
                          <span>Status: {r.status}</span>
                          {r.createdAt && (
                            <span>
                              Reported:{' '}
                              {new Date(r.createdAt).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          )}
                        </p>
                        <p className="meta">
                          <span>Phone: {r.userPhone}</span>
                          {r.location && (
                            <>
                              <span>
                                Location:{' '}
                                {r.location.address ||
                                  `${r.location.lat?.toFixed?.(4)}, ${r.location.lng?.toFixed?.(
                                    4
                                  )}`}
                              </span>
                              {r.location.lat && r.location.lng && (
                                <a
                                  href={`https://www.google.com/maps?q=${r.location.lat},${r.location.lng}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open in Google Maps
                                </a>
                              )}
                            </>
                          )}
                        </p>
                      </div>
                      {r.imageUrl && (
                        <img
                          className="request-image"
                          src={`${API_BASE}${r.imageUrl}`}
                          alt={r.petType}
                        />
                      )}
                      <div className="actions">
                        {r.status === 'pending' && (
                          <button className="primary-btn small" onClick={() => handleAccept(r._id)}>
                            Accept rescue
                          </button>
                        )}
                        {r.status === 'accepted' && (
                          <button
                            className="secondary-btn small"
                            onClick={() => handleMarkRescued(r._id)}
                          >
                            Mark as rescued
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="card">
            <h2>Contact our support team</h2>
            <p className="subtitle">
              Reach out to any of the coordinators below for emergency help, partnerships, or
              general questions.
            </p>
            <div className="support-grid">
              <div className="support-card">
                
                <h3>Rishabh jain</h3>
                <p className="support-role">Rescue Operations Lead</p>
                <p className="support-line">
                  Phone: <a href="tel:+911234567890">+91 8982697532</a>
                </p>
                <p className="support-line">
                  Email: <a href="mailto:rishabh26bc050@satiengg.in">rishabh26bc050@satiengg.in</a>
                </p>
              </div>
              <div className="support-card">
                <h3>prince gata</h3>
                <p className="support-role">Volunteer Coordinator</p>
                <p className="support-line">
                  Phone: <a href="tel:+919876543210">+91 98765 43210</a>
                </p>
                <p className="support-line">
                  Email: <a href="mailto:arjun@animalrescue.org">arjun@animalrescue.org</a>
                </p>
              </div>
              <div className="support-card">
                <h3>Ashmita Bathre</h3>
                <p className="support-role">Medical Support</p>
                <p className="support-line">
                  Phone: <a href="tel:+911112223334">+91 11122 23334</a>
                </p>
                <p className="support-line">
                  Email: <a href="mailto:neha@animalrescue.org">neha@animalrescue.org</a>
                </p>
              </div>
              <div className="support-card">
                <h3>Alka poddar</h3>
                <p className="support-role">Partner NGOs & Support</p>
                <p className="support-line">
                  Phone: <a href="tel:+919900112233">+91 99001 12233</a>
                </p>
                <p className="support-line">
                  Email: <a href="mailto:rahul@animalrescue.org">rahul@animalrescue.org</a>
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <span>Built with ❤️ to help animals in need.</span>
      </footer>
    </div>
  );
}

export default App;


