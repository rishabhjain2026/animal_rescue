import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const initialLocation = { lat: "", lng: "", address: "" };
const STATIC_RESCUER_ID = "12345";

const supportTeam = [
  {
    name: "Rishabh Jain",
    role: "worker at a NGO",
    phone: "+91 89826 97532",
    email: "rishabh26bc050@satiengg.in",
    image:
      "https://media.licdn.com/dms/image/v2/D4D03AQETDJnY5ObmUg/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1718235490266?e=2147483647&v=beta&t=RHXa9Zvyo1TdfmR7Q32OZUZjJ69lp2tzrxvy-RZ01qI",
  },
  {
    name: "Prince Gaate",
    role: "Volunteer Coordinator",
    phone: "+91 98765 43210",
    email: "prince26bc046@satiengg.in",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmMDGg7R6MmM2jaF1p9m-xg8Qw7-KxQHVlQQ&s",
  },
  {
    name: "Ashmita Bathre",
    role: "Medical Support",
    phone: "+91 11122 23334",
    email: "ashmita26bc015@satiengg.in",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmMDGg7R6MmM2jaF1p9m-xg8Qw7-KxQHVlQQ&s",
  },
  {
    name: "Alka Poddar",
    role: "Partner NGOs & Support",
    phone: "+91 99001 12233",
    email: "alka26bc010@satiengg.in",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmMDGg7R6MmM2jaF1p9m-xg8Qw7-KxQHVlQQ&s",
  },
];

const governmentHelp = [
  {
    title: "Animal Emergency Helpline",
    value: "1962",
    details: "Use for urgent rescue assistance in many regions.",
  },
  {
    title: "PFA Emergency",
    value: "+91 98201 22602",
    details: "People For Animals rescue helpline (region dependent).",
  },
  {
    title: "AWBI (Animal Welfare Board of India)",
    value: "https://awbi.in",
    details: "Government-backed guidelines, welfare schemes, and contacts.",
  },
  {
    title: "Municipal Veterinary Services",
    value: "Local municipal office",
    details: "Call your city municipal helpline for ambulance support.",
  },
];

