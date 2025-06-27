import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useNavigate, Outlet } from 'react-router-dom';
import Login from './Login'; 

// Import your page components from the 'components' directory as per your structure
import ProjectsPage from './components/ProjectsPage';
import TasksPage from './components/TasksPage';
import UsersPage from './components/UsersPage';
import RolesPage from './components/RolesPage';

// For production, this will be handled by the Nginx proxy. For local dev, you might change this.
const API_BASE_URL = 'http://127.0.0.1:5000';

/**
 * This component contains the core application logic and state.
 * It's used within the router context to access hooks like useNavigate.
 */
function AppContent() {
  const navigate = useNavigate();

  // --- State Declarations ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [roles, setRoles] = useState([]);
  const [globalMessage, setGlobalMessage] = useState('');
  const [globalError, setGlobalError] = useState('');

  // --- Data Fetching Callbacks ---
  const fetchProjects = useCallback(() => fetchData('/projects/', setProjects), []);
  const fetchTasks = useCallback(() => fetchData('/tasks/', setTasks), []);
  const fetchUsers = useCallback(() => fetchData('/users/', setUsers), []);
  const fetchRoles = useCallback(() => fetchData('/roles/', setRoles), []);

  // --- Authentication Check on Load ---
  useEffect(() => {
    const token = localStorage.getItem('app_token');
    const storedUser = localStorage.getItem('user_profile');

    if (token && storedUser) {
      setIsLoggedIn(true);
      setUserProfile(JSON.parse(storedUser));
      fetchProjects();
      fetchUsers();
      fetchTasks();
      fetchRoles();
    } else {
      setIsLoggedIn(false);
    }
    setLoadingAuth(false);
  }, [fetchProjects, fetchUsers, fetchTasks, fetchRoles]);

  // --- Utility Functions ---
  const getAuthHeaders = () => {
    const token = localStorage.getItem('app_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  const handleLogout = () => {
    localStorage.removeItem('app_token');
    localStorage.removeItem('user_profile');
    setIsLoggedIn(false);
    setUserProfile(null);
    navigate('/login');
  };
  
  const clearMessages = (setMsg, setErr) => {
    setTimeout(() => {
      if(setMsg) setMsg('');
      if(setErr) setErr('');
    }, 5000);
  };
  
  // --- REFACTORED: This function now gracefully handles 403 Forbidden errors ---
  async function fetchData(endpoint, setter) {
    // We clear the global error at the start of any fetch attempt
    setGlobalError(''); 
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: getAuthHeaders(),
      });
      
      // If the user is just not authorized (403), we don't show a big red error.
      if (response.status === 403) {
        console.warn(`Permission denied for endpoint: ${endpoint}. This is expected for some roles.`);
        // Set the data for that section to empty and stop.
        setter([]); 
        return; 
      }
      
      if (response.status === 401) {
        handleLogout();
        return;
      }
      
      // For all other client or server errors, we will show the error message.
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setter(data);
    } catch (err) {
      // This will now only catch server errors or network failures, not permission errors.
      setGlobalError(`Failed to fetch data: ${err.message}.`);
      console.error(`Error fetching ${endpoint.substring(1)}:`, err);
    }
  };

  const createItem = async (endpoint, itemData, successMsg, formSetter, initialFormState, fetcher, hideFormSetter, localSetMessage, localSetError) => {
    localSetMessage('');
    localSetError('');
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(itemData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create item');
      localSetMessage(data.message || successMsg);
      if (formSetter) formSetter(initialFormState);
      fetcher();
      if (hideFormSetter) hideFormSetter(false);
      clearMessages(localSetMessage, localSetError);
    } catch (err) {
      localSetError(`Error: ${err.message}`);
      clearMessages(localSetMessage, localSetError);
    }
  };

  const updateItem = async (endpoint, id, itemData, successMsg, fetcher, localSetMessage, localSetError) => {
    if(localSetMessage) localSetMessage('');
    if(localSetError) localSetError('');
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(itemData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update item');
      if (localSetMessage) localSetMessage(data.message || successMsg);
      else setGlobalMessage(data.message || successMsg)
      fetcher();
      clearMessages(localSetMessage || setGlobalMessage, localSetError || setGlobalError);
    } catch (err) {
      if(localSetError) localSetError(`Error: ${err.message}`);
      else setGlobalError(`Error: ${err.message}`);
      clearMessages(localSetMessage || setGlobalMessage, localSetError || setGlobalError);
    }
  };
  
  const createConfirmationPrompt = (message) => {
    return window.confirm(message);
  };

  const handleDelete = async (endpoint, id, message, fetcher) => {
      if (await createConfirmationPrompt('Are you sure you want to delete this item?')) {
          await deleteItem(endpoint, id, message, fetcher);
          if (endpoint === '/projects'){
            fetchTasks(); 
          }
      }
  };
  
  const deleteItem = async (endpoint, id, successMsg, fetcher) => {
    setGlobalMessage('');
    setGlobalError('');
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete item');
      setGlobalMessage(data.message || successMsg);
      fetcher();
      clearMessages(setGlobalMessage, setGlobalError);
    } catch (err) {
      setGlobalError(`Error: ${err.message}`);
      clearMessages(setGlobalMessage, setGlobalError);
    }
  };
  
  // --- NEW: Function to specifically handle marking a task as complete ---
  const handleMarkTaskComplete = async (task) => {
    if (await createConfirmationPrompt('Mark this task as "Completed"?')) {
      // **FIXED**: Only send the status field for this specific action.
      // This ensures the backend API validation for 'Read Only' users passes.
      await updateItem('/tasks', task.id, { status: 'completed' }, 'Task marked as completed!', fetchTasks, setGlobalMessage, setGlobalError);
    }
  };

  if (loadingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100"><h2 className="text-2xl font-bold">Loading...</h2></div>;
  }

  const DashboardLayout = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-sans antialiased">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-lg mb-8">
          <div className="flex items-center space-x-3">
            {userProfile.picture && <img src={userProfile.picture} alt="User" className="w-12 h-12 rounded-full border-2 border-blue-400" />}
            <div>
              <p className="font-bold text-lg text-gray-800">{userProfile.name || userProfile.email}</p>
              <p className="text-sm font-medium text-gray-600">Role: {userProfile.roleName}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition duration-200 shadow-md">Logout</button>
        </div>
      <nav className="mb-8 p-4 bg-white rounded-xl shadow-lg flex flex-wrap justify-center space-x-2 md:space-x-4">
        {['projects', 'tasks', 'users', 'roles'].map((page) => (
          <NavLink
            key={page}
            to={`/${page}`}
            className={({ isActive }) => `capitalize min-w-[120px] text-center py-2 px-4 rounded-lg font-bold text-lg transition duration-300 transform hover:scale-105 ${isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
          >
            {page}
          </NavLink>
        ))}
      </nav>
      {globalMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4"><strong className="font-bold">Success!</strong> {globalMessage}</div>}
      {globalError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4"><strong className="font-bold">Error!</strong> {globalError}</div>}
      <Outlet />
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={isLoggedIn ? <Navigate to="/projects" /> : <Login onLoginSuccess={() => { setIsLoggedIn(true); navigate('/'); }}/>} />
      <Route path="/" element={isLoggedIn ? <DashboardLayout /> : <Navigate to="/login" />}>
        <Route path="projects" element={<ProjectsPage projects={projects} tasks={tasks} users={users} userProfile={userProfile} handleUpdate={updateItem} handleDelete={handleDelete} handleCreate={createItem} fetchProjects={fetchProjects} fetchTasks={fetchTasks} />} />
        <Route path="tasks" element={<TasksPage tasks={tasks} projects={projects} users={users} userProfile={userProfile} handleUpdate={updateItem} handleDelete={handleDelete} handleCreate={createItem} handleMarkTaskComplete={handleMarkTaskComplete} fetchTasks={fetchTasks} />} />
        <Route path="users" element={<UsersPage users={users} roles={roles} userProfile={userProfile} handleUpdate={updateItem} handleDelete={handleDelete} handleCreate={createItem} fetchUsers={fetchUsers} />} />
        <Route path="roles" element={<RolesPage roles={roles} userProfile={userProfile} handleUpdate={updateItem} handleDelete={handleDelete} handleCreate={createItem} fetchRoles={fetchRoles} />} />
        <Route index element={<Navigate to="/projects" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

// Main App component wrapped in Router
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;