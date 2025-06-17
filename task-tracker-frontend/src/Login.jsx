import React, { useEffect, useState } from 'react';

// Base URL for your Flask API
const API_BASE_URL = 'http://127.0.0.1:5000';

function Login() {
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    // This script loads the Google API client library
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleSignIn;
    document.body.appendChild(script);

    return () => {
      // Clean up the script when the component unmounts
      document.body.removeChild(script);
    };
  }, []);

  const initializeGoogleSignIn = () => {
    // Ensure google.accounts.id is available
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.initialize({
        client_id: "761911316534-mqtuup6nsmqmmrnv4aqdmnos9d9r9q9t.apps.googleusercontent.com", // REPLACE WITH YOUR ACTUAL GOOGLE CLIENT ID
        callback: handleGoogleCredentialResponse,
        auto_select: false, // Prevents automatic sign-in on page load
      });

      // Render the Google Sign-In button
      window.google.accounts.id.renderButton(
        document.getElementById("google-signin-button"),
        { theme: "outline", size: "large", text: "signin_with", shape: "pill", width: "300" } // Custom button styles
      );

      // Optional: If you want to show the one-tap prompt
      // window.google.accounts.id.prompt();
    } else {
      console.error("Google accounts ID library not loaded.");
      setLoginError("Failed to load Google Sign-In. Please try again later.");
    }
  };

  const handleGoogleCredentialResponse = async (response) => {
    // This function is called when the user successfully signs in with Google
    console.log("Google ID Token:", response.credential);
    setLoginError(''); // Clear previous errors

    try {
      // Send the Google ID token to your Flask backend for verification
      const backendResponse = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: response.credential }),
      });

      const data = await backendResponse.json();

      if (!backendResponse.ok) {
        // Handle errors from the backend (e.g., invalid token, user not found)
        throw new Error(data.error || 'Authentication failed on backend.');
      }

      // Store the JWT received from your backend
      localStorage.setItem('app_token', data.token);
      localStorage.setItem('user_profile', JSON.stringify(data.user)); // Store user profile too

      console.log("Application Token:", data.token);
      console.log("User Profile:", data.user);

      // Redirect to the main application page
      window.location.href = '/';

    } catch (error) {
      console.error('Login error:', error.message);
      setLoginError(`Login failed: ${error.message}. Please try again.`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-sans antialiased">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md text-center">
        <h2 className="text-3xl font-extrabold text-blue-900 mb-6">Welcome to Task Tracker</h2>
        <p className="text-gray-700 mb-8">Sign in to manage your projects and tasks.</p>

        {loginError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6 shadow-sm">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{loginError}</span>
          </div>
        )}

        <div className="flex justify-center">
          {/* This div is where the Google Sign-In button will be rendered */}
          <div id="google-signin-button"></div>
        </div>

        <p className="mt-8 text-gray-500 text-sm">
          Powered by Google Sign-In for a seamless experience.
        </p>
      </div>
    </div>
  );
}

export default Login;
