## Animal Rescue MERN Project

An end-to-end MERN application to coordinate animal rescue between citizens and registered rescuers/NGOs.

### Features

- **Report animal in need (User)**
  - Type of pet, description, automatic device location, phone number, optional email and photo.
  - Request stored in MongoDB with status defaulting to **pending**.
  - Animal image is saved on the server and its path stored in the database.
- **Rescuer registration**
  - Rescuer registers with name, phone number, NGO name, and email.
  - Email is used to send rescue alerts.
- **Notifications & flow**
  - When a user submits a rescue request, **all active rescuers receive an email**.
  - A rescuer can accept a request; user gets an email that the request is accepted.
  - When the animal is rescued, the status is set to **rescued** and the user receives a success email.
  - Rescuers can see a list of all rescue requests in a simple dashboard.

### Tech stack

- **Backend**: Node.js, Express, MongoDB (Mongoose), Multer (image upload), Nodemailer (emails), CORS
- **Frontend**: React (Vite), Fetch API, HTML5 Geolocation

---

### 1. Backend setup

1. Go to the backend folder:

   ```bash
   cd server
   ```

2. Install dependencies (already done if you ran `npm install` before):

   ```bash
   npm install
   ```

3. Create a `.env` file inside `server` based on these keys:

   ```env
   MONGO_URI=mongodb://localhost:27017/animal_rescue
   PORT=5000
   CLIENT_ORIGIN=http://localhost:5173

   EMAIL_HOST=smtp.yourprovider.com
   EMAIL_PORT=587
   EMAIL_USER=your_smtp_user
   EMAIL_PASS=your_smtp_password
   EMAIL_FROM=alerts@animalrescue.local
   ```

4. Run the backend in development mode:

   ```bash
   npm run dev
   ```

   The API will run on `http://localhost:5000`.

---

### 2. Frontend setup

1. Open a second terminal and go to the client folder:

   ```bash
   cd client
   ```

2. Install frontend dependencies:

   ```bash
   npm install
   ```

3. (Optional) create a `.env` file in `client` if you want to change the API base:

   ```env
   VITE_API_BASE=http://localhost:5000
   ```

4. Run the React app:

   ```bash
   npm run dev
   ```

   Open the URL that Vite prints (usually `http://localhost:5173`).

---

### 3. Main flows to test

- **As a user**
  - Open the app and stay on the **“I found an animal”** tab.
  - Allow location access in your browser (lat/lng will appear in the UI).
  - Fill in pet type, description, phone, optional email, and optional photo.
  - Submit: a `POST /api/requests` call is made; rescuers are emailed.

- **As a rescuer**
  - Switch to **“I am a rescuer”** tab.
  - Register with your details; your email will receive future requests.
  - Use the **Open rescue requests** panel to list all requests.
  - Click **Accept rescue** to accept (for demo, you’ll be asked for the `rescuerId` which you can get from MongoDB).
  - Click **Mark as rescued** once the animal is safe.

Emails use your SMTP configuration. During local development, you can use services like Mailtrap or any SMTP test server.


