import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useNavigate, Outlet } from 'react-router-dom';
import Login from './Login'; 

// Import the new page components
import ProjectsPage from './components/ProjectsPage';
import TasksPage from './components/TasksPage';
import UsersPage from './components/UsersPage';
import RolesPage from './components/RolesPage';

// Base URL for your Flask API
const API_BASE_URL = 'http://127.0.0.1:5000';

/**
 * This component contains the core application logic and state.
 * It's used within the router context to access hooks like useNavigate.
 */
function AppContent() {
  const navigate = useNavigate();

  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Global state for the application's data
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [roles, setRoles] = useState([]);
  
  const [globalMessage, setGlobalMessage] = useState('');
  const [globalError, setGlobalError] = useState('');
  
  // Memoize fetch functions to prevent re-renders in child components
  const fetchProjects = useCallback(() => fetchData('/projects/', setProjects), []);
  const fetchTasks = useCallback(() => fetchData('/tasks/', setTasks), []);
  const fetchUsers = useCallback(() => fetchData('/users/', setUsers), []);
  const fetchRoles = useCallback(() => fetchData('/roles/', setRoles), []);

  // --- Authentication Check on Component Mount ---
  useEffect(() => {
    const token = localStorage.getItem('app_token');
    const storedUser = localStorage.getItem('user_profile');

    if (token && storedUser) {
      setIsLoggedIn(true);
      setUserProfile(JSON.parse(storedUser));
      // Fetch initial data since user is logged in
      fetchProjects();
      fetchUsers();
      fetchTasks();
      fetchRoles();
    } else {
      setIsLoggedIn(false);
    }
    setLoadingAuth(false);
  }, [fetchProjects, fetchUsers, fetchTasks, fetchRoles]);

  // --- Utility to get Authorization Headers ---
  const getAuthHeaders = () => {
    const token = localStorage.getItem('app_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // --- Logout Function ---
  const handleLogout = () => {
    localStorage.removeItem('app_token');
    localStorage.removeItem('user_profile');
    setIsLoggedIn(false);
    setUserProfile(null);
    setProjects([]);
    setTasks([]);
    setUsers([]);
    setRoles([]);
    navigate('/login');
  };

  // --- Main API Functions ---
  async function fetchData(endpoint, setter) {
    setGlobalError('');
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: getAuthHeaders(),
      });
      if (response.status === 401) {
        handleLogout();
        return;
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setter(data);
    } catch (err) {
      setGlobalError(`Failed to fetch data: ${err.message}.`);
      console.error(`Error fetching ${endpoint.substring(1)}:`, err);
    }
  };

  const clearMessages = (setMsg, setErr) => {
    setTimeout(() => {
      if(setMsg) setMsg('');
      if(setErr) setErr('');
    }, 5000);
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
  
  const createConfirmationPrompt = (message) => {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-lg"><p class="mb-4">${message}</p><div class="flex justify-end space-x-2"><button id="confirmBtn" class="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600">Yes</button><button id="cancelBtn" class="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400">Cancel</button></div></div>`;
      document.body.appendChild(modal);
      document.getElementById('confirmBtn').onclick = () => { document.body.removeChild(modal); resolve(true); };
      document.getElementById('cancelBtn').onclick = () => { document.body.removeChild(modal); resolve(false); };
    });
  };

  const handleDelete = async (endpoint, id, message, fetcher) => {
      if (await createConfirmationPrompt('Are you sure you want to delete this item?')) {
          await deleteItem(endpoint, id, message, fetcher);
          if (endpoint === '/projects'){
            fetchTasks(); // Also refresh tasks if a project is deleted
          }
      }
  };

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
      <h1 className="text-4xl font-extrabold text-center text-blue-900 mb-8 rounded-xl p-6 bg-white shadow-xl tracking-wide">🚀 Task Tracker Dashboard</h1>
      {userProfile && (
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-lg mb-8">
          <div className="flex items-center space-x-3">
            {userProfile.picture && <img src={userProfile.picture} alt="User" className="w-10 h-10 rounded-full border-2 border-blue-400" />}
            <div>
              <p className="font-semibold text-gray-800">{userProfile.name || userProfile.email}</p>
              <p className="text-sm text-gray-600">Role: {userProfile.roleName}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-200 shadow-md">Logout</button>
        </div>
      )}
      <nav className="mb-8 p-4 bg-white rounded-xl shadow-lg flex flex-wrap justify-center space-x-2 md:space-x-4">
        {['projects', 'tasks', 'users', 'roles'].map((page) => (
          <NavLink
            key={page}
            to={`/${page}`}
            className={({ isActive }) => `capitalize min-w-[120px] py-2 px-4 rounded-lg font-bold text-lg transition duration-300 transform hover:scale-105 ${isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
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
      <Route path="/login" element={isLoggedIn ? <Navigate to="/projects" /> : <Login />} />
      <Route path="/" element={isLoggedIn ? <DashboardLayout /> : <Navigate to="/login" />}>
        <Route 
          path="projects" 
          element={<ProjectsPage 
            projects={projects} 
            tasks={tasks} 
            users={users} // Pass users for dropdown
            userProfile={userProfile} 
            handleUpdate={updateItem} 
            handleDelete={handleDelete} 
            handleCreate={createItem} 
            handleMarkTaskComplete={handleMarkTaskComplete} 
            fetchProjects={fetchProjects} 
            fetchTasks={fetchTasks} />} 
        />
        <Route 
          path="tasks" 
          element={<TasksPage 
            tasks={tasks}
            projects={projects} // Pass projects for dropdown
            users={users} // Pass users for dropdown
            userProfile={userProfile} 
            handleUpdate={updateItem} 
            handleDelete={handleDelete} 
            handleCreate={createItem} 
            handleMarkTaskComplete={handleMarkTaskComplete} 
            fetchTasks={fetchTasks} />}
        />
        <Route 
          path="users" 
          element={<UsersPage users={users} roles={roles} userProfile={userProfile} handleUpdate={updateItem} handleDelete={handleDelete} handleCreate={createItem} fetchUsers={fetchUsers} />}
        />
        <Route 
          path="roles" 
          element={<RolesPage roles={roles} userProfile={userProfile} handleUpdate={updateItem} handleDelete={handleDelete} handleCreate={createItem} fetchRoles={fetchRoles} />}
        />
        <Route index element={<Navigate to="/projects" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