const rescuedAnimals = [
  { name: "Street Puppy - Bruno", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmMDGg7R6MmM2jaF1p9m-xg8Qw7-KxQHVlQQ&s" },
  { name: "Injured Cat - Luna", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmMDGg7R6MmM2jaF1p9m-xg8Qw7-KxQHVlQQ&s" },
  { name: "Rescued Bird - Coco", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmMDGg7R6MmM2jaF1p9m-xg8Qw7-KxQHVlQQ&s" },
];

const isValidPhone = (phone) => /^\+?\d{10,15}$/.test(phone.replace(/[^\d+]/g, ""));

function App() {
  const [activeTab, setActiveTab] = useState("landing");
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
        let address = "";
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
                .join(", ");
            }
            if (!address) {
              address = data.display_name || "";
            }
          }
        } catch (e) {
        
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
    const userPhone = String(formData.get("userPhone") || "");
    if (!isValidPhone(userPhone)) {
      alert("Please enter a valid phone number with 10-15 digits.");
      return;
    }
    if (!location.lat || !location.lng) {
      alert("Location not available. Please allow location access.");
      return;
    }
    formData.append("lat", location.lat);
    formData.append("lng", location.lng);
    formData.append("address", location.address);

    try {
      const res = await fetch(`${API_BASE}/api/requests`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to submit request");
      form.reset();
      alert("Rescue request submitted! Rescuers will be notified.");
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    }
  };

  const handleRescuerRegister = async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(e.target).entries());
    try {
      const res = await fetch(`${API_BASE}/api/rescuers/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to register rescuer");
      }
      e.target.reset();
      alert("You are registered as a rescuer!");
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
    const rescuerId = prompt("Enter rescuer ID", STATIC_RESCUER_ID);
    if (!rescuerId) return;
    try {
      const res = await fetch(`${API_BASE}/api/requests/${id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rescuerId }),
      });
      if (!res.ok) throw new Error("Failed to accept request");
      await loadRequests();
    } catch (err) {
      console.error(err);
      alert("Error accepting request");
    }
  };

  const handleMarkRescued = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/requests/${id}/rescued`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to mark as rescued");
      await loadRequests();
    } catch (err) {
      console.error(err);
      alert("Error marking as rescued");
    }
  };

  const handlePayRescuer = async (id) => {
    try {
      const currentUrl = window.location.origin + window.location.pathname;
      const successUrl = `${currentUrl}?tipSuccess=1&requestId=${id}`;
      const cancelUrl = `${currentUrl}?tipCanceled=1`;
      const res = await fetch(`${API_BASE}/api/requests/${id}/tip-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ successUrl, cancelUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to create payment session");
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Payment could not be started.");
    }
  };

  const verifyTipStatus = async (requestId) => {
    try {
      const res = await fetch(`${API_BASE}/api/requests/${requestId}/tip-status`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not verify payment");
      await loadRequests();
      if (data.status === "paid") {
        alert("Thank you! Your Rs 500 tip has been paid successfully.");
      } else {
        alert("Payment is still processing. Please refresh after a few seconds.");
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to verify payment.");
    }
  };

  useEffect(() => {
    if (activeTab === "rescuer") {
      loadRequests();
    }
  }, [activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tipSuccess = params.get("tipSuccess");
    const requestId = params.get("requestId");
    const tipCanceled = params.get("tipCanceled");
    if (tipSuccess === "1" && requestId) {
      verifyTipStatus(requestId);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (tipCanceled === "1") {
      alert("Tip payment was canceled.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const navItems = [
    { key: "landing", label: "Landing" },
    { key: "user", label: "Report Rescue" },
    { key: "rescuer", label: "Rescuer Dashboard" },
    { key: "contact", label: "Support" },
  ];

  const inputClass =
    "w-full rounded-xl border border-cyan-100 bg-white/95 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200";
  const primaryBtn =
    "rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-300/40 transition hover:-translate-y-0.5";
  const subtleBtn =
    "rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100";

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-emerald-50 text-slate-800">
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-lg font-bold text-slate-900">Animal Rescue Network</p>
            <p className="text-xs text-slate-500">Help faster. Rescue smarter.</p>
          </div>
          <nav className="flex flex-wrap gap-2 rounded-full border border-cyan-100 bg-white/80 p-1 shadow-sm">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  activeTab === item.key
                    ? "bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-md"
                    : "text-slate-600 hover:bg-cyan-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        {activeTab === "landing" && (
          <section className="space-y-8">
            <div className="grid gap-6 rounded-3xl bg-white/90 p-8 shadow-xl shadow-cyan-100/60 md:grid-cols-2">
              <div className="space-y-5">
                <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Save lives with one click
                </p>
                <h1 className="text-4xl font-extrabold leading-tight text-slate-900">
                  Caring for every paw, wing, and tail.
                </h1>
                <p className="text-slate-600">
                  Report injured animals instantly, connect with nearby rescuers, and
                  track rescue progress in real time.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button className={primaryBtn} onClick={() => setActiveTab("user")}>
                    Report an animal
                  </button>
                  <button
                    className="rounded-full border border-cyan-300 px-6 py-2.5 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
                    onClick={() => setActiveTab("rescuer")}
                  >
                    Join rescuers
                  </button>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 p-6 text-white">
                <div className="animate-float absolute right-4 top-4 text-6xl">🐾</div>
                <div className="animate-pulse-soft absolute bottom-4 left-4 text-5xl">🕊️</div>
                <p className="text-sm font-semibold uppercase tracking-widest text-white/80">
                  Rescue Impact
                </p>
                <div className="mt-8 space-y-3">
                  <p className="text-4xl font-extrabold">24/7</p>
                  <p className="text-white/90">Emergency coordination support available</p>
                  <div className="rounded-xl bg-white/20 p-3 text-sm backdrop-blur-sm">
                    Every report automatically includes geolocation and optional photos.
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {rescuedAnimals.map((animal) => (
                <article
                  key={animal.name}
                  className="overflow-hidden rounded-2xl border border-cyan-100 bg-white shadow-md transition hover:-translate-y-1"
                >
                  <img src={animal.image} alt={animal.name} className="h-44 w-full object-cover" />
                  <div className="p-4">
                    <p className="font-semibold text-slate-800">{animal.name}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900">Emergency help numbers</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {governmentHelp.map((item) => (
                  <div key={item.title} className="rounded-xl bg-emerald-50 p-4">
                    <p className="font-semibold text-emerald-900">{item.title}</p>
                    <p className="text-sm text-emerald-700">{item.value}</p>
                    <p className="mt-1 text-xs text-emerald-700/80">{item.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === "user" && (
          <section className="rounded-3xl bg-white p-6 shadow-xl shadow-cyan-100/60">
            <h2 className="text-2xl font-bold text-slate-900">Report an animal in need</h2>
            <p className="mt-1 text-sm text-slate-500">
              Fill in details and we will notify nearby rescuers quickly.
            </p>
            <form className="mt-6 space-y-4" onSubmit={handleUserSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Type of animal</label>
                <input className={inputClass} name="petType" placeholder="Dog, Cat, Bird..." required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  className={inputClass}
                  name="description"
                  placeholder="Injuries, behavior, surroundings..."
                  rows="3"
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Your phone number</label>
                  <input className={inputClass} name="userPhone" type="tel" placeholder="+91..." required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Your email (optional)</label>
                  <input className={inputClass} name="userEmail" type="email" placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Photo of the animal (optional)
                </label>
                <input className={inputClass} name="image" type="file" accept="image/*" />
              </div>
              <div className="rounded-xl bg-cyan-50 p-3 text-sm text-cyan-700">
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
                  <span className="text-amber-600">
                    Location not available. Please allow location access in browser.
                  </span>
                )}
              </div>
              <button type="submit" className={primaryBtn}>
                Send rescue request
              </button>
            </form>
          </section>
        )}

        {activeTab === "rescuer" && (
          <section className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            <div className="rounded-3xl bg-white p-6 shadow-xl shadow-cyan-100/60">
              <h2 className="text-2xl font-bold text-slate-900">Join as a rescuer</h2>
              <p className="mt-1 text-sm text-slate-500">
                Register once to get rescue alerts in your area.
              </p>
              <form className="mt-6 space-y-4" onSubmit={handleRescuerRegister}>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
                  <input className={inputClass} name="name" placeholder="Your name" required />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Phone number</label>
                    <input className={inputClass} name="phone" placeholder="+91..." required />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">NGO (optional)</label>
                    <input className={inputClass} name="ngoName" placeholder="Associated NGO" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email for alerts</label>
                  <input className={inputClass} name="email" type="email" placeholder="you@ngo.org" required />
                </div>
                <button type="submit" className={primaryBtn}>
                  Register as rescuer
                </button>
              </form>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-xl shadow-cyan-100/60">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Open rescue requests</h2>
                <button
                  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  onClick={loadRequests}
                >
                  Refresh
                </button>
              </div>
              {requests.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No rescue requests yet.</p>
              ) : (
                <div className="mt-4 max-h-[34rem] space-y-3 overflow-auto pr-1">
                  {requests.map((r) => (
                    <article
                      key={r._id}
                      className={`rounded-2xl border p-4 transition ${
                        r.status === "rescued"
                          ? "border-emerald-200 bg-emerald-50"
                          : r.status === "accepted"
                          ? "border-cyan-200 bg-cyan-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="grid gap-4 md:grid-cols-[1fr_120px]">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">{r.petType}</h3>
                          <p className="text-sm text-slate-700">{r.description}</p>
                          <p className="mt-2 text-xs text-slate-500">Status: {r.status}</p>
                          <p className="mt-1 text-xs text-slate-500">Phone: {r.userPhone}</p>
                          {r.rescuerCode && (
                            <p className="mt-1 text-xs text-slate-500">Rescuer ID: {r.rescuerCode}</p>
                          )}
                          {r.location && (
                            <p className="mt-1 text-xs text-slate-500">
                              Location:{" "}
                              {r.location.address ||
                                `${r.location.lat?.toFixed?.(4)}, ${r.location.lng?.toFixed?.(4)}`}
                            </p>
                          )}
                          {r.equipmentSuggestion && (
                            <p className="mt-1 text-xs font-medium text-emerald-700">
                              Suggested equipment: {r.equipmentSuggestion}
                            </p>
                          )}
                          {r.diseasePrediction && (
                            <p className="mt-1 text-xs font-medium text-emerald-700">
                              ML disease estimate: {r.diseasePrediction}
                            </p>
                          )}
                        </div>
                        {r.imageUrl && (
                          <img
                            className="h-[110px] w-[110px] rounded-xl object-cover"
                            src={`${API_BASE}${r.imageUrl}`}
                            alt={r.petType}
                          />
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        {r.status === "pending" && (
                          <button className={primaryBtn} onClick={() => handleAccept(r._id)}>
                            Accept rescue
                          </button>
                        )}
                        {r.status === "accepted" && (
                          <>
                            <button className={subtleBtn} onClick={() => handleMarkRescued(r._id)}>
                              Mark as rescued
                            </button>
                            {r.location?.lat && r.location?.lng && (
                              <a
                                className={subtleBtn}
                                href={`https://www.google.com/maps/dir/?api=1&destination=${r.location.lat},${r.location.lng}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Track route
                              </a>
                            )}
                          </>
                        )}
                        {r.status === "rescued" &&
                          (r.tipPaymentStatus === "paid" ? (
                            <span className="rounded-full border border-emerald-400 bg-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-700">
                              Rs 500 tip paid
                            </span>
                          ) : (
                            <button className={subtleBtn} onClick={() => handlePayRescuer(r._id)}>
                              Pay rescuer Rs 500
                            </button>
                          ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "contact" && (
          <section className="rounded-3xl bg-white p-6 shadow-xl shadow-cyan-100/60">
            <h2 className="text-2xl font-bold text-slate-900">Contact our support team</h2>
            <p className="mt-1 text-sm text-slate-500">
              Reach out for rescue coordination, partnerships, and emergency support.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {supportTeam.map((member) => (
                <article
                  className="group rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4 transition hover:-translate-y-1 hover:shadow-md"
                  key={member.email}
                >
                  <img
                    src={member.image}
                    alt={member.name}
                    className="h-40 w-full rounded-xl object-cover"
                  />
                  <h3 className="mt-3 font-bold text-slate-900">{member.name}</h3>
                  <p className="text-sm text-slate-600">{member.role}</p>
                  <p className="mt-2 text-sm text-slate-700">
                    <a className="text-cyan-700 hover:underline" href={`tel:${member.phone.replace(/\s/g, "")}`}>
                      {member.phone}
                    </a>
                  </p>
                  <p className="text-sm">
                    <a className="text-cyan-700 hover:underline" href={`mailto:${member.email}`}>
                      {member.email}
                    </a>
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="py-6 text-center text-sm text-slate-500">
        Built with care to protect animals in need.
      </footer>
    </div>
  );
}

export default App;
